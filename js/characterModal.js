// Sistema de Modal de Detalhes do Personagem
class CharacterModal {
    constructor() {
        this.modal = document.getElementById('character-modal');
        this.currentCharacter = null;
        this.expandedImage = null;
        this.animeCache = new Map();
        this.imageCache = new Map();
        
        this.init();
    }

    init() {
        // Event listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Prevent scroll when modal is open
        this.modal.addEventListener('transitionend', () => {
            if (this.modal.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
    }

    async openModal(character) {
        this.currentCharacter = character;
        
        // Mostrar modal
        this.modal.classList.add('active');
        
        // Preencher informações básicas
        this.populateBasicInfo(character);
        
        // Carregar informações detalhadas em paralelo
        await Promise.all([
            this.loadAnimeInfo(character),
            this.loadCharacterImages(character)
        ]);
    }

    closeModal() {
        if (this.modal.classList.contains('active')) {
            this.modal.classList.remove('active');
            this.currentCharacter = null;
            this.expandedImage = null;
            
            // Limpar galeria
            const gallery = document.getElementById('character-gallery');
            if (gallery) {
                gallery.innerHTML = `
                    <div class="gallery-loading">
                        <div class="loading-spinner"></div>
                        <p>Carregando imagens...</p>
                    </div>
                `;
            }
        }
    }

    populateBasicInfo(character) {
        // Nome e imagem principal
        document.getElementById('modal-character-name').textContent = character.name;
        document.getElementById('modal-character-image').src = character.image;
        document.getElementById('modal-character-image').alt = character.name;

        // Anime
        const animeTitle = character.anime || 'Anime Desconhecido';
        document.getElementById('modal-anime-title').textContent = animeTitle;

        // Raridade
        const rarityBadge = document.getElementById('modal-rarity-badge');
        const rarityInfo = this.getRarityInfo(character.rarity);
        rarityBadge.textContent = rarityInfo.name;
        rarityBadge.style.background = `linear-gradient(135deg, ${rarityInfo.color}, ${rarityInfo.color}99)`;
        rarityBadge.style.color = 'white';

        // Glow da raridade no avatar
        const avatarGlow = document.getElementById('modal-avatar-glow');
        avatarGlow.style.background = `linear-gradient(45deg, ${rarityInfo.color}, transparent)`;
        avatarGlow.style.boxShadow = `0 0 30px ${rarityInfo.color}`;

        // Popularidade
        const popularityElement = document.getElementById('modal-popularity');
        const popularityText = typeof character.popularity === 'number'
            ? character.popularity.toLocaleString('pt-BR')
            : 'Não disponível';
        popularityElement.querySelector('span:last-child').textContent = popularityText;

        // Botão de favorito
        this.updateFavoriteButton();

        // Descrição placeholder
        document.getElementById('modal-description').innerHTML = '<p>Carregando descrição...</p>';
        
        // Ano e score placeholder
        document.getElementById('modal-anime-year').textContent = '';
        document.getElementById('modal-anime-score').textContent = '';
    }

    getRarityInfo(rarity) {
        // Usar a função global
        if (typeof getRarityInfo === 'function') {
            return window.getRarityInfo(rarity);
        }
        
        // Fallback se a função global não estiver disponível
        const fallbackRarities = {
            'Common': { color: '#8a8f98', name: 'Comum' },
            'Rare': { color: '#3b82f6', name: 'Raro' },
            'Epic': { color: '#a855f7', name: 'Épico' },
            'Legendary': { color: '#f59e0b', name: 'Lendário' },
            'Mythic': { color: '#ef4444', name: 'Mítico' },
            'Special': { color: '#22d3ee', name: 'Especial' }
        };
        return fallbackRarities[rarity] || fallbackRarities['Common'];
    }

    updateFavoriteButton() {
        const favBtn = document.getElementById('modal-favorite-btn');
        if (!favBtn) return;
        
        const heartIcon = favBtn.querySelector('.heart-icon');
        const btnText = favBtn.querySelector('.btn-text');
        
        // Usar o novo sistema de favoritos
        const isFavorited = window.favoritesSystem && window.favoritesSystem.isFavorited(this.currentCharacter);
        
        if (isFavorited) {
            favBtn.classList.add('favorited');
            if (heartIcon) heartIcon.textContent = '💖';
            if (btnText) btnText.textContent = 'Favoritado';
            favBtn.title = 'Remover dos favoritos';
        } else {
            favBtn.classList.remove('favorited');
            if (heartIcon) heartIcon.textContent = '🤍';
            if (btnText) btnText.textContent = 'Favoritar';
            favBtn.title = 'Adicionar aos favoritos';
        }
    }

    async loadAnimeInfo(character) {
        try {
            // Buscar informações do anime via Jikan (API do MyAnimeList)
            const animeInfo = await this.searchAnime(character.anime);
            
            if (animeInfo) {
                // Atualizar banner do anime
                const banner = document.getElementById('anime-banner');
                if (animeInfo.images?.jpg?.large_image_url) {
                    banner.style.backgroundImage = `url('${animeInfo.images.jpg.large_image_url}')`;
                }

                // Atualizar título, ano e score
                document.getElementById('modal-anime-title').textContent = animeInfo.title || character.anime;
                
                if (animeInfo.year) {
                    document.getElementById('modal-anime-year').textContent = animeInfo.year;
                }
                
                if (animeInfo.score) {
                    document.getElementById('modal-anime-score').textContent = `⭐ ${animeInfo.score}`;
                }

                // Atualizar descrição
                if (animeInfo.synopsis) {
                    const synopsis = animeInfo.synopsis.length > 300 
                        ? animeInfo.synopsis.substring(0, 300) + '...'
                        : animeInfo.synopsis;
                    document.getElementById('modal-description').innerHTML = `<p>${synopsis}</p>`;
                }

                // Salvar URL do AniList/MAL para o botão
                if (animeInfo.url) {
                    document.getElementById('modal-anilist-btn').onclick = () => {
                        window.open(animeInfo.url, '_blank');
                    };
                }
            }
        } catch (error) {
            console.error('Erro ao carregar informações do anime:', error);
            document.getElementById('modal-description').innerHTML = '<p>Descrição não disponível.</p>';
        }
    }

    async searchAnime(animeName) {
        if (!animeName || animeName === 'Unknown') return null;
        
        // Verificar cache primeiro
        if (this.animeCache.has(animeName)) {
            return this.animeCache.get(animeName);
        }

        try {
            // Buscar via Jikan API
            const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(animeName)}&limit=1`);
            
            if (!response.ok) throw new Error('Falha na busca do anime');
            
            const data = await response.json();
            const anime = data.data?.[0];
            
            if (anime) {
                this.animeCache.set(animeName, anime);
                return anime;
            }
            
            return null;
        } catch (error) {
            console.error('Erro na API Jikan:', error);
            return null;
        }
    }

    async loadCharacterImages(character) {
        const gallery = document.getElementById('character-gallery');
        
        try {
            // Buscar imagens do personagem via Jikan
            const images = await this.searchCharacterImages(character.name, character.anime);
            
            if (images && images.length > 0) {
                this.renderImageGallery(images);
            } else {
                // Fallback: usar apenas a imagem principal
                this.renderImageGallery([character.image]);
            }
        } catch (error) {
            console.error('Erro ao carregar imagens:', error);
            this.renderImageGallery([character.image]);
        }
    }

    async searchCharacterImages(characterName, animeName) {
        const cacheKey = `${characterName}_${animeName}`;
        
        // Verificar cache
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }

        try {
            // Primeiro, buscar o anime
            const animeData = await this.searchAnime(animeName);
            if (!animeData) return [];

            // Buscar personagens do anime
            const response = await fetch(`https://api.jikan.moe/v4/anime/${animeData.mal_id}/characters`);
            if (!response.ok) throw new Error('Falha na busca de personagens');

            const data = await response.json();
            const characters = data.data || [];

            // Encontrar o personagem específico
            const targetCharacter = characters.find(char => 
                char.character.name.toLowerCase().includes(characterName.toLowerCase()) ||
                characterName.toLowerCase().includes(char.character.name.toLowerCase())
            );

            let images = [];

            if (targetCharacter) {
                // Buscar imagens do personagem específico
                const charResponse = await fetch(`https://api.jikan.moe/v4/characters/${targetCharacter.character.mal_id}/pictures`);
                if (charResponse.ok) {
                    const charData = await charResponse.json();
                    images = (charData.data || [])
                        .map(img => img.jpg.image_url || img.webp.image_url)
                        .filter(Boolean)
                        .slice(0, 15); // Limitar a 15 imagens
                }
            }

            // Se não encontrou imagens específicas, usar algumas do anime
            if (images.length === 0) {
                const animeImagesResponse = await fetch(`https://api.jikan.moe/v4/anime/${animeData.mal_id}/pictures`);
                if (animeImagesResponse.ok) {
                    const animeImagesData = await animeImagesResponse.json();
                    images = (animeImagesData.data || [])
                        .map(img => img.jpg.large_image_url || img.jpg.image_url)
                        .filter(Boolean)
                        .slice(0, 8); // Menos imagens do anime
                }
            }

            this.imageCache.set(cacheKey, images);
            return images;

        } catch (error) {
            console.error('Erro ao buscar imagens do personagem:', error);
            return [];
        }
    }

    renderImageGallery(images) {
        const gallery = document.getElementById('character-gallery');
        
        if (!images || images.length === 0) {
            gallery.innerHTML = `
                <div class="gallery-loading">
                    <p>Nenhuma imagem adicional encontrada</p>
                </div>
            `;
            return;
        }

        // Limitar para máximo 5 imagens
        const limitedImages = images.slice(0, 5);

        const galleryHTML = `
            <div class="simple-gallery">
                ${limitedImages.map((imageUrl, index) => `
                    <div class="gallery-image" onclick="toggleImageSize(this)">
                        <img src="${imageUrl}" alt="Imagem ${index + 1}" loading="lazy" 
                             onerror="this.parentElement.style.display='none'">
                    </div>
                `).join('')}
            </div>
        `;

        gallery.innerHTML = galleryHTML;

        // Animação simples de entrada sem opacidade
        if (typeof gsap !== 'undefined') {
            gsap.from('.gallery-image', {
                duration: 0.4,
                scale: 0.8,
                y: 20,
                stagger: 0.08,
                ease: 'back.out(1.7)'
            });
        }
    }



    toggleImageSize(imageElement) {
        // Remover a classe enlarged de todas as outras imagens
        document.querySelectorAll('.gallery-image.enlarged').forEach(img => {
            if (img !== imageElement) {
                img.classList.remove('enlarged');
            }
        });

        // Toggle da classe enlarged na imagem clicada
        imageElement.classList.toggle('enlarged');
        
        // Animação suave com GSAP se disponível
        if (typeof gsap !== 'undefined') {
            gsap.to(imageElement, {
                duration: 0.3,
                ease: 'back.out(1.7)'
            });
        }
    }





    toggleFavorite() {
        if (!this.currentCharacter) return;
        
        const favBtn = document.getElementById('modal-favorite-btn');
        
        // Usar o novo sistema de favoritos
        if (window.favoritesSystem) {
            // Animação de clique primeiro
            if (typeof gsap !== 'undefined') {
                gsap.to(favBtn, {
                    scale: 0.95,
                    duration: 0.1,
                    ease: 'power2.out',
                    onComplete: () => {
                        // Aplicar mudança no meio da animação
                        window.favoritesSystem.toggleFavorite(this.currentCharacter);
                        this.updateFavoriteButton();
                        
                        // Animação de volta com bounce
                        gsap.to(favBtn, {
                            scale: 1.05,
                            duration: 0.15,
                            ease: 'back.out(1.7)',
                            onComplete: () => {
                                gsap.to(favBtn, {
                                    scale: 1,
                                    duration: 0.1,
                                    ease: 'power2.out'
                                });
                            }
                        });
                    }
                });
            } else {
                // Fallback sem GSAP
                window.favoritesSystem.toggleFavorite(this.currentCharacter);
                this.updateFavoriteButton();
            }
        }
    }
}

// Instanciar modal
const characterModal = new CharacterModal();

// Funções globais para serem chamadas pelos elementos HTML
window.openCharacterModal = (character) => characterModal.openModal(character);
window.closeCharacterModal = () => characterModal.closeModal();
window.toggleFavorite = () => characterModal.toggleFavorite();
window.openAniListPage = () => {
    const btn = document.getElementById('modal-anilist-btn');
    if (btn.onclick) btn.onclick();
};

// Função global para a galeria simples
window.toggleImageSize = (element) => characterModal.toggleImageSize(element);



console.log('Sistema de modal de personagem inicializado');
