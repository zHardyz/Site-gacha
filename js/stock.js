document.addEventListener('DOMContentLoaded', () => {
    const DOM = {
        grid: document.querySelector('.stock-grid'),
        emptyState: document.querySelector('.empty-state'),
        totalCards: document.getElementById('total-cards'),
        uniqueCards: document.getElementById('unique-cards'),
    };

    // === AniList ===
    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const ANILIST_TOKEN = ""; // OPCIONAL. Se adicionar OAuth, coloque aqui: 'Bearer <token>'

    const RARITIES = {
        'Common':    { order: 1, color: '#8a8f98', emoji: '⚪' },
        'Rare':      { order: 2, color: '#3b82f6', emoji: '🔵' },
        'Epic':      { order: 3, color: '#a855f7', emoji: '🟣' },
        'Legendary': { order: 4, color: '#f59e0b', emoji: '🟡' },
        'Mythic':    { order: 5, color: '#ef4444', emoji: '🔴' },
        'Special':   { order: 6, color: '#22d3ee', emoji: '✨' },
    };

    let inventory = [];

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
                    if (typeof extra.favourites === 'number') current.popularity = extra.favourites;
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

    function createCard(char, index) {
        normalizeRarityLabel(char);
        const card = document.createElement('div');
        card.className = `stock-card rarity-${char.rarity}`;
        card.tabIndex = 0;
        card.style.animationDelay = `${index * 0.05}s`;

        const rarity = RARITIES[char.rarity] || RARITIES['Common'];
        let quantityBadge = '';
        if (char.quantity > 1) quantityBadge = `<div class="card-quantity">×${char.quantity}</div>`;

        const popularityText = typeof char.popularity === 'number'
            ? char.popularity.toLocaleString('en-US')
            : '—';

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${char.image}" 
                     alt="${char.name}" 
                     class="card-image" 
                     loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/280x392/1a1b23/6366f1?text=No+Image'">
                <div class="card-rarity-glow"></div>
                ${quantityBadge}
            </div>
            <div class="card-info">
                <h3 class="card-name">${char.name}</h3>
                <p class="card-anime">${char.anime || ''}</p>

                <div class="card-meta">
                    <div class="card-popularity" title="AniList favourites">
                        <span class="pop-emoji">🔥</span>
                        <span>${popularityText}</span>
                    </div>
                    <div class="card-rarity rarity-${char.rarity}" style="background: linear-gradient(135deg, ${rarity.color}, ${rarity.color}99) !important; border: 2px solid ${rarity.color} !important;">
                        <span style="color: ${rarity.color};">${rarity.emoji}</span>
                        <span>${char.rarity}</span>
                    </div>
                </div>

                ${char.quote ? `<div class="card-quote">${char.quote}</div>` : ''}
            </div>
        `;

        const cardRarityElement = card.querySelector('.card-rarity');
        if (cardRarityElement) {
            cardRarityElement.style.setProperty('background', `linear-gradient(135deg, ${rarity.color}, ${rarity.color}99)`, 'important');
            cardRarityElement.style.setProperty('border', `2px solid ${rarity.color}`, 'important');
            cardRarityElement.style.setProperty('color', '#ffffff', 'important');
            const emojiSpan = cardRarityElement.querySelector('span:first-child');
            if (emojiSpan) emojiSpan.style.setProperty('color', '#ffffff', 'important');
        }
        card.style.setProperty('border-color', rarity.color, 'important');

        card.addEventListener('mouseenter', () => {
            if (!card.classList.contains('clicking')) {
                card.style.transform = 'translateY(-10px) scale(1.02)';
                card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        });
        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('clicking')) {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        });
        card.addEventListener('click', (e) => {
            e.preventDefault();
            card.classList.add('clicking');
            card.style.transform = 'translateY(-5px) scale(0.98)';
            card.style.transition = 'transform 0.1s ease';
            setTimeout(() => {
                card.classList.remove('clicking');
                card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                if (card.matches(':hover')) card.style.transform = 'translateY(-10px) scale(1.02)';
                else card.style.transform = 'translateY(0) scale(1)';
            }, 150);
            showCardInteraction(char);
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
        feedback.textContent = `Viewing ${character.name}`;
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

    function renderGrid(items) {
        if (items.length === 0) {
            DOM.grid.style.display = 'none';
            DOM.emptyState.style.display = 'block';
            return;
        }
        DOM.grid.style.display = 'grid';
        DOM.emptyState.style.display = 'none';

        items.sort((a, b) => {
            const rarityOrderA = RARITIES[a.rarity]?.order ?? 99;
            const rarityOrderB = RARITIES[b.rarity]?.order ?? 99;
            if (rarityOrderA !== rarityOrderB) return rarityOrderB - rarityOrderA;
            return a.name.localeCompare(b.name);
        });

        const fragment = document.createDocumentFragment();
        items.forEach((item, index) => fragment.appendChild(createCard(item, index)));

        DOM.grid.innerHTML = '';
        DOM.grid.appendChild(fragment);

        if (typeof gsap !== 'undefined') {
            gsap.from('.stock-card', { duration: 0.6, y: 50, opacity: 0, stagger: 0.05, ease: 'power2.out' });
        }
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
        renderGrid(inventory);
        showToast(`Added ${character.name} to your collection!`);
    };

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-family: 'Inter', sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 300);
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
        searchInput.placeholder = 'Search your collection...';
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

    // boot
    loadInventory();
    renderGrid(inventory);
    handleScroll();
    if (inventory.length > 0) addSearchFunctionality();

    // NEW: enriquecer dados que faltam (popularidade/quote) direto da AniList
    enrichInventoryMissingInfo().catch(console.error);

    console.log('Stock system initialized');
    console.log('Current inventory:', inventory);
    console.log('RARITIES config:', RARITIES);

    // garante que addToInventory continue criando o campo de busca no 1º item
    const originalAddToInventory = window.addToInventory;
    window.addToInventory = function(character) {
        const hadItems = inventory.length > 0;
        originalAddToInventory(character);
        if (!hadItems && inventory.length === 1) {
            setTimeout(() => {
                if (!document.querySelector('.collection-search')) addSearchFunctionality();
            }, 100);
        }
    };
});
