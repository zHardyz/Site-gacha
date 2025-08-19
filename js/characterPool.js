// Sistema de Pool de Personagens com Cache e Controle de Raridade
class CharacterPoolManager {
    constructor() {
        this.CACHE_KEY = 'gacha.character.pool.v4'; // Atualizado para forçar novo cache e corrigir imagens
        this.CACHE_TIMESTAMP_KEY = 'gacha.character.pool.timestamp.v3';
        this.LAST_SUMMONS_KEY = 'gacha.last.summons.v1';
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
        this.MAX_LAST_SUMMONS = 10; // Manter histórico dos últimos 10 summons
        
        this.characterPool = {
            Common: [],
            Rare: [],
            Epic: [],
            Legendary: [],
            Mythic: [],
            Special: []
        };
        
        this.rarityWeights = {
            Common: 0.35,    // 35% - Comum
            Rare: 0.25,      // 25% - Raro  
            Epic: 0.20,      // 20% - Épico
            Legendary: 0.12, // 12% - Lendário
            Mythic: 0.06,    // 6% - Mítico
            Special: 0.02    // 2% - Especial
        };
        
        this.isInitialized = false;
        this.lastSummons = this.loadLastSummons();
    }

    // Verificar se o cache ainda é válido
    isCacheValid() {
        const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
        if (!timestamp) return false;
        
        const now = Date.now();
        const cacheTime = parseInt(timestamp);
        return (now - cacheTime) < this.CACHE_DURATION;
    }

