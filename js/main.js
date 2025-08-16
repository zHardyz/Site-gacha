// Som de revelação
const revealSound = new Audio('audio/reveal.wav');
revealSound.volume = 0.9;

// Função para preservar o funcionamento do menu mobile após manipulações DOM
function preserveMobileMenu() {
    setTimeout(() => {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const navContainer = document.getElementById('nav-container');
        
        if (menuToggle && navContainer) {
            // Verificar se os elementos estão visíveis/acessíveis
            if (window.getComputedStyle(menuToggle).display === 'none' && window.innerWidth <= 480) {
                menuToggle.style.display = 'flex';
            }
            
            // Manter estado ativo se estava ativo antes
            if (menuToggle.classList.contains('active')) {
                navContainer.classList.add('active');
            }
            
            console.log('✅ Menu mobile preservado após summon');
        }
    }, 50);
}

// Função para mostrar loading de 1 segundos
function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const crack = document.querySelector('.loading-crack');

    // Espera o preenchimento da barra (1s) e depois "racha" e remove
    setTimeout(() => {
        crack.style.animation = "crack 0.5s ease-out forwards";
        setTimeout(() => {
            loadingScreen.style.opacity = "0";
            setTimeout(() => loadingScreen.remove(), 100);
        }, 100);
    }, 1000);
}

// Chama o loading ao entrar na página
showLoading();

