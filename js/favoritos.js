// ========== PÁGINA DE FAVORITOS - NOVA IMPLEMENTAÇÃO ==========

document.addEventListener('DOMContentLoaded', () => {
    const DOM = {
        grid: document.querySelector('.favorites-grid'),
        emptyState: document.querySelector('.empty-state'),
        favoriteCards: document.getElementById('favorite-cards'),
        favoriteRarities: document.getElementById('favorite-rarities')
    };

    let favorites = [];

    // ========== FUNÇÕES DE RENDERIZAÇÃO ==========

    function createFavoriteCard(character, index) {
        const card = document.createElement('div');
        card.className = `compact-card rarity-${character.rarity}`;
        card.tabIndex = 0;

        const rarity = getRarityInfo(character.rarity);
        
        // Badges
        let quantityBadge = '';
        if ((character.quantity || 1) > 1) {
            quantityBadge = `<div class="compact-quantity">×${character.quantity}</div>`;
        }

        card.innerHTML = `
            <div class="compact-image-container">
                <img src="${character.image}" 
                     alt="${character.name}" 
                     class="compact-image" 
                     loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/200x280/1a1b23/6366f1?text=Sem+Imagem'">
                <div class="compact-favorite">💖</div>
                ${quantityBadge}
            </div>
            <div class="compact-info">
                <div class="compact-name" title="${character.name}">${character.name}</div>
                <div class="compact-rarity rarity-${character.rarity}">
                    <span class="compact-rarity-emoji">${rarity.emoji}</span>
                    <span>${rarity.name || character.rarity}</span>
                </div>
            </div>
        `;

        // Aplicar cores da raridade
        card.style.setProperty('border-color', rarity.color, 'important');
        card.style.opacity = '1';
        
        // Aplicar estilos da raridade no badge
        const rarityElement = card.querySelector('.compact-rarity');
        if (rarityElement) {
            applyRarityStyles(rarityElement, character.rarity);
        }

        // Event listeners
        card.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Abrir modal com detalhes do personagem
            if (window.openCharacterModal) {
                window.openCharacterModal(character);
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });

        return card;
    }

    function renderGrid() {
        if (!window.favoritesSystem) {
            console.warn('Sistema de favoritos não carregado ainda');
            return;
        }

        favorites = window.favoritesSystem.getFavorites();

        // Verificar se há favoritos
        if (favorites.length === 0) {
            DOM.grid.style.display = 'none';
            DOM.emptyState.style.display = 'block';
            updateStats();
            return;
        }

        // Mostrar grid
        DOM.grid.style.display = 'grid';
        DOM.emptyState.style.display = 'none';

        // Ordenar por raridade e nome
        favorites.sort((a, b) => {
            const rarityOrderA = getRarityInfo(a.rarity)?.order ?? 99;
            const rarityOrderB = getRarityInfo(b.rarity)?.order ?? 99;
            if (rarityOrderA !== rarityOrderB) return rarityOrderB - rarityOrderA;
            return a.name.localeCompare(b.name);
        });

        // Criar cards
        const fragment = document.createDocumentFragment();
        favorites.forEach((character, index) => {
            const card = createFavoriteCard(character, index);
            // Garantir opacidade sempre 1
            card.style.opacity = '1';
            fragment.appendChild(card);
        });

        DOM.grid.innerHTML = '';
        DOM.grid.appendChild(fragment);

        // Animação GSAP se disponível
        if (typeof gsap !== 'undefined') {
            // Garantir visibilidade
            gsap.set('.compact-card', { opacity: 1, y: 0 });
            
            // Animação de entrada
            gsap.fromTo('.compact-card', 
                { 
                    opacity: 0, 
                    y: 30,
                    scale: 0.9
                },
                { 
                    duration: 0.4, 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    stagger: 0.02, 
                    ease: 'power2.out',
                    clearProps: 'all'
                }
            );
        }

        updateStats();
    }

    function updateStats() {
        if (!window.favoritesSystem) return;

        const stats = window.favoritesSystem.getStats();
        
        animateNumber(DOM.favoriteCards, parseInt(DOM.favoriteCards.textContent) || 0, stats.total, 800);
        animateNumber(DOM.favoriteRarities, parseInt(DOM.favoriteRarities.textContent) || 0, stats.rarities, 800);
    }

    function animateNumber(element, start, end, duration) {
        if (!element) return;
        
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

    // ========== GERENCIAMENTO DE SCROLL ==========

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

    // ========== FUNÇÕES GLOBAIS ==========

    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ========== EVENT LISTENERS ==========

    window.addEventListener('scroll', handleScroll);

    // Escutar mudanças nos favoritos
    window.addEventListener('favoritesChanged', () => {
        setTimeout(renderGrid, 50); // Pequeno delay para garantir que salvou
    });

    // ========== INICIALIZAÇÃO ==========

    function init() {
        // Aguardar o sistema de favoritos estar pronto
        if (window.favoritesSystem && window.favoritesSystem.isInitialized) {
            renderGrid();
            handleScroll();
            console.log('✅ Página de favoritos inicializada');
        } else {
            // Tentar novamente em 100ms
            setTimeout(init, 100);
        }
    }

    // Aguardar um pouco para garantir que o sistema de favoritos carregou
    setTimeout(init, 50);
});