    // Carregar pool do cache
    loadFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (cached) {
                this.characterPool = JSON.parse(cached);
                console.log('✅ Character pool loaded from cache');
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading cache:', error);
        }
        return false;
    }

    // Salvar pool no cache
    saveToCache() {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.characterPool));
            localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log('💾 Character pool saved to cache');
        } catch (error) {
            console.error('❌ Error saving cache:', error);
        }
    }

    // Buscar personagens da AniList
    async fetchCharactersFromAniList(page = 1, perPage = 50) {
        const query = `
            query ($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        hasNextPage
                        currentPage
                        lastPage
                    }
                    characters(sort: FAVOURITES_DESC) {
                        id
                        name { full }
                        image { large }
                        favourites
                        description(asHtml: false)
                        media(sort: POPULARITY_DESC, perPage: 1) {
                            nodes {
                                title { romaji }
                                popularity
                                averageScore
                                genres
                            }
                        }
                    }
                }
            }
        `;

        try {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query, variables: { page, perPage } })
            });

            const data = await response.json();
            return data.data.Page;
        } catch (error) {
            console.error('❌ Error fetching from AniList:', error);
            return null;
        }
    }

    // Determinar raridade usando a função global centralizada
    determineRarity(character) {
        const popularity = character.favourites || 0;
        const rarity = window.determineRarityByPopularity(popularity);
        
        // Log apenas em desenvolvimento para alguns casos
        if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && Math.random() < 0.01) {
            console.log(`🔍 determineRarity: ${character.name?.full || 'Unknown'} (${popularity} favoritos) → ${rarity}`);
        }
        
        return rarity;
    }

    // Função PURA para determinar raridade apenas pela popularidade
    determineRarityByPopularity(popularity) {
        return window.determineRarityByPopularity(popularity);
    }

    // Construir pool de personagens com múltiplas estratégias de busca
    async buildCharacterPool(onProgress) {
        console.log('🔄 Building character pool...');
        
        // Resetar pool
        Object.keys(this.characterPool).forEach(rarity => {
            this.characterPool[rarity] = [];
        });

        let totalFetched = 0;
        const maxCharacters = 4000;
        
        // Callback de progresso
        const updateProgress = (message, percent) => {
            if (onProgress) onProgress(message, percent);
        };
        
        // Estratégia 1: Buscar por popularidade (top characters)
        console.log('📥 Fetching popular characters...');
        updateProgress('Baixando personagens populares...', 40);
        totalFetched += await this.fetchCharactersBySort('FAVOURITES_DESC', 40, totalFetched, maxCharacters);
        
        // Estratégia 2: Buscar por relevância/recentes 
        console.log('📥 Fetching relevant characters...');
        updateProgress('Baixando personagens relevantes...', 60);
        totalFetched += await this.fetchCharactersBySort('RELEVANCE', 30, totalFetched, maxCharacters);
        
        // Estratégia 3: Buscar aleatórios para completar Common
        console.log('📥 Fetching random characters...');
        updateProgress('Baixando personagens aleatórios...', 80);
        totalFetched += await this.fetchCharactersBySort('ID', 30, totalFetched, maxCharacters);

        // Rebalancear para garantir mínimo por raridade
        updateProgress('Processando e organizando personagens...', 90);
        await this.ensureMinimumPerRarity();

        // Log final da distribuição
        console.log('📊 Final character distribution:');
        let total = 0;
        Object.keys(this.characterPool).forEach(rarity => {
            const count = this.characterPool[rarity].length;
            total += count;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            console.log(`  ${rarity}: ${count} characters (${percentage}%)`);
        });
        console.log(`  TOTAL: ${total} characters`);

        updateProgress('Salvando no cache...', 95);
        this.saveToCache();
        this.isInitialized = true;
        updateProgress('Carregamento concluído!', 100);
    }

    // Buscar personagens por tipo de ordenação
    async fetchCharactersBySort(sortType, maxPages, currentTotal, maxTotal) {
        let currentPage = 1;
        let fetched = 0;

        while (currentPage <= maxPages && (currentTotal + fetched) < maxTotal) {
            const pageData = await this.fetchCharactersFromAniListWithSort(currentPage, 50, sortType);
            
            if (!pageData || !pageData.characters || pageData.characters.length === 0) {
                break;
            }

            let validCharactersInPage = 0;
            for (const char of pageData.characters) {
                // Verificar se já existe no pool
                const alreadyExists = Object.values(this.characterPool)
                    .flat()
                    .some(existing => existing.id === char.id);
                
                if (alreadyExists) continue;

                // Filtros de qualidade
                if (!char.name?.full || 
                    !char.image?.large || 
                    char.image.large.includes('default') ||
                    char.name.full.length < 2 ||
                    !char.image.large.startsWith('http')) {
                    continue;
                }
                
                const rarity = this.determineRarity(char);
                const characterData = {
                    id: char.id,
                    name: char.name.full,
                    image: char.image.large,
                    rarity: rarity,
                    popularity: char.favourites || 0,
                    anime: char.media?.nodes?.[0]?.title?.romaji || 'Unknown',
                    score: char.media?.nodes?.[0]?.averageScore || 0,
                    lastSummoned: 0
                };

                this.characterPool[rarity].push(characterData);
                fetched++;
                validCharactersInPage++;
            }

            console.log(`  📄 ${sortType} Page ${currentPage}: +${validCharactersInPage} chars`);
            
            if (!pageData.pageInfo.hasNextPage) break;
            currentPage++;
            
            await new Promise(resolve => setTimeout(resolve, 100)); // Aumentado de 30ms para 100ms
        }

        // Log da distribuição após esta busca
        console.log(`📊 After ${sortType}:`);
        Object.keys(this.characterPool).forEach(rarity => {
            console.log(`  ${rarity}: ${this.characterPool[rarity].length}`);
        });

        return fetched;
    }

    // Versão modificada da busca para aceitar diferentes ordenações
    async fetchCharactersFromAniListWithSort(page = 1, perPage = 50, sort = 'FAVOURITES_DESC') {
        const query = `
            query ($page: Int, $perPage: Int, $sort: [CharacterSort]) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        hasNextPage
                        currentPage
                        lastPage
                    }
                    characters(sort: $sort) {
                        id
                        name { full }
                        image { large }
                        favourites
                        description(asHtml: false)
                        media(sort: POPULARITY_DESC, perPage: 1) {
                            nodes {
                                title { romaji }
                                popularity
                                averageScore
                                genres
                            }
                        }
                    }
                }
            }
        `;

        try {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ 
                    query, 
                    variables: { page, perPage, sort: [sort] } 
                })
            });

            const data = await response.json();
            return data.data.Page;
        } catch (error) {
            console.error('❌ Error fetching from AniList:', error);
            return null;
        }
    }

    // Garantir mínimo de personagens por raridade
    async ensureMinimumPerRarity() {
        const minimumCounts = {
            'Special': 20,    // Mínimo 20 para 2%
            'Mythic': 40,     // Mínimo 40 para 6% 
            'Legendary': 80,  // Mínimo 80 para 12%
            'Epic': 150,      // Mínimo 150 para 20%
            'Rare': 200,      // Mínimo 200 para 25%
            'Common': 300     // Mínimo 300 para 35%
        };

        console.log('🔧 Checking minimum counts per rarity...');

        for (const [rarity, minCount] of Object.entries(minimumCounts)) {
            const currentCount = this.characterPool[rarity].length;
            
            if (currentCount < minCount) {
                console.log(`⚠️ ${rarity} has ${currentCount}, need ${minCount}. Rebalancing...`);
                
                // Se raridade alta tem poucos, mover alguns de raridade baixa
                if (['Special', 'Mythic', 'Legendary'].includes(rarity)) {
                    await this.redistributeToHigherRarity(rarity, minCount - currentCount);
                } else {
                    // Se raridade baixa tem poucos, mover alguns de raridade alta
                    await this.redistributeToLowerRarity(rarity, minCount - currentCount);
                }
            }
        }
    }

    // Redistribuir personagens para raridade mais alta
    async redistributeToHigherRarity(targetRarity, needed) {
        const sourceRarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
        let moved = 0;

        for (const sourceRarity of sourceRarities) {
            if (moved >= needed) break;
            if (sourceRarity === targetRarity) continue;

            const sourceChars = this.characterPool[sourceRarity];
            if (sourceChars.length > 50) { // Manter pelo menos 50 na origem
                
                // Pegar os mais populares da fonte
                const sortedChars = sourceChars.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                const toMove = Math.min(needed - moved, Math.floor(sourceChars.length * 0.1));
                
                for (let i = 0; i < toMove; i++) {
                    const char = sortedChars.shift();
                    // NÃO alterar a raridade original baseada na popularidade!
                    // Apenas mover para o pool, mas manter raridade real
                    char.poolAssignment = targetRarity; // Para debug: onde está no pool
                    this.characterPool[targetRarity].push(char);
                    moved++;
                }
                
                // Atualizar array de origem
                this.characterPool[sourceRarity] = sortedChars;
                
                console.log(`  📈 Moved ${toMove} chars from ${sourceRarity} to ${targetRarity}`);
            }
        }
    }

    // Redistribuir personagens para raridade mais baixa
    async redistributeToLowerRarity(targetRarity, needed) {
        const sourceRarities = ['Special', 'Mythic', 'Legendary', 'Epic', 'Rare'];
        let moved = 0;

        for (const sourceRarity of sourceRarities) {
            if (moved >= needed) break;
            if (sourceRarity === targetRarity) continue;

            const sourceChars = this.characterPool[sourceRarity];
            if (sourceChars.length > 10) { // Manter pelo menos 10 na origem
                
                // Pegar os menos populares da fonte
                const sortedChars = sourceChars.sort((a, b) => (a.popularity || 0) - (b.popularity || 0));
                const toMove = Math.min(needed - moved, Math.floor(sourceChars.length * 0.2));
                
                for (let i = 0; i < toMove; i++) {
                    const char = sortedChars.shift();
                    // NÃO alterar a raridade original baseada na popularidade!
                    // Apenas mover para o pool, mas manter raridade real
                    char.poolAssignment = targetRarity; // Para debug: onde está no pool
                    this.characterPool[targetRarity].push(char);
                    moved++;
                }
                
                // Atualizar array de origem
                this.characterPool[sourceRarity] = sourceChars;
                
                console.log(`  📉 Moved ${toMove} chars from ${sourceRarity} to ${targetRarity}`);
            }
        }
    }

    // Inicializar pool (usar cache se válido)
    async initialize(onProgress) {
        if (this.isCacheValid() && this.loadFromCache()) {
            this.isInitialized = true;
            console.log('✅ Character pool initialized from cache');
            if (onProgress) onProgress('Carregado do cache!', 100);
            return;
        }

        console.log('🔄 Cache invalid or missing, building new character pool...');
        if (onProgress) onProgress('Cache expirado, baixando novos personagens...', 30);
        try {
            await this.buildCharacterPool(onProgress);
        } catch (error) {
            console.error('❌ Erro ao construir pool da API, usando personagens de fallback...', error);
            if (onProgress) onProgress('Erro na API, usando personagens de backup...', 85);
            this.createFallbackPool();
            if (onProgress) onProgress('Personagens de backup carregados!', 100);
        }
    }

    // Criar pool de fallback se a API falhar
    createFallbackPool() {
        console.log('🔧 Criando pool de fallback...');
        
        const fallbackCharacters = [
            { id: 1, name: 'Naruto Uzumaki', anime: 'Naruto', rarity: 'Legendary', popularity: 50000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-IazKGogHSHZW.png' },
            { id: 2, name: 'Monkey D. Luffy', anime: 'One Piece', rarity: 'Legendary', popularity: 45000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-chR0Ec0RcEzw.png' },
            { id: 3, name: 'Edward Elric', anime: 'Fullmetal Alchemist', rarity: 'Epic', popularity: 35000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b11-Zqvv6CzQ6nbJ.jpg' },
            { id: 4, name: 'Light Yagami', anime: 'Death Note', rarity: 'Mythic', popularity: 40000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b80-IjmKt6bMlayW.jpg' },
            { id: 5, name: 'Ichigo Kurosaki', anime: 'Bleach', rarity: 'Epic', popularity: 30000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b5-Vddc3hCzKF7s.jpg' },
            { id: 6, name: 'Goku', anime: 'Dragon Ball Z', rarity: 'Special', popularity: 60000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b246-0VBE4PdVZjkF.jpg' },
            { id: 7, name: 'Sasuke Uchiha', anime: 'Naruto', rarity: 'Epic', popularity: 35000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b13-LJDzDiybgDLH.png' },
            { id: 8, name: 'Levi Ackerman', anime: 'Attack on Titan', rarity: 'Legendary', popularity: 55000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-dUeb4ukrE0nF.jpg' },
            { id: 9, name: 'Senku Ishigami', anime: 'Dr. Stone', rarity: 'Rare', popularity: 15000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b106414-RWJGm7QNUyoJ.png' },
            { id: 10, name: 'Tanjiro Kamado', anime: 'Demon Slayer', rarity: 'Epic', popularity: 25000, image: 'https://s4.anilist.co/file/anilistcdn/character/large/b146156-lWzTaO9u4Xvr.jpg' },
        ];

        // Resetar pools
        Object.keys(this.characterPool).forEach(rarity => {
            this.characterPool[rarity] = [];
        });

        // Adicionar personagens de fallback
        fallbackCharacters.forEach(char => {
            char.lastSummoned = 0;
            this.characterPool[char.rarity].push(char);
        });

        // Adicionar alguns personagens comuns
        for (let i = 11; i <= 25; i++) {
            this.characterPool['Common'].push({
                id: i,
                name: `Personagem ${i}`,
                anime: 'Anime Genérico',
                rarity: 'Common',
                popularity: Math.floor(Math.random() * 2000) + 500,
                image: 'https://via.placeholder.com/280x400/1a1a2e/a33bff?text=Sem+Imagem',
                lastSummoned: 0
            });
        }

        // Adicionar alguns raros
        for (let i = 26; i <= 35; i++) {
            this.characterPool['Rare'].push({
                id: i,
                name: `Herói ${i}`,
                anime: 'Anime Legal',
                rarity: 'Rare',
                popularity: Math.floor(Math.random() * 5000) + 3000,
                image: 'https://via.placeholder.com/280x400/3b82f6/ffffff?text=Raro',
                lastSummoned: 0
            });
        }

        console.log('✅ Pool de fallback criado com sucesso!');
        this.saveToCache();
        this.isInitialized = true;
    }

    // Carregar histórico de summons
    loadLastSummons() {
        try {
            const stored = localStorage.getItem(this.LAST_SUMMONS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Error loading last summons:', error);
            return [];
        }
    }

    // Salvar histórico de summons
    saveLastSummons() {
        try {
            localStorage.setItem(this.LAST_SUMMONS_KEY, JSON.stringify(this.lastSummons));
        } catch (error) {
            console.error('❌ Error saving last summons:', error);
        }
    }

    // Verificar se personagem foi summoned recentemente
    wasRecentlySummoned(characterId) {
        return this.lastSummons.some(summon => summon.id === characterId);
    }

    // Adicionar summon ao histórico
    addToHistory(character) {
        const summonRecord = {
            id: character.id,
            name: character.name,
            timestamp: Date.now()
        };

        this.lastSummons.unshift(summonRecord);
        
        // Manter apenas os últimos summons
        if (this.lastSummons.length > this.MAX_LAST_SUMMONS) {
            this.lastSummons = this.lastSummons.slice(0, this.MAX_LAST_SUMMONS);
        }

        this.saveLastSummons();
    }

    // Sortear raridade baseada nas porcentagens
    rollRarity() {
        const random = Math.random();
        let cumulative = 0;

        for (const [rarity, weight] of Object.entries(this.rarityWeights)) {
            cumulative += weight;
            if (random <= cumulative) {
                // Log para verificar se as probabilidades estão sendo aplicadas
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log(`🎲 Raridade sorteada: ${rarity} (${(weight * 100).toFixed(1)}% chance) - Random: ${random.toFixed(4)}`);
                }
                return rarity;
            }
        }

        return 'Common'; // Fallback
    }

    // Selecionar personagem dentro da raridade com anti-repetição
    selectCharacterFromRarity(rarity) {
        const availableCharacters = this.characterPool[rarity];
        
        if (!availableCharacters || availableCharacters.length === 0) {
            console.warn(`⚠️ No characters available for rarity: ${rarity}`);
            return null;
        }

        // Filtrar personagens não summoned recentemente
        const nonRecentCharacters = availableCharacters.filter(char => 
            !this.wasRecentlySummoned(char.id)
        );

        // Se todos foram summoned recentemente, usar todos disponíveis
        const poolToUse = nonRecentCharacters.length > 0 ? nonRecentCharacters : availableCharacters;

        // Aplicar peso baseado em quando foi summoned pela última vez
        const now = Date.now();
        const weightedPool = poolToUse.map(char => {
            const timeSinceLastSummon = now - (char.lastSummoned || 0);
            const daysSince = timeSinceLastSummon / (1000 * 60 * 60 * 24);
            
            // Aumentar peso para personagens não summoned há mais tempo
            const weight = Math.max(1, Math.floor(daysSince / 7) + 1); // +1 peso a cada semana
            
            return { character: char, weight };
        });

        // Seleção ponderada
        const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
        let randomWeight = Math.random() * totalWeight;

        for (const item of weightedPool) {
            randomWeight -= item.weight;
            if (randomWeight <= 0) {
                // Atualizar timestamp do último summon
                item.character.lastSummoned = now;
                return { ...item.character };
            }
        }

        // Fallback
        return { ...poolToUse[0] };
    }

    // Realizar summon completo
    performSummon() {
        if (!this.isInitialized) {
            console.error('❌ Character pool not initialized');
            return null;
        }

        // 1. Sortear raridade
        const rarity = this.rollRarity();
        
        // 2. Selecionar personagem da raridade
        const character = this.selectCharacterFromRarity(rarity);
        
        if (!character) {
            console.error(`❌ No character selected for rarity: ${rarity}`);
            return null;
        }

        // 3. RECALCULAR raridade baseada na popularidade atual
        // Garantir que a raridade está sempre correta, independente do pool
        const originalRarity = character.rarity; // Salvar raridade do pool para debug
        character.rarity = this.determineRarityByPopularity(character.popularity || 0);
        
        // Para debug e histórico
        character.poolRarity = rarity; // De qual pool veio
        character.summonedFrom = rarity; // Para histórico  
        character.poolOriginalRarity = originalRarity; // Raridade que estava no pool

        // 4. Adicionar ao histórico
        this.addToHistory(character);

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`✨ Summoned: ${character.name}`);
            console.log(`  📊 Popularidade: ${character.popularity?.toLocaleString() || 'N/A'} favoritos`);
            console.log(`  🎯 Raridade Real: ${character.rarity} (baseada na popularidade)`);
            console.log(`  🎲 Pool Sorteado: ${rarity} (${(this.rarityWeights[rarity] * 100).toFixed(1)}% chance)`);
            console.log(`  📂 Pool Original: ${character.poolOriginalRarity || 'N/A'}`);
        }
        return character;
    }

    // Obter estatísticas do pool
    getPoolStats() {
        const stats = {};
        Object.keys(this.characterPool).forEach(rarity => {
            stats[rarity] = {
                count: this.characterPool[rarity].length,
                percentage: (this.rarityWeights[rarity] * 100).toFixed(1)
            };
        });
        return stats;
    }

    // Forçar refresh do cache
    async forceRefresh() {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
        await this.buildCharacterPool();
    }
}

// Instância global
window.characterPoolManager = new CharacterPoolManager();
