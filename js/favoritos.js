// Sistema de Favoritos
document.addEventListener('DOMContentLoaded', () => {
    const DOM = {
        grid: document.querySelector('.favorites-grid'),
        emptyState: document.querySelector('.empty-state'),
        favoriteCards: document.getElementById('favorite-cards'),
        favoriteRarities: document.getElementById('favorite-rarities')
    };

    // Usar as definições globais de raridade

    let favorites = [];
    let inventory = [];

    // Função para atualizar imagens dos favoritos antigos
    function updateFavoriteImages() {
        if (!window.characterPoolManager || !window.characterPoolManager.isInitialized) {
            return;
        }

        let updated = false;
        
        // Obter todos os personagens do pool atualizado
        const allPoolCharacters = [];
        Object.keys(window.characterPoolManager.characterPool).forEach(rarity => {
            allPoolCharacters.push(...window.characterPoolManager.characterPool[rarity]);
        });

        // Atualizar personagens nos favoritos
        favorites.forEach(char => {
            // Procurar personagem correspondente no pool atualizado
            const poolChar = allPoolCharacters.find(poolChar => 
                poolChar.name === char.name && poolChar.anime === char.anime
            );
            
            if (poolChar && poolChar.image && poolChar.image !== char.image) {
                console.log(`Atualizando imagem favorita de ${char.name}: ${char.image} -> ${poolChar.image}`);
                char.image = poolChar.image;
                updated = true;
            }
        });

        // Salvar se houve atualizações
        if (updated) {
            saveFavorites();
            console.log('Imagens dos favoritos atualizadas!');
        }
    }

    // Carregar favoritos do localStorage (apenas na inicialização)
    let hasLoaded = false;
    function loadFavorites() {
        // Só carregar uma vez na inicialização
        if (hasLoaded) {
            return;
        }
        
        try {
            const stored = localStorage.getItem('gacha.favorites.v1');
            const loadedFavorites = stored ? JSON.parse(stored) : [];
            
            favorites = loadedFavorites;
            hasLoaded = true;
            
            // Carregar inventário também para ter dados completos
            const inventoryStored = localStorage.getItem('gacha.inventory.v1');
            inventory = inventoryStored ? JSON.parse(inventoryStored) : [];
            
            updateStats();
            console.log('Favoritos carregados:', favorites.length);
        } catch (e) {
            console.error("Erro ao carregar favoritos:", e);
            favorites = [];
            hasLoaded = true;
        }
    }

    // Salvar favoritos (imediato)
    function saveFavorites() {
        try {
            localStorage.setItem('gacha.favorites.v1', JSON.stringify(favorites));
            updateStats();
        } catch (e) {
            console.error("Erro ao salvar favoritos:", e);
        }
    }

    // Atualizar estatísticas
    function updateStats() {
        const totalFavorites = favorites.length;
        const uniqueRarities = new Set(favorites.map(f => f.rarity)).size;

        animateNumber(DOM.favoriteCards, parseInt(DOM.favoriteCards.textContent) || 0, totalFavorites, 1000);
        animateNumber(DOM.favoriteRarities, parseInt(DOM.favoriteRarities.textContent) || 0, uniqueRarities, 1000);
    }

    // Animar números
    function animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (end - start) * easeOutCubic);
            element.textContent = current;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // Criar card de favorito
    function createFavoriteCard(character, index) {
        normalizeRarityLabel(character);
        const card = document.createElement('div');
        card.className = `favorite-card rarity-${character.rarity}`;
        card.tabIndex = 0;
        card.style.animationDelay = `${index * 0.05}s`;

        const rarity = getRarityInfo(character.rarity);
        let quantityBadge = '';
        if (character.quantity > 1) {
            quantityBadge = `<div class="card-quantity">×${character.quantity}</div>`;
        }

        const popularityText = typeof character.popularity === 'number'
            ? character.popularity.toLocaleString('pt-BR')
            : '—';

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${character.image}" 
                     alt="${character.name}" 
                     class="card-image" 
                     loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/280x392/1a1b23/6366f1?text=Sem+Imagem'">
                <div class="card-rarity-glow"></div>
                <div class="favorite-heart">💖</div>
                ${quantityBadge}
            </div>
            <div class="card-info">
                <h3 class="card-name">${character.name}</h3>
                <p class="card-anime">${character.anime || ''}</p>

                <div class="card-meta">
                    <div class="card-popularity" title="Favoritos no AniList">
                        <span class="pop-emoji">🔥</span>
                        <span>${popularityText}</span>
                    </div>
                    <div class="card-rarity rarity-${character.rarity}">
                        <span>${rarity.emoji}</span>
                        <span>${rarity.name}</span>
                    </div>
                </div>
            </div>
        `;

        // Aplicar cores da raridade
        const cardRarityElement = card.querySelector('.card-rarity');
        if (cardRarityElement) {
            // Usar a função global para aplicar estilos
            applyRarityStyles(cardRarityElement, character.rarity);
        }
        card.style.setProperty('border-color', rarity.color, 'important');

        // Efeitos de hover
        card.addEventListener('mouseenter', () => {
            if (!card.classList.contains('clicking')) {
                card.style.transform = 'translateY(-8px) scale(1.02)';
            }
        });

        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('clicking')) {
                card.style.transform = 'translateY(0) scale(1)';
            }
        });

        // Evento de clique para abrir modal
        card.addEventListener('click', (e) => {
            e.preventDefault();
            card.classList.add('clicking');
            card.style.transform = 'translateY(-4px) scale(0.98)';
            
            setTimeout(() => {
                card.classList.remove('clicking');
                if (card.matches(':hover')) {
                    card.style.transform = 'translateY(-8px) scale(1.02)';
                } else {
                    card.style.transform = 'translateY(0) scale(1)';
                }
                
                // Abrir modal com detalhes do personagem
                openCharacterModal(character);
            }, 150);
        });

        // Suporte a teclado
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });

        return card;
    }

    // Função para determinar raridade baseada na popularidade
    function determineRarity(popularity) {
        if (popularity >= 120000) return 'Special';
        if (popularity >= 60000) return 'Mythic';
        if (popularity >= 25000) return 'Legendary';
        if (popularity >= 10000) return 'Epic';
        if (popularity >= 3000) return 'Rare';
        return 'Common';
    }

    // Normalizar labels de raridade
    function normalizeRarityLabel(char) {
        const rarityMap = {
            'Lendário': 'Legendary',
            'Raro': 'Rare',
            'Épico': 'Epic',
            'Mítico': 'Mythic',
            'Especial': 'Special',
            'Comum': 'Common'
        };
        
        if (rarityMap[char.rarity]) {
            char.rarity = rarityMap[char.rarity];
        }
        
        // Corrigir raridade se houver inconsistência com popularidade
        if (char.popularity && typeof char.popularity === 'number') {
            const correctRarity = determineRarity(char.popularity);
            if (char.rarity !== correctRarity) {
                char.rarity = correctRarity;
            }
        }
    }

    // Renderizar grid de favoritos
    function renderFavorites() {
        if (favorites.length === 0) {
            DOM.grid.style.display = 'none';
            DOM.emptyState.style.display = 'block';
            return;
        }

        DOM.grid.style.display = 'grid';
        DOM.emptyState.style.display = 'none';

        // Ordenar por raridade e nome
        favorites.sort((a, b) => {
            const rarityOrderA = getRarityInfo(a.rarity)?.order ?? 99;
            const rarityOrderB = getRarityInfo(b.rarity)?.order ?? 99;
            if (rarityOrderA !== rarityOrderB) return rarityOrderB - rarityOrderA;
            return a.name.localeCompare(b.name);
        });

        const fragment = document.createDocumentFragment();
        favorites.forEach((character, index) => {
            fragment.appendChild(createFavoriteCard(character, index));
        });

        DOM.grid.innerHTML = '';
        DOM.grid.appendChild(fragment);

        // Animação GSAP
        if (typeof gsap !== 'undefined') {
            gsap.from('.favorite-card', { 
                duration: 0.6, 
                y: 50, 
                opacity: 0, 
                stagger: 0.05, 
                ease: 'power2.out' 
            });
        }
    }

    // Verificar se um personagem está favoritado
    function isFavorited(character) {
        const characterId = character.id || `${character.name}_${character.anime}`;
        return favorites.some(fav => {
            const favId = fav.id || `${fav.name}_${fav.anime}`;
            return favId === characterId;
        });
    }

    // Adicionar/remover favorito
    function toggleFavorite(character) {
        // Criar identificador único para o personagem
        const characterId = character.id || `${character.name}_${character.anime}`;
        
        const index = favorites.findIndex(fav => {
            const favId = fav.id || `${fav.name}_${fav.anime}`;
            return favId === characterId;
        });

        if (index !== -1) {
            // Remover dos favoritos
            favorites.splice(index, 1);
            showToast(`${character.name} removido dos favoritos`);
            console.log('Favorito removido. Total atual:', favorites.length);
        } else {
            // Adicionar aos favoritos
            const characterCopy = {...character};
            // Garantir que tem um ID único
            if (!characterCopy.id) {
                characterCopy.id = characterId;
            }
            favorites.push(characterCopy);
            showToast(`${character.name} adicionado aos favoritos!`);
            console.log('Favorito adicionado. Total atual:', favorites.length);
        }

        // Salvar imediatamente
        saveFavorites();
        
        // Atualizar interface após um pequeno delay para garantir que salvou
        setTimeout(() => {
            renderFavorites();
        }, 50);
        
        // Disparar evento para atualizar outras interfaces
        window.dispatchEvent(new CustomEvent('favoritesChanged', {
            detail: { character, wasFavorited: index === -1 }
        }));
        
        return index === -1; // Retorna true se foi adicionado
    }

    // Mostrar toast
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            margin-top: 0;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
            z-index: 10000;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Função global para scroll to top
    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Gerenciar FAB de scroll
    function handleScroll() {
        const fab = document.querySelector('.fab');
        if (!fab) return;
        
        if (window.scrollY > 300) {
            fab.style.opacity = '1';
            fab.style.pointerEvents = 'auto';
            fab.style.transform = 'scale(1)';
        } else {
            fab.style.opacity = '0';
            fab.style.pointerEvents = 'none';
            fab.style.transform = 'scale(0.8)';
        }
    }

    window.addEventListener('scroll', handleScroll);

    // Funções globais para integração com outros módulos
    window.favoritesManager = {
        isFavorited,
        toggleFavorite,
        loadFavorites,
        renderFavorites,
        getFavorites: () => favorites,
        addFavorite: (character) => {
            const characterId = character.id || `${character.name}_${character.anime}`;
            const existing = favorites.find(fav => {
                const favId = fav.id || `${fav.name}_${fav.anime}`;
                return favId === characterId;
            });
            if (!existing) {
                const characterCopy = {...character};
                if (!characterCopy.id) {
                    characterCopy.id = characterId;
                }
                favorites.push(characterCopy);
                saveFavorites();
                renderFavorites();
                return true;
            }
            return false;
        },
        removeFavorite: (character) => {
            const characterId = character.id || `${character.name}_${character.anime}`;
            const index = favorites.findIndex(fav => {
                const favId = fav.id || `${fav.name}_${fav.anime}`;
                return favId === characterId;
            });
            if (index !== -1) {
                favorites.splice(index, 1);
                saveFavorites();
                renderFavorites();
                return true;
            }
            return false;
        }
    };

    // Inicializar
    loadFavorites();
    renderFavorites();
    handleScroll();

    // Aguardar o character pool estar pronto para atualizar imagens antigas dos favoritos
    const checkPoolAndUpdateFavorites = () => {
        if (window.characterPoolManager && window.characterPoolManager.isInitialized) {
            updateFavoriteImages();
            renderFavorites(); // Re-renderizar com imagens atualizadas
        } else {
            setTimeout(checkPoolAndUpdateFavorites, 500);
        }
    };
    checkPoolAndUpdateFavorites();

    console.log('Sistema de favoritos inicializado');
    console.log('Favoritos carregados:', favorites.length);
});