document.addEventListener('DOMContentLoaded', async () => {
    const carouselContainer = document.getElementById('carousel-container');
    const summonButton = document.getElementById('summon-button');
    const rarityChancesContainer = document.getElementById('rarity-chances');

    // Verificar se elementos existem
    if (!summonButton) {
        console.error('❌ Summon button not found!');
        return;
    }
    
    if (!carouselContainer) {
        console.error('❌ Carousel container not found!');
        return;
    }

    let isInitializing = true;

    // Mostrar indicação de carregamento
    summonButton.disabled = true;
    summonButton.innerHTML = '<span>⏳</span> Carregando Personagens...';
    summonButton.style.opacity = '0.7';

    // Verificar se characterPoolManager existe
    if (!window.characterPoolManager) {
        console.error('❌ CharacterPoolManager not found! Criando nova instância...');
        // Importar e criar nova instância se necessário
        const script = document.createElement('script');
        script.src = 'js/characterPool.js';
        script.onload = async () => {
            await initializeCharacterPool();
        };
        document.head.appendChild(script);
        return;
    }

    await initializeCharacterPool();

    async function initializeCharacterPool() {
        // Inicializar o sistema de pool de personagens
        console.log('🔄 Initializing character pool...');
        
        // Timeout de 30 segundos para inicialização
        const timeout = setTimeout(() => {
            console.warn('⚠️ Inicialização demorou muito, habilitando botão mesmo assim...');
            summonButton.innerHTML = 'Invocar (Modo Offline)';
            summonButton.style.opacity = '1';
            summonButton.disabled = false;
            isInitializing = false;
        }, 30000);
        
        try {
            await window.characterPoolManager.initialize();
            clearTimeout(timeout);
            console.log('✅ Character pool ready!');
            
            // Verificar se foi inicializado corretamente
            if (!window.characterPoolManager.isInitialized) {
                console.warn('⚠️ Pool manager não foi inicializado corretamente');
                summonButton.innerHTML = 'Erro de Inicialização';
                summonButton.style.opacity = '0.7';
                return;
            }
            
            // Verificar se o pool tem personagens
            const poolStats = window.characterPoolManager.getPoolStats();
            const totalChars = Object.values(poolStats).reduce((sum, stat) => sum + stat.count, 0);
            console.log('📊 Total de personagens no pool:', totalChars);
            console.log('📊 Stats detalhados:', poolStats);
            
            if (totalChars === 0) {
                console.warn('⚠️ Pool vazio! Tentando criar fallback...');
                // Tentar criar fallback manualmente
                window.characterPoolManager.createFallbackPool();
                const newStats = window.characterPoolManager.getPoolStats();
                const newTotal = Object.values(newStats).reduce((sum, stat) => sum + stat.count, 0);
                
                if (newTotal === 0) {
                    summonButton.innerHTML = 'Erro - Recarregue a Página';
                    summonButton.style.opacity = '0.7';
                    return;
                }
                console.log('✅ Fallback criado com sucesso! Total:', newTotal);
            }
            
            // Restaurar botão
            summonButton.innerHTML = 'Invocar';
            summonButton.style.opacity = '1';
            summonButton.disabled = false;
            
            isInitializing = false;
        } catch (error) {
            clearTimeout(timeout);
            console.error('❌ Failed to initialize character pool:', error);
            // Tentar fallback em caso de erro
            try {
                window.characterPoolManager.createFallbackPool();
                summonButton.innerHTML = 'Invocar (Modo Offline)';
                summonButton.style.opacity = '1';
                summonButton.disabled = false;
                isInitializing = false;
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
                summonButton.innerHTML = 'Erro - Recarregue a Página';
                summonButton.style.opacity = '0.5';
            }
        }
    }

    function populateRarityChances() {
        const rarityList = document.createElement('ul');
        
        // Usar as novas porcentagens do character pool manager
        const poolStats = window.characterPoolManager.getPoolStats();
        
        for (const [rarity, stats] of Object.entries(poolStats)) {
            const rarityInfo = getRarityInfo(rarity);
            const listItem = document.createElement('li');
            listItem.innerHTML = `${rarityInfo.name}: <span style="color: ${rarityInfo.color}">${stats.percentage}%</span>`;
            rarityList.appendChild(listItem);
        }
        rarityChancesContainer.appendChild(rarityList);
    }

    function animateInfoPanel() {
        gsap.to(rarityChancesContainer, {
            y: -10,
            duration: 2,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true
        });
    }

    function getStars(popularity) {
        if (popularity > 50000) return 5;
        if (popularity > 30000) return 4;
        if (popularity > 15000) return 3;
        if (popularity > 5000) return 2;
        if (popularity > 1000) return 1;
        return 0;
    }

    function createCarousel() {
        carouselContainer.innerHTML = '';
        const carousel = document.createElement('div');
        carousel.className = 'carousel';
        
        // Criar cards genéricos para o carrossel
        for (let i = 0; i < 5; i++) {
            const card = document.createElement('div');
            card.className = 'carousel-card';
            card.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">?</div>';
            carousel.appendChild(card);
        }
        carouselContainer.appendChild(carousel);
    }

    function spinCarousel() {
        if (isInitializing) {
            console.log("Ainda inicializando banco de personagens...");
            return;
        }
        
        // Verificar se characterPoolManager existe e está inicializado
        if (!window.characterPoolManager) {
            console.error("CharacterPoolManager não encontrado!");
            return;
        }
        
        if (!window.characterPoolManager.isInitialized) {
            console.log("Character pool ainda não foi inicializado...");
            return;
        }
        
        // Verificar se ainda tem spins disponíveis ANTES de iniciar
        if (window.canSpin && !window.canSpin()) {
            console.log("Sem invocações restantes!");
            return;
        }

        // Tocar som de summon
        const summonSound = new Audio('audio/summon.mp3'); 
        summonSound.volume = 0.8;
        summonSound.currentTime = 0;
        summonSound.play().catch(err => console.log("Som bloqueado pelo navegador:", err));

        summonButton.disabled = true;

        // Usar o novo sistema de summon
        const winningCharacter = window.characterPoolManager.performSummon();
        if (!winningCharacter) {
            console.error("❌ Falha ao invocar personagem!");
            summonButton.disabled = false;
            return;
        }
        
        console.log(`Você obteve: ${winningCharacter.name} (${winningCharacter.rarity})`);

        // Adicionar stars baseado na popularidade
        winningCharacter.stars = getStars(winningCharacter.popularity);

        const cards = document.querySelectorAll('.carousel-card');
        const revealCard = cards[Math.floor(cards.length / 2)];

        const tl = gsap.timeline();
        tl.to(cards, {
            x: () => `random(-200, 200)px`, // Valores em pixels mais controlados
            y: () => `random(-150, 150)px`, // Valores em pixels mais controlados
            rotation: () => `random(-360, 360)`,
            duration: 1.5,
            stagger: 0.02,
            ease: 'power2.inOut',
            onComplete: () => {
                revealCharacter(winningCharacter, revealCard);
                saveToStock(winningCharacter);
                
                        // Consumir o spin e atualizar UI
        if (window.handleSpin) {
            window.handleSpin();
        }
        
        // Garantir que o menu mobile continue funcionando após o summon
        preserveMobileMenu();
                
                // Verificar se ainda tem spins após este spin
                if (window.canSpin && window.canSpin()) {
                    summonButton.disabled = false;
                } else {
                    summonButton.disabled = true;
                    summonButton.style.opacity = '0.5';
                    summonButton.style.cursor = 'not-allowed';
                    summonButton.textContent = 'Sem Invocações';
                }
            }
        });
    }



    function revealCharacter(character, cardElement) {
        const rarityInfo = getRarityInfo(character.rarity);
        const glowColor = rarityInfo.color; // Usar cor sólida para o glow principal
        
        // Tocar som de revelação no momento exato da revelação
        revealSound.currentTime = 0;
        revealSound.play().catch(err => console.log("Som de revelação bloqueado pelo navegador:", err));
        
        cardElement.innerHTML = `<img src="${character.image}" alt="${character.name}" onerror="this.src='https://via.placeholder.com/280x400/1a1a2e/a33bff?text=Sem+Imagem'">`;
        gsap.set(cardElement, { x: 0, y: 0, rotation: 0, scale: 1.5, zIndex: 100 });

        const tl = gsap.timeline();
        tl.to(cardElement, { scale: 1, duration: 0.5, ease: 'back.out(1.7)' })
          .to(cardElement, {
              boxShadow: `0 0 30px 10px ${glowColor}70, 0 0 60px 25px ${glowColor}40, 0 0 90px 35px ${glowColor}20`,
              duration: 0.8,
              ease: 'power2.inOut',
              yoyo: true,
              repeat: 3
          }, "-=.2")
          .call(() => {
              // Criar e mostrar animação do nome
              showCharacterNameAnimation(character, rarityInfo, cardElement);
          }, null, "-=1.5");

        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            carouselContainer.appendChild(particle);
            gsap.fromTo(particle, {
                x: '50%',
                y: '50%',
                scale: `random(0.5, 1)`,
                backgroundColor: rarityInfo.color
            }, {
                x: `random(-150, 150)px`, // Reduzido para ficar dentro do container
                y: `random(-150, 150)px`, // Reduzido para ficar dentro do container
                opacity: 0,
                duration: `random(1, 2)`,
                ease: 'power2.out',
                onComplete: () => particle.remove()
            });
        }

        console.log(`Você obteve: ${character.name} (${character.rarity})`);
    }

    function showCharacterNameAnimation(character, rarityInfo, cardElement) {
        // Remover animação anterior se existir
        const existingAnimation = document.querySelector('.character-name-reveal');
        if (existingAnimation) {
            existingAnimation.remove();
        }

        // Obter posição do card
        const cardRect = cardElement.getBoundingClientRect();
        
        // Criar container da animação menor e mais discreto
        const nameContainer = document.createElement('div');
        nameContainer.className = 'character-name-reveal';
        nameContainer.innerHTML = `
            <div class="name-content-compact">
                <div class="name-rarity-compact" style="color: ${rarityInfo.color}">
                    ${rarityInfo.name || character.rarity}
                </div>
                <div class="name-text-compact">
                    ${character.name}
                </div>
            </div>
        `;

        document.body.appendChild(nameContainer);

        // Posicionar no canto superior direito do card
        gsap.set(nameContainer, {
            position: 'fixed',
            top: cardRect.top - 10,
            right: window.innerWidth - cardRect.right + 10,
            zIndex: 10001
        });

        // Animação rápida e discreta
        const nameTimeline = gsap.timeline();
        
        nameTimeline
            .set(nameContainer, { 
                opacity: 0,
                scale: 0.5,
                x: 20,
                y: -10
            })
            .to(nameContainer, {
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
                duration: 0.3,
                ease: 'back.out(1.4)'
            })
            .to(nameContainer, {
                opacity: 0,
                scale: 0.8,
                x: 10,
                y: -5,
                duration: 0.2,
                ease: 'power2.in',
                delay: 1.2
            })
            .call(() => {
                nameContainer.remove();
            });

        // Guardar referência para remoção rápida
        window.currentNameAnimation = nameContainer;
    }

    function saveToStock(character) {
        // Log detalhado do personagem recebido
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📥 saveToStock recebeu:', {
                name: character.name,
                rarity: character.rarity,
                popularity: character.popularity,
                poolRarity: character.poolRarity,
                summonedFrom: character.summonedFrom,
                originalRarity: character.originalRarity
            });
        }
        
        const inventoryKey = 'gacha.inventory.v1';
        let inventory = [];
        try {
            const stored = localStorage.getItem(inventoryKey);
            inventory = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load inventory:", e);
            inventory = [];
        }

        // Usar uma identificação mais robusta para evitar problemas de agrupamento
        const normalizeString = (str) => {
            return str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '';
        };
        
        const characterName = normalizeString(character.name);
        const characterAnime = normalizeString(character.anime);
        
        const existing = inventory.find(c => {
            const existingName = normalizeString(c.name);
            const existingAnime = normalizeString(c.anime);
            return existingName === characterName && existingAnime === characterAnime;
        });
        
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
            // Atualizar a raridade para a mais recente (sorteada)
            existing.rarity = character.rarity;
            // Atualizar outros dados se necessário
            if (character.popularity) existing.popularity = character.popularity;
            if (character.stars) existing.stars = character.stars;
            
            // Log apenas em desenvolvimento
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log(`✅ Personagem repetido agrupado: ${character.name} (Quantidade: ${existing.quantity}) - Raridade: ${existing.rarity}`);
            }
        } else {
            character.quantity = 1;
            inventory.push(character);
            
            // Log apenas em desenvolvimento  
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log(`📦 Novo personagem adicionado: ${character.name} - Raridade: ${character.rarity}`);
            }
        }

        try {
            localStorage.setItem(inventoryKey, JSON.stringify(inventory));
        } catch (e) {
            console.error("Failed to save inventory:", e);
        }
    }

    // Adicionar eventos para desktop e mobile
    summonButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Evitar que o evento bublem e interfira com outros listeners
        spinCarousel();
    });
    
    summonButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Evitar que o evento bublem e interfira com outros listeners
        spinCarousel();
    });
    
    // Prevenir zoom em double tap no iOS
    summonButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Evitar que o evento bublem e interfira com outros listeners
    });
    
    // Debug removido - sistema funcionando corretamente
    
    // Inicializar UI
    createCarousel();
    populateRarityChances();
    animateInfoPanel();
});

// Sistema de som integrado - movido para dentro do evento principal
