// Sistema de Pool de Personagens com Carregamento Inteligente
class CharacterPoolManager {
    constructor() {
        this.CACHE_KEY = 'gacha.character.pool.v5';
        this.CACHE_TIMESTAMP_KEY = 'gacha.character.pool.timestamp.v4';
        this.LAST_SUMMONS_KEY = 'gacha.last.summons.v1';
        this.BACKGROUND_LOAD_KEY = 'gacha.background.loading.v1'; // Novo: controle do carregamento em background
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
        this.MAX_LAST_SUMMONS = 10;
        
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
        this.isBackgroundLoading = false; // Novo: flag para carregamento em background
        this.backgroundLoadProgress = 0; // Novo: progresso do carregamento em background
        this.lastSummons = this.loadLastSummons();
        
        // Novo: Iniciar carregamento em background automaticamente após inicialização
        this.startBackgroundLoadingIfNeeded();
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
                        media(sort: POPULARITY_DESC, perPage: 1) {
                            nodes {
                                title { romaji english }
                                popularity
                                averageScore
                            }
                        }
                    }
                }
            }
        `;

        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ 
                        query, 
                        variables: { page, perPage } 
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.errors) {
                    throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
                }

                if (!data.data || !data.data.Page) {
                    throw new Error('Invalid response structure');
                }

                return data.data.Page;

            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        console.error('❌ Todas as tentativas falharam:', lastError);
        return null;
    }

    // Determinar raridade
    determineRarity(character) {
        const popularity = character.favourites || 0;
        const rarity = window.determineRarityByPopularity(popularity);
        return rarity;
    }

    // NOVO: Carregamento inicial rápido (apenas 10 personagens)
    async buildInitialCharacterPool(onProgress) {
        console.log('🚀 Building INITIAL character pool (fast load)...');
        
        // Resetar pool
        Object.keys(this.characterPool).forEach(rarity => {
            this.characterPool[rarity] = [];
        });

        const updateProgress = (message, percent) => {
            if (onProgress) onProgress(message, percent);
        };
        
        updateProgress('Carregando personagens iniciais...', 30);

        // Carregar apenas as primeiras 2 páginas para início rápido
        const initialPages = 2;
        let totalFetched = 0;

        for (let page = 1; page <= initialPages; page++) {
            try {
                const progressPercent = 30 + (page / initialPages) * 50;
                updateProgress(`Carregando página ${page}/${initialPages}...`, progressPercent);

                const pageData = await this.fetchCharactersFromAniList(page, 50);
                
                if (!pageData || !pageData.characters) {
                    break;
                }

                for (const char of pageData.characters) {
                    if (!this.isValidCharacter(char)) continue;
                    
                    const characterData = this.createCharacterData(char);
                    this.characterPool[characterData.rarity].push(characterData);
                    totalFetched++;
                }

                console.log(`📄 Página inicial ${page}: +${pageData.characters.length} chars (Total: ${totalFetched})`);
                
                // Pequeno delay
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`❌ Erro na página inicial ${page}:`, error);
                break;
            }
        }

        updateProgress('Processando personagens iniciais...', 85);
        await this.ensureMinimumPerRarity();

        console.log(`📊 Pool inicial criado com ${totalFetched} personagens`);
        
        // Marcar que precisa de carregamento em background
        localStorage.setItem(this.BACKGROUND_LOAD_KEY, 'pending');
        
        this.saveToCache();
        this.isInitialized = true;
        updateProgress('Pronto! Carregando mais personagens em segundo plano...', 100);
    }

    // NOVO: Carregamento em background (sem bloquear UI)
    async startBackgroundLoading() {
        if (this.isBackgroundLoading) return;
        
        const backgroundStatus = localStorage.getItem(this.BACKGROUND_LOAD_KEY);
        if (backgroundStatus !== 'pending') return;

        this.isBackgroundLoading = true;
        console.log('🔄 Iniciando carregamento em background...');

        try {
            // Carregar páginas 3-50 em background
            const backgroundPages = 48; // páginas 3 até 50
            let currentPage = 3; // começar da página 3
            
            while (currentPage <= 50 && this.isBackgroundLoading) {
                try {
                    const pageData = await this.fetchCharactersFromAniList(currentPage, 50);
                    
                    if (!pageData || !pageData.characters || pageData.characters.length === 0) {
                        break;
                    }

                    let validCharactersInPage = 0;
                    for (const char of pageData.characters) {
                        // Verificar se já existe
                        const alreadyExists = Object.values(this.characterPool)
                            .flat()
                            .some(existing => existing.id === char.id);
                        
                        if (alreadyExists || !this.isValidCharacter(char)) continue;
                        
                        const characterData = this.createCharacterData(char);
                        this.characterPool[characterData.rarity].push(characterData);
                        validCharactersInPage++;
                    }

                    this.backgroundLoadProgress = ((currentPage - 2) / backgroundPages) * 100;
                    console.log(`🔄 Background página ${currentPage}: +${validCharactersInPage} chars (${this.backgroundLoadProgress.toFixed(1)}%)`);
                    
                    // Salvar a cada 5 páginas
                    if (currentPage % 5 === 0) {
                        this.saveToCache();
                    }
                    
                    currentPage++;
                    
                    // Delay maior para não impactar performance
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    console.error(`❌ Erro no background página ${currentPage}:`, error);
                    currentPage++;
                    // Delay maior em caso de erro
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Finalizar carregamento em background
            await this.ensureMinimumPerRarity();
            this.saveToCache();
            localStorage.setItem(this.BACKGROUND_LOAD_KEY, 'completed');
            
            const totalChars = Object.values(this.characterPool).reduce((sum, chars) => sum + chars.length, 0);
            console.log(`✅ Carregamento em background concluído! Total: ${totalChars} personagens`);

        } catch (error) {
            console.error('❌ Erro no carregamento em background:', error);
            localStorage.setItem(this.BACKGROUND_LOAD_KEY, 'error');
        } finally {
            this.isBackgroundLoading = false;
        }
    }

    // NOVO: Iniciar carregamento em background se necessário
    startBackgroundLoadingIfNeeded() {
        // Aguardar um pouco antes de iniciar (não bloquear inicialização)
        setTimeout(() => {
            const backgroundStatus = localStorage.getItem(this.BACKGROUND_LOAD_KEY);
            if (backgroundStatus === 'pending') {
                this.startBackgroundLoading();
            }
        }, 3000); // Aguardar 3 segundos após página carregar
    }

    // NOVO: Método para parar carregamento em background (se usuário sair da página)
    stopBackgroundLoading() {
        this.isBackgroundLoading = false;
    }

    // Helper: Validar personagem
    isValidCharacter(char) {
        return char.name?.full && 
               char.image?.large && 
               !char.image.large.includes('default') &&
               char.name.full.length >= 2 &&
               char.image.large.startsWith('http') &&
               !char.image.large.includes('placeholder');
    }

    // Helper: Criar dados do personagem
    createCharacterData(char) {
        const rarity = this.determineRarity(char);
        const animeTitle = char.media?.nodes?.[0]?.title;
        const animeName = animeTitle?.english || animeTitle?.romaji || 'Unknown';
        
        return {
            id: char.id,
            name: char.name.full,
            image: char.image.large,
            rarity: rarity,
            popularity: char.favourites || 0,
            anime: animeName,
            score: char.media?.nodes?.[0]?.averageScore || 0,
            lastSummoned: 0
        };
    }

    // Garantir mínimo de personagens por raridade
    async ensureMinimumPerRarity() {
        const minimumCounts = {
            'Special': 5,     // Reduzido para carregamento inicial
            'Mythic': 15,     
            'Legendary': 25,  
            'Epic': 40,       
            'Rare': 60,       
            'Common': 80      
        };

        for (const [rarity, minCount] of Object.entries(minimumCounts)) {
            const currentCount = this.characterPool[rarity].length;
            
            if (currentCount < minCount) {
                if (['Special', 'Mythic', 'Legendary'].includes(rarity)) {
                    await this.redistributeToHigherRarity(rarity, minCount - currentCount);
                } else {
                    await this.redistributeToLowerRarity(rarity, minCount - currentCount);
                }
            }
        }
    }

    // Redistribuir para raridade mais alta
    async redistributeToHigherRarity(targetRarity, needed) {
        const sourceRarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
        let moved = 0;

        for (const sourceRarity of sourceRarities) {
            if (moved >= needed || sourceRarity === targetRarity) continue;

            const sourceChars = this.characterPool[sourceRarity];
            if (sourceChars.length > 10) {
                const sortedChars = sourceChars.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                const toMove = Math.min(needed - moved, Math.floor(sourceChars.length * 0.1));
                
                for (let i = 0; i < toMove; i++) {
                    const char = sortedChars.shift();
                    char.poolAssignment = targetRarity;
                    this.characterPool[targetRarity].push(char);
                    moved++;
                }
                
                this.characterPool[sourceRarity] = sortedChars;
            }
        }
    }

    // Redistribuir para raridade mais baixa
    async redistributeToLowerRarity(targetRarity, needed) {
        const sourceRarities = ['Special', 'Mythic', 'Legendary', 'Epic', 'Rare'];
        let moved = 0;

        for (const sourceRarity of sourceRarities) {
            if (moved >= needed || sourceRarity === targetRarity) continue;

            const sourceChars = this.characterPool[sourceRarity];
            if (sourceChars.length > 3) {
                const sortedChars = sourceChars.sort((a, b) => (a.popularity || 0) - (b.popularity || 0));
                const toMove = Math.min(needed - moved, Math.floor(sourceChars.length * 0.2));
                
                for (let i = 0; i < toMove; i++) {
                    const char = sortedChars.shift();
                    char.poolAssignment = targetRarity;
                    this.characterPool[targetRarity].push(char);
                    moved++;
                }
                
                this.characterPool[sourceRarity] = sortedChars;
            }
        }
    }

    // Inicializar pool com carregamento inteligente
    async initialize(onProgress) {
        // Primeiro, tentar carregar do cache se válido
        if (this.isCacheValid() && this.loadFromCache()) {
            const totalChars = Object.values(this.characterPool).reduce((sum, chars) => sum + chars.length, 0);
            if (totalChars > 50) { // Reduzido de 100 para 50
                this.isInitialized = true;
                console.log('✅ Character pool initialized from cache');
                if (onProgress) onProgress('Carregado do cache!', 100);
                
                // Verificar se precisa continuar carregamento em background
                this.startBackgroundLoadingIfNeeded();
                return;
            }
        }

        console.log('🔄 Cache inválido, fazendo carregamento inicial rápido...');
        if (onProgress) onProgress('Preparando carregamento rápido...', 10);
        
        try {
            // Usar carregamento inicial rápido
            await this.buildInitialCharacterPool(onProgress);
            
            // Iniciar carregamento em background após um delay
            setTimeout(() => {
                this.startBackgroundLoading();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Erro no carregamento inicial:', error);
            
            // Fallback para cache antigo
            if (this.loadFromCache()) {
                const totalChars = Object.values(this.characterPool).reduce((sum, chars) => sum + chars.length, 0);
                if (totalChars > 0) {
                    console.log('⚠️ Usando cache antigo como fallback');
                    this.isInitialized = true;
                    if (onProgress) onProgress('Carregado do cache (modo offline)', 100);
                    return;
                }
            }
            
            throw new Error('Não foi possível carregar personagens');
        }
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
        
        if (this.lastSummons.length > this.MAX_LAST_SUMMONS) {
            this.lastSummons = this.lastSummons.slice(0, this.MAX_LAST_SUMMONS);
        }

        this.saveLastSummons();
    }

    // Sortear raridade
    rollRarity() {
        const random = Math.random();
        let cumulative = 0;

        for (const [rarity, weight] of Object.entries(this.rarityWeights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return rarity;
            }
        }

        return 'Common';
    }

    // Selecionar personagem da raridade
    selectCharacterFromRarity(rarity) {
        const availableCharacters = this.characterPool[rarity];
        
        if (!availableCharacters || availableCharacters.length === 0) {
            console.warn(`⚠️ Nenhum personagem disponível para raridade: ${rarity}`);
            return null;
        }

        const nonRecentCharacters = availableCharacters.filter(char => 
            !this.wasRecentlySummoned(char.id)
        );

        const poolToUse = nonRecentCharacters.length > 0 ? nonRecentCharacters : availableCharacters;

        const now = Date.now();
        const weightedPool = poolToUse.map(char => {
            const timeSinceLastSummon = now - (char.lastSummoned || 0);
            const daysSince = timeSinceLastSummon / (1000 * 60 * 60 * 24);
            const weight = Math.max(1, Math.floor(daysSince / 7) + 1);
            
            return { character: char, weight };
        });

        const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
        let randomWeight = Math.random() * totalWeight;

        for (const item of weightedPool) {
            randomWeight -= item.weight;
            if (randomWeight <= 0) {
                item.character.lastSummoned = now;
                return { ...item.character };
            }
        }

        return { ...poolToUse[0] };
    }

    // Realizar summon
    performSummon() {
        if (!this.isInitialized) {
            console.error('❌ Character pool not initialized');
            return null;
        }

        const rarity = this.rollRarity();
        const character = this.selectCharacterFromRarity(rarity);
        
        if (!character) {
            console.error(`❌ Nenhum personagem selecionado para raridade: ${rarity}`);
            return null;
        }

        // Recalcular raridade baseada na popularidade
        const originalRarity = character.rarity;
        character.rarity = window.determineRarityByPopularity(character.popularity || 0);
        
        character.poolRarity = rarity;
        character.summonedFrom = rarity;
        character.poolOriginalRarity = originalRarity;

        this.addToHistory(character);
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

    // Obter status do carregamento em background
    getBackgroundLoadingStatus() {
        return {
            isLoading: this.isBackgroundLoading,
            progress: this.backgroundLoadProgress,
            status: localStorage.getItem(this.BACKGROUND_LOAD_KEY)
        };
    }

    // Forçar refresh
    async forceRefresh() {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
        localStorage.removeItem(this.BACKGROUND_LOAD_KEY);
        this.isInitialized = false;
        this.stopBackgroundLoading();
        await this.buildInitialCharacterPool();
    }
}

// Instância global
window.characterPoolManager = new CharacterPoolManager();

// NOVO: Parar carregamento em background quando usuário sai da página
window.addEventListener('beforeunload', () => {
    if (window.characterPoolManager) {
        window.characterPoolManager.stopBackgroundLoading();
    }
});