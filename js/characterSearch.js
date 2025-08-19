// Sistema de Busca de Personagens
class CharacterSearch {
    constructor() {
        this.ANILIST_API_URL = 'https://graphql.anilist.co';
        this.inventory = this.loadInventory();
        this.setupEventListeners();
    }

    // Carregar inventário do usuário
    loadInventory() {
        try {
            const stored = localStorage.getItem('gacha.inventory.v1');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erro ao carregar inventário:', error);
            return [];
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        const form = document.getElementById('search-form');
        const searchInput = document.getElementById('character-search');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        if (searchInput) {
            // Buscar ao pressionar Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }
    }

    // Realizar busca
    async performSearch() {
        const searchInput = document.getElementById('character-search');
        const searchButton = document.getElementById('search-button');
        const buttonText = searchButton.querySelector('.button-text');
        const loadingSpinner = searchButton.querySelector('.loading-spinner');

        const query = searchInput.value.trim();
        if (!query) return;

        // Mostrar loading
        this.setLoadingState(true, buttonText, loadingSpinner);
        searchButton.disabled = true;

        try {
            const character = await this.searchCharacter(query);
            this.displayResult(character);
        } catch (error) {
            console.error('Erro na busca:', error);
            this.displayError('Erro ao buscar personagem. Tente novamente.');
        } finally {
            // Remover loading
            this.setLoadingState(false, buttonText, loadingSpinner);
            searchButton.disabled = false;
        }
    }

    // Configurar estado de loading
    setLoadingState(isLoading, buttonText, loadingSpinner) {
        if (isLoading) {
            buttonText.textContent = 'Buscando...';
            loadingSpinner.style.display = 'inline-block';
        } else {
            buttonText.textContent = 'Buscar';
            loadingSpinner.style.display = 'none';
        }
    }

    // Buscar personagem na API do AniList
    async searchCharacter(query) {
        const graphqlQuery = `
            query ($search: String) {
                Page(page: 1, perPage: 1) {
                    characters(search: $search, sort: FAVOURITES_DESC) {
                        id
                        name {
                            full
                            native
                        }
                        image {
                            large
                        }
                        favourites
                        description(asHtml: false)
                        media(sort: POPULARITY_DESC, perPage: 1) {
                            nodes {
                                title {
                                    romaji
                                    english
                                }
                                popularity
                                averageScore
                                genres
                            }
                        }
                    }
                }
            }
        `;

        const response = await fetch(this.ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: graphqlQuery,
                variables: { search: query }
            })
        });

        if (!response.ok) {
            throw new Error('Erro na requisição para AniList');
        }

        const data = await response.json();
        const characters = data.data.Page.characters;

        if (!characters || characters.length === 0) {
            return null;
        }

        const character = characters[0];
        return {
            id: character.id,
            name: character.name.full,
            nameNative: character.name.native,
            image: character.image.large,
            popularity: character.favourites || 0,
            description: character.description,
            anime: character.media?.nodes?.[0]?.title?.romaji || 'Desconhecido',
            animeEnglish: character.media?.nodes?.[0]?.title?.english,
            animePopularity: character.media?.nodes?.[0]?.popularity || 0,
            animeScore: character.media?.nodes?.[0]?.averageScore || 0,
            genres: character.media?.nodes?.[0]?.genres || []
        };
    }

    // Verificar se o usuário possui o personagem
    checkOwnership(character) {
        return this.inventory.some(item => 
            item.name === character.name && 
            item.anime === character.anime
        );
    }

    // Exibir resultado da busca
    displayResult(character) {
        const resultContainer = document.getElementById('character-result');
        
        if (!character) {
            this.displayNotFound();
            return;
        }

        const isOwned = this.checkOwnership(character);
        const rarity = window.determineRarityByPopularity(character.popularity);
        const rarityInfo = window.getRarityInfo(rarity);

        const cardHTML = `
            <div class="character-card">
                <div class="character-content">
                    <div class="character-image-container">
                        <img 
                            src="${character.image}" 
                            alt="${character.name}" 
                            class="character-image"
                            onerror="this.src='https://via.placeholder.com/200x280/1a1b23/6366f1?text=Sem+Imagem'"
                        >
                    </div>
                    
                    <div class="character-info">
                        <h2 class="character-name">${character.name}</h2>
                        ${character.nameNative ? `<p class="character-anime">${character.nameNative}</p>` : ''}
                        <p class="character-anime">${character.anime}</p>
                        
                        <div class="character-stats">
                            <div class="stat-item">
                                <span class="stat-icon">🔥</span>
                                <span class="stat-value">${character.popularity.toLocaleString()}</span>
                            </div>
                            
                            <div class="rarity-badge rarity-${rarity}">
                                <span>${rarityInfo.emoji}</span>
                                <span>${rarityInfo.name}</span>
                            </div>
                            
                            ${character.animeScore > 0 ? `
                                <div class="stat-item">
                                    <span class="stat-icon">⭐</span>
                                    <span class="stat-value">${character.animeScore / 10}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="ownership-status ${isOwned ? 'status-owned' : 'status-not-owned'}">
                            ${isOwned ? '✅ Já possui' : '❌ Não encontrado'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        resultContainer.innerHTML = cardHTML;
        
        // Animar entrada do card
        setTimeout(() => {
            const card = resultContainer.querySelector('.character-card');
            if (card) {
                card.classList.add('show');
            }
        }, 100);
    }

    // Exibir mensagem de não encontrado
    displayNotFound() {
        const resultContainer = document.getElementById('character-result');
        
        const notFoundHTML = `
            <div class="character-card not-found">
                <div class="not-found-icon">🔍</div>
                <div class="not-found-text">Personagem não encontrado</div>
                <div class="not-found-subtext">Tente buscar por outro nome ou verifique a ortografia</div>
            </div>
        `;

        resultContainer.innerHTML = notFoundHTML;
        
        // Animar entrada
        setTimeout(() => {
            const card = resultContainer.querySelector('.character-card');
            if (card) {
                card.classList.add('show');
            }
        }, 100);
    }

    // Exibir erro
    displayError(message) {
        const resultContainer = document.getElementById('character-result');
        
        const errorHTML = `
            <div class="character-card not-found">
                <div class="not-found-icon">⚠️</div>
                <div class="not-found-text">Erro na busca</div>
                <div class="not-found-subtext">${message}</div>
            </div>
        `;

        resultContainer.innerHTML = errorHTML;
        
        // Animar entrada
        setTimeout(() => {
            const card = resultContainer.querySelector('.character-card');
            if (card) {
                card.classList.add('show');
            }
        }, 100);
    }
}

// Inicializar sistema de busca quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que as funções globais estejam disponíveis
    setTimeout(() => {
        if (typeof window.determineRarityByPopularity === 'function' && 
            typeof window.getRarityInfo === 'function') {
            new CharacterSearch();
            console.log('✅ Sistema de busca de personagens inicializado');
        } else {
            console.error('❌ Funções globais de raridade não encontradas');
        }
    }, 500);
});
