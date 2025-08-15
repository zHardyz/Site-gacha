// Sistema de Pool de Personagens com Cache e Controle de Raridade
class CharacterPoolManager {
    constructor() {
        this.CACHE_KEY = 'gacha.character.pool.v3'; // Atualizado para forçar novo cache
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
            Common: 0.35,
            Rare: 0.25,
            Epic: 0.20,
            Legendary: 0.12,
            Mythic: 0.06,
            Special: 0.02
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

    // Determinar raridade com distribuição massiva em baixas e escassa em altas
    determineRarity(character) {
        const popularity = character.favourites || 0;
        const media = character.media?.nodes?.[0];
        const score = media?.averageScore || 0;
        const mediaPopularity = media?.popularity || 0;
        
        // Sistema piramidal: quanto mais raro, menos personagens
        // Ajustar limites para garantir mínimo por raridade
        
        // Special: ~1.5% - apenas extremamente populares (120k+)
        if (popularity >= 120000) return 'Special';
        
        // Mythic: ~4% - muito populares (60k+)  
        if (popularity >= 60000) return 'Mythic';
        
        // Legendary: ~8% - populares (25k+)
        if (popularity >= 25000) return 'Legendary';
        
        // Epic: ~15% - conhecidos (10k+)
        if (popularity >= 10000) return 'Epic';
        
        // Rare: ~23% - moderadamente conhecidos (3k+)
        if (popularity >= 3000) return 'Rare';
        
        // Common: ~48% - maioria dos personagens (menos de 3k)
        return 'Common';
    }

    // Construir pool de personagens com múltiplas estratégias de busca
    async buildCharacterPool() {
        console.log('🔄 Building character pool...');
        
        // Resetar pool
        Object.keys(this.characterPool).forEach(rarity => {
            this.characterPool[rarity] = [];
        });

        let totalFetched = 0;
        const maxCharacters = 4000;
        
        // Estratégia 1: Buscar por popularidade (top characters)
        console.log('📥 Fetching popular characters...');
        totalFetched += await this.fetchCharactersBySort('FAVOURITES_DESC', 40, totalFetched, maxCharacters);
        
        // Estratégia 2: Buscar por relevância/recentes 
        console.log('📥 Fetching relevant characters...');
        totalFetched += await this.fetchCharactersBySort('RELEVANCE', 30, totalFetched, maxCharacters);
        
        // Estratégia 3: Buscar aleatórios para completar Common
        console.log('📥 Fetching random characters...');
        totalFetched += await this.fetchCharactersBySort('ID', 30, totalFetched, maxCharacters);

        // Rebalancear para garantir mínimo por raridade
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

        this.saveToCache();
        this.isInitialized = true;
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
                    char.name.full.length < 2) {
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
            
            await new Promise(resolve => setTimeout(resolve, 30));
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
                    char.rarity = targetRarity; // Atualizar raridade
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
                    char.rarity = targetRarity; // Atualizar raridade
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
    async initialize() {
        if (this.isCacheValid() && this.loadFromCache()) {
            this.isInitialized = true;
            console.log('✅ Character pool initialized from cache');
            return;
        }

        console.log('🔄 Cache invalid or missing, building new character pool...');
        await this.buildCharacterPool();
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
        console.log(`🎲 Rolled rarity: ${rarity}`);

        // 2. Selecionar personagem da raridade
        const character = this.selectCharacterFromRarity(rarity);
        
        if (!character) {
            console.error(`❌ No character selected for rarity: ${rarity}`);
            return null;
        }

        // 3. Adicionar ao histórico
        this.addToHistory(character);

        console.log(`✨ Summoned: ${character.name} (${character.rarity})`);
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
