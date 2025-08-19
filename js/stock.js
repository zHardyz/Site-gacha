document.addEventListener('DOMContentLoaded', () => {
    const DOM = {
        grid: document.querySelector('.compact-grid'),
        emptyState: document.querySelector('.empty-state'),
        noResultsState: document.querySelector('.no-results-state'),
        totalCards: document.getElementById('total-cards'),
        uniqueCards: document.getElementById('unique-cards'),
        showingCount: document.getElementById('showing-count'),
        totalCount: document.getElementById('total-count'),
    };

    // === AniList ===
    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const ANILIST_TOKEN = ""; // OPCIONAL. Se adicionar OAuth, coloque aqui: 'Bearer <token>'

    // Usar as definições globais de raridade

    let inventory = [];
    let favorites = [];
    let currentFilter = {
        rarity: 'all',
        sort: 'rarity', // Ordenação por raridade como padrão
        favoritesOnly: false,
        duplicatesOnly: false,
        searchQuery: ''
    };

    // Função para atualizar imagens dos personagens antigos
    function updateCharacterImages() {
        if (!window.characterPoolManager || !window.characterPoolManager.isInitialized) {
            return;
        }

        let updated = false;
        const poolStats = window.characterPoolManager.getPoolStats();
        
        // Obter todos os personagens do pool atualizado
        const allPoolCharacters = [];
        Object.keys(window.characterPoolManager.characterPool).forEach(rarity => {
            allPoolCharacters.push(...window.characterPoolManager.characterPool[rarity]);
        });

        // Atualizar personagens no inventário
        inventory.forEach(char => {
            // Procurar personagem correspondente no pool atualizado
            const poolChar = allPoolCharacters.find(poolChar => 
                poolChar.name === char.name && poolChar.anime === char.anime
            );
            
            if (poolChar && poolChar.image && poolChar.image !== char.image) {
                console.log(`Atualizando imagem de ${char.name}: ${char.image} -> ${poolChar.image}`);
                char.image = poolChar.image;
                updated = true;
            }
        });

        // Salvar se houve atualizações
        if (updated) {
            localStorage.setItem('gacha.inventory.v1', JSON.stringify(inventory));
            console.log('Imagens do inventário atualizadas!');
        }
    }

    // Função para verificar se um personagem está favoritado
    function checkIfFavorited(character) {
        if (window.favoritesSystem) {
            return window.favoritesSystem.isFavorited(character);
        }
        return false;
    }

    function loadInventory() {
        try {
            const stored = localStorage.getItem('gacha.inventory.v1');
            inventory = stored ? JSON.parse(stored) : [];
            updateStats();
        } catch (e) {
            console.error("Failed to load inventory:", e);
            inventory = [];
        }
    }

    function saveInventory() {
        try {
            localStorage.setItem('gacha.inventory.v1', JSON.stringify(inventory));
            updateStats();
        } catch (e) {
            console.error("Failed to save inventory:", e);
        }
    }

    function updateStats() {
        const totalCards = inventory.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const uniqueCards = inventory.length;

        animateNumber(DOM.totalCards, parseInt(DOM.totalCards.textContent) || 0, totalCards, 1000);
        animateNumber(DOM.uniqueCards, parseInt(DOM.uniqueCards.textContent) || 0, uniqueCards, 1000);
    }

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

    // Util: normalização de raridades PT->EN (compatível com seu CSS)
    function normalizeRarityLabel(char) {
        if (char.rarity === 'Lendário') char.rarity = 'Legendary';
        if (char.rarity === 'Raro') char.rarity = 'Rare';
        if (char.rarity === 'Épico') char.rarity = 'Epic';
        if (char.rarity === 'Mítico') char.rarity = 'Mythic';
        if (char.rarity === 'Especial') char.rarity = 'Special';
    }

    // --- NEW: extrai uma possível "frase icônica" da descrição ---
    function extractQuote(description = "") {
        if (!description) return null;

        // remove tags simples <br>, <i>, etc. e entidades básicas
        const txt = description
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&#039;|&apos;/g, "'")
            .replace(/&amp;/g, '&');

        const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

        // 1) procurar algo entre aspas
        const quoteRegexes = [
            /“([^”]{10,200})”/,
            /"([^"]{10,200})"/,
            /'([^']{10,200})'/
        ];
        for (const line of lines) {
            for (const rx of quoteRegexes) {
                const m = line.match(rx);
                if (m && m[1]) return m[1].trim();
            }
        }

        // 2) senão, pegue a primeira frase curta e marcante
        const firstSentence = txt.split(/(?<=[.!?])\s+/)[0];
        if (firstSentence && firstSentence.length <= 180) {
            return firstSentence.trim();
        }
        return null;
    }

    async function fetchAniListCharacterById(id) {
        const query = `
          query ($id: Int!) {
            Character(id: $id) {
              id
              favourites
              description(asHtml: false)
              siteUrl
            }
          }
        `;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (ANILIST_TOKEN) headers['Authorization'] = ANILIST_TOKEN.startsWith('Bearer') ? ANILIST_TOKEN : `Bearer ${ANILIST_TOKEN}`;

        try {
            const res = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query, variables: { id } })
            });
            const data = await res.json();
            return data?.data?.Character || null;
        } catch (err) {
            console.error('AniList fetch error:', err);
            return null;
        }
    }

    // Função para determinar raridade baseada na popularidade (usando função global)
    function determineRarity(popularity) {
        return window.determineRarityByPopularity(popularity);
    }

    // Enriquecer itens do estoque que não tenham popularity/quote
    async function enrichInventoryMissingInfo() {
        const toUpdate = inventory.filter(c => (c && c.id) && (!('popularity' in c) || !('quote' in c)));
        if (toUpdate.length === 0) return;

        // limitar concorrência
        const concurrency = 3;
        let idx = 0;
        async function worker() {
            while (idx < toUpdate.length) {
                const current = toUpdate[idx++];
                const extra = await fetchAniListCharacterById(current.id);
                if (extra) {
                    if (typeof extra.favourites === 'number') {
                        current.popularity = extra.favourites;
                        // Recalcular raridade baseada na popularidade atual
                        current.rarity = determineRarity(extra.favourites);
                    }
                    const q = extractQuote(extra.description || "");
                    if (q) current.quote = q;
                    if (extra.siteUrl) current.siteUrl = extra.siteUrl;
                }
            }
        }
        const workers = Array.from({ length: Math.min(concurrency, toUpdate.length) }, worker);
        await Promise.all(workers);

        saveInventory();
        renderGrid(inventory);
    }

    // Função para corrigir inconsistências de raridade no inventário
    function fixRarityInconsistencies() {
        let fixed = 0;
        inventory.forEach(char => {
            if (char.popularity && typeof char.popularity === 'number') {
                const correctRarity = determineRarity(char.popularity);
                if (char.rarity !== correctRarity) {
                    console.log(`🔧 Corrigindo ${char.name}: ${char.rarity} → ${correctRarity} (${char.popularity.toLocaleString()} favoritos)`);
                    char.rarity = correctRarity;
                    fixed++;
                }
            }
        });
        
        if (fixed > 0) {
            console.log(`✅ Corrigidas ${fixed} inconsistências de raridade`);
            saveInventory();
            renderGrid(inventory);
        } else {
            console.log('✅ Nenhuma inconsistência encontrada');
        }
    }

    function createCompactCard(char, index) {
        normalizeRarityLabel(char);
        const card = document.createElement('div');
        card.className = `compact-card rarity-${char.rarity}`;
        card.tabIndex = 0;

        const rarity = getRarityInfo(char.rarity);
        
        // Badges
        let quantityBadge = '';
        if ((char.quantity || 1) > 1) {
            quantityBadge = `<div class="compact-quantity">×${char.quantity}</div>`;
        }

        // Verificar se está favoritado
        const isFavorited = checkIfFavorited(char);
        const favoriteHeart = isFavorited ? '<div class="compact-favorite">💖</div>' : '';

        card.innerHTML = `
            <div class="compact-image-container">
                <img src="${char.image}" 
                     alt="${char.name}" 
                     class="compact-image" 
                     loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/200x280/1a1b23/6366f1?text=Sem+Imagem'">
                ${favoriteHeart}
                ${quantityBadge}
            </div>
            <div class="compact-info">
                <div class="compact-name" title="${char.name}">${char.name}</div>
                <div class="compact-rarity rarity-${char.rarity}">
                    <span class="compact-rarity-emoji">${rarity.emoji}</span>
                    <span>${rarity.name || char.rarity}</span>
                </div>
            </div>
        `;

        // Aplicar cores da raridade
        card.style.setProperty('border-color', rarity.color, 'important');
        
        // Aplicar estilos da raridade no badge
        const rarityElement = card.querySelector('.compact-rarity');
        if (rarityElement) {
            applyRarityStyles(rarityElement, char.rarity);
        }

        // Event listeners
        card.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Abrir modal com detalhes do personagem
            if (window.openCharacterModal) {
                window.openCharacterModal(char);
            } else {
                showCardInteraction(char);
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

    function showCardInteraction(character) {
        const feedback = document.createElement('div');
        feedback.textContent = `Visualizando ${character.name}`;
        feedback.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0.8rem 1.5rem;
            border-radius: 12px;
            font-weight: 500;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        `;
        document.body.appendChild(feedback);
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(-10px)';
        });
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(10px)';
            setTimeout(() => feedback.parentNode && feedback.parentNode.removeChild(feedback), 300);
        }, 2000);
    }

    // === SISTEMA DE FILTROS SIMPLES ===
    
    function applyFilters() {
        let filtered = [...inventory];
        
        // Filtro por raridade
        if (currentFilter.rarity !== 'all') {
            filtered = filtered.filter(item => item.rarity === currentFilter.rarity);
        }
        
        // Filtro apenas favoritos
        if (currentFilter.favoritesOnly) {
            filtered = filtered.filter(item => checkIfFavorited(item));
        }
        
        // Filtro apenas duplicatas
        if (currentFilter.duplicatesOnly) {
            filtered = filtered.filter(item => (item.quantity || 1) > 1);
        }
        
        // Filtro por busca
        if (currentFilter.searchQuery) {
            const query = currentFilter.searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(query) ||
                (item.anime || '').toLowerCase().includes(query) ||
                (item.rarity || '').toLowerCase().includes(query)
            );
        }
        
        // Aplicar ordenação
        filtered = applySorting(filtered);
        
        return filtered;
    }
    
    function applySorting(items) {
        return items.sort((a, b) => {
            switch (currentFilter.sort) {
                case 'rarity':
                    const rarityOrderA = getRarityInfo(a.rarity)?.order ?? 99;
                    const rarityOrderB = getRarityInfo(b.rarity)?.order ?? 99;
                    if (rarityOrderA !== rarityOrderB) return rarityOrderB - rarityOrderA;
                    return a.name.localeCompare(b.name);
                    
                case 'name':
                    return a.name.localeCompare(b.name);
                    
                case 'quantity':
                    const qtyA = a.quantity || 1;
                    const qtyB = b.quantity || 1;
                    if (qtyA !== qtyB) return qtyB - qtyA;
                    return a.name.localeCompare(b.name);
                    
                case 'popularity':
                    const popA = a.popularity || 0;
                    const popB = b.popularity || 0;
                    if (popA !== popB) return popB - popA;
                    return a.name.localeCompare(b.name);
                    
                default:
                    return 0;
            }
        });
    }
    
    function updateCounts(filteredItems) {
        if (DOM.showingCount) DOM.showingCount.textContent = filteredItems.length;
        if (DOM.totalCount) DOM.totalCount.textContent = inventory.length;
    }

    function renderGrid(items) {
        const grid = DOM.grid;
        const emptyState = DOM.emptyState;
        const noResultsState = DOM.noResultsState;
        
        // Se inventário está vazio
        if (inventory.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            noResultsState.style.display = 'none';
            return;
        }
        
        // Se não há resultados após filtros
        if (items.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'none';
            noResultsState.style.display = 'block';
            return;
        }
        
        // Mostrar grid com resultados
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        noResultsState.style.display = 'none';

        // Criar cards
        const fragment = document.createDocumentFragment();
        items.forEach((item, index) => {
            const card = createCompactCard(item, index);
            // Garantir opacidade sempre 1
            card.style.opacity = '1';
            fragment.appendChild(card);
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);

        // Animação com GSAP se disponível
        if (typeof gsap !== 'undefined') {
            // Primeiro garantir que todos os cards estão visíveis
            gsap.set('.compact-card', { opacity: 1, y: 0 });
            
            // Depois aplicar a animação de entrada
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
                    clearProps: 'all' // Limpa todas as propriedades após a animação
                }
            );
        }
        
        updateCounts(items);
    }

    function clearFilters() {
        currentFilter = {
            rarity: 'all',
            sort: 'rarity',
            favoritesOnly: false,
            duplicatesOnly: false,
            searchQuery: ''
        };
        
        // Resetar UI
        const raritySelect = document.getElementById('rarity-filter');
        const sortSelect = document.getElementById('sort-filter');
        const favoritesBtn = document.getElementById('favorites-toggle');
        const duplicatesBtn = document.getElementById('duplicates-toggle');
        const searchInput = document.querySelector('.collection-search');
        
        if (raritySelect) raritySelect.value = 'all';
        if (sortSelect) sortSelect.value = 'rarity';
        if (favoritesBtn) favoritesBtn.classList.remove('active');
        if (duplicatesBtn) duplicatesBtn.classList.remove('active');
        if (searchInput) searchInput.value = '';
        
        // Re-renderizar
        const filtered = applyFilters();
        renderGrid(filtered);
    }

    function refreshDisplay() {
        const filtered = applyFilters();
        renderGrid(filtered);
    }

    window.addToInventory = function(character) {
        loadInventory();
        const existing = inventory.find(c => c.name === character.name && c.anime === character.anime);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
            // se vier dados novos (popularidade/quote), atualizar
            if (typeof character.popularity === 'number') existing.popularity = character.popularity;
            if (character.quote) existing.quote = character.quote;
            if (character.siteUrl) existing.siteUrl = character.siteUrl;
        } else {
            character.quantity = 1;
            inventory.push(character);
        }
        saveInventory();
        
        // Re-renderizar com filtros atuais
        refreshDisplay();
        
        showToast(`${character.name} adicionado à sua coleção!`);
    };

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
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
            setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 400);
        }, 3000);
    }

    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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

    // estilos auxiliares já existentes + foco/teclas… (mantidos)

    window.addEventListener('scroll', handleScroll);

    DOM.grid.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('stock-card')) {
            e.target.click();
            e.preventDefault();
        }
    });

    // IntersectionObserver para animar (mantido)
    if ('IntersectionObserver' in window) {
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                    cardObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '50px' });

        const observeCards = () => {
            document.querySelectorAll('.stock-card').forEach(card => {
                card.style.animationPlayState = 'paused';
                cardObserver.observe(card);
            });
        };

        const originalRenderGrid = renderGrid;
        renderGrid = function(items) {
            originalRenderGrid(items);
            setTimeout(observeCards, 100);
        };
    }

    function addSearchFunctionality() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar na sua coleção...';
        searchInput.className = 'collection-search';
        // estilos já eram definidos inline; mantidos
        searchInput.style.cssText = `
            width: 100%;
            max-width: 400px;
            padding: 1rem 1.5rem;
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            font-family: 'Inter', sans-serif;
            font-size: 1rem;
            margin: 1rem auto;
            display: block;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        `;

        const container = document.querySelector('.stock-container');
        container.insertBefore(searchInput, container.firstChild);

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filteredInventory = query === '' 
                ? inventory 
                : inventory.filter(item => 
                    item.name.toLowerCase().includes(query) ||
                    (item.anime || '').toLowerCase().includes(query) ||
                    (item.rarity || '').toLowerCase().includes(query)
                );
            renderGrid(filteredInventory);
        });

        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = 'var(--accent)';
            searchInput.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
        });

        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = 'var(--border-subtle)';
            searchInput.style.boxShadow = 'none';
        });
    }

    // === EVENT LISTENERS SIMPLES ===
    
    function setupFilterEventListeners() {
        // Filtro de raridade
        const raritySelect = document.getElementById('rarity-filter');
        if (raritySelect) {
            raritySelect.addEventListener('change', (e) => {
                currentFilter.rarity = e.target.value;
                refreshDisplay();
            });
        }
        
        // Filtro de ordenação
        const sortSelect = document.getElementById('sort-filter');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentFilter.sort = e.target.value;
                refreshDisplay();
            });
        }
        
        // Toggle favoritos
        const favoritesBtn = document.getElementById('favorites-toggle');
        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', () => {
                currentFilter.favoritesOnly = !currentFilter.favoritesOnly;
                favoritesBtn.classList.toggle('active', currentFilter.favoritesOnly);
                refreshDisplay();
            });
        }
        
        // Toggle duplicatas
        const duplicatesBtn = document.getElementById('duplicates-toggle');
        if (duplicatesBtn) {
            duplicatesBtn.addEventListener('click', () => {
                currentFilter.duplicatesOnly = !currentFilter.duplicatesOnly;
                duplicatesBtn.classList.toggle('active', currentFilter.duplicatesOnly);
                refreshDisplay();
            });
        }
        
            // Tornar função global para uso no HTML
    window.clearFilters = clearFilters;
    
    // Função de debug para verificar ordenação
    window.debugSorting = function() {
        console.log('🔍 Debug da ordenação atual:');
        console.log('  Filtro atual:', currentFilter);
        console.log('  Total de itens:', inventory.length);
        
        const filtered = applyFilters();
        console.log('  Itens após filtros:', filtered.length);
        
        if (filtered.length > 0) {
            console.log('  Primeiros 5 itens ordenados:');
            filtered.slice(0, 5).forEach((item, index) => {
                const rarityInfo = getRarityInfo(item.rarity);
                console.log(`    ${index + 1}. ${item.name} - ${rarityInfo.name} (ordem: ${rarityInfo.order})`);
            });
        }
    };
    }
    
    function updateSearchFunctionality() {
        const searchInput = document.querySelector('.collection-search');
        if (searchInput) {
            // Atualizar listener de busca
            searchInput.addEventListener('input', (e) => {
                currentFilter.searchQuery = e.target.value.toLowerCase().trim();
                refreshDisplay();
            });
        }
    }

    // === INICIALIZAÇÃO ===
    loadInventory();
    
    // Corrigir inconsistências de raridade
    if (inventory.length > 0) {
        fixRarityInconsistencies();
    }
    
    // Configurar ordenação padrão por raridade
    const sortSelect = document.getElementById('sort-filter');
    if (sortSelect) {
        sortSelect.value = 'rarity';
        currentFilter.sort = 'rarity';
    }
    
    // Renderizar grid inicial
    refreshDisplay();
    handleScroll();
    
    // Configurar funcionalidades
    if (inventory.length > 0) {
        addSearchFunctionality();
    }
    updateSearchFunctionality();
    setupFilterEventListeners();

    // Aguardar o character pool estar pronto para atualizar imagens antigas
    const checkPoolAndUpdate = () => {
        if (window.characterPoolManager && window.characterPoolManager.isInitialized) {
            updateCharacterImages();
            refreshDisplay(); // Re-renderizar com imagens atualizadas
        } else {
            setTimeout(checkPoolAndUpdate, 500);
        }
    };
    checkPoolAndUpdate();

    // Enriquecer dados que faltam (popularidade/quote) direto da AniList
    enrichInventoryMissingInfo().catch(console.error);

    // Garantir que addToInventory crie o campo de busca no primeiro item
    const originalAddToInventory = window.addToInventory;
    window.addToInventory = function(character) {
        const hadItems = inventory.length > 0;
        originalAddToInventory(character);
        if (!hadItems && inventory.length === 1) {
            setTimeout(() => {
                if (!document.querySelector('.collection-search')) {
                    addSearchFunctionality();
                    updateSearchFunctionality();
                }
            }, 100);
        }
    };

    // Escutar mudanças nos favoritos para atualizar a interface
    window.addEventListener('favoritesChanged', () => {
        setTimeout(refreshDisplay, 50);
    });

    console.log('✅ Sistema de coleção simplificado inicializado');
    console.log('📊 Inventário atual:', inventory.length, 'itens');
});
