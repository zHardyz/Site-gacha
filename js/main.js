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
        // Mostrar tela de loading de personagens
        const characterLoadingScreen = document.getElementById('character-loading-screen');
        const progressFill = document.querySelector('.loading-progress-fill');
        const progressText = document.querySelector('.loading-progress-text');
        const loadedCharacters = document.getElementById('loaded-characters');
        const estimatedTime = document.getElementById('estimated-time');
        
        if (characterLoadingScreen) {
            characterLoadingScreen.classList.add('active');
        }
        
        // Sistema de progresso melhorado com animação contínua
        let currentProgress = 0;
        let targetProgress = 0;
        let isAnimating = false;
        let animationInterval;
        
        // Função para animar progresso suavemente
        const animateProgress = () => {
            if (currentProgress < targetProgress) {
                currentProgress += 0.5; // Incremento suave
                if (progressFill) {
                    progressFill.style.width = `${currentProgress}%`;
                    progressFill.classList.add('loading'); // Adicionar classe de loading
                }
                if (progressText) progressText.textContent = `${Math.round(currentProgress)}%`;
            } else if (currentProgress > targetProgress) {
                currentProgress = targetProgress;
                if (progressFill) {
                    progressFill.style.width = `${currentProgress}%`;
                    progressFill.classList.remove('loading'); // Remover classe de loading
                }
                if (progressText) progressText.textContent = `${Math.round(currentProgress)}%`;
            }
        };
        
        // Iniciar animação contínua
        const startProgressAnimation = () => {
            if (!isAnimating) {
                isAnimating = true;
                animationInterval = setInterval(animateProgress, 50); // 20 FPS
            }
        };
        
        // Parar animação
        const stopProgressAnimation = () => {
            if (isAnimating) {
                isAnimating = false;
                clearInterval(animationInterval);
            }
        };
        
        // Função para mostrar erro na barra
        const showProgressError = () => {
            if (progressFill) {
                progressFill.classList.remove('loading');
                progressFill.classList.add('error');
            }
            
            // Mostrar mensagem de erro
            const errorMessage = document.getElementById('loading-error');
            if (errorMessage) {
                errorMessage.style.display = 'flex';
            }
        };
        
        // Função para atualizar progresso com animação
        const updateProgress = (percent, step, characters = 0) => {
            targetProgress = percent;
            if (loadedCharacters) loadedCharacters.textContent = characters;
            
            // Atualizar step ativo
            const steps = document.querySelectorAll('.loading-step');
            steps.forEach(s => {
                s.classList.remove('active', 'completed');
            });
            
            const currentStep = document.querySelector(`[data-step="${step}"]`);
            if (currentStep) {
                currentStep.classList.add('active');
            }
            
            // Marcar steps anteriores como completados
            const stepOrder = ['cache', 'api', 'fetch', 'process', 'ready'];
            const currentIndex = stepOrder.indexOf(step);
            for (let i = 0; i < currentIndex; i++) {
                const completedStep = document.querySelector(`[data-step="${stepOrder[i]}"]`);
                if (completedStep) {
                    completedStep.classList.add('completed');
                }
            }
        };
        
        // Iniciar animação
        startProgressAnimation();
        
        // Inicializar o sistema de pool de personagens
        console.log('🔄 Initializing character pool...');
        updateProgress(10, 'cache');
        
        // Progresso contínuo durante carregamento
        let continuousProgress = 10;
        const continuousProgressInterval = setInterval(() => {
            if (continuousProgress < 85) { // Parar em 85% até confirmar sucesso
                continuousProgress += 0.3; // Progresso muito lento
                updateProgress(continuousProgress, 'fetch');
            }
        }, 200); // A cada 200ms
        
        // Timeout de 30 segundos para inicialização
        const timeout = setTimeout(() => {
            console.warn('⚠️ Inicialização demorou muito, habilitando botão mesmo assim...');
            clearInterval(continuousProgressInterval);
            updateProgress(90, 'ready'); // Parar em 90% em caso de erro
            setTimeout(() => {
                stopProgressAnimation();
                if (characterLoadingScreen) characterLoadingScreen.classList.remove('active');
                summonButton.innerHTML = 'Invocar (Modo Offline)';
                summonButton.style.opacity = '1';
                summonButton.disabled = false;
                isInitializing = false;
            }, 1000);
        }, 30000);
        
        try {
            updateProgress(20, 'api');
            await new Promise(resolve => setTimeout(resolve, 800)); // Delay um pouco maior
            
            updateProgress(30, 'fetch');
            await window.characterPoolManager.initialize((message, percent) => {
                // Mapear percentuais do pool para o progresso geral
                const mappedPercent = 30 + (percent * 0.4); // 30% a 70%
                updateProgress(mappedPercent, 'fetch');
                
                // Atualizar texto do step se necessário
                const fetchStep = document.querySelector('[data-step="fetch"] .step-text');
                if (fetchStep) {
                    fetchStep.textContent = message;
                }
            });
            
            clearInterval(continuousProgressInterval);
            updateProgress(80, 'process');
            clearTimeout(timeout);
            console.log('✅ Character pool ready!');
            
            // Verificar se foi inicializado corretamente
            if (!window.characterPoolManager.isInitialized) {
                console.warn('⚠️ Pool manager não foi inicializado corretamente');
                clearInterval(continuousProgressInterval);
                updateProgress(90, 'ready'); // Parar em 90% em caso de erro
                setTimeout(() => {
                    stopProgressAnimation();
                    if (characterLoadingScreen) characterLoadingScreen.classList.remove('active');
                    summonButton.innerHTML = 'Erro de Inicialização';
                    summonButton.style.opacity = '0.7';
                }, 1000);
                return;
            }
            
            // Verificar se o pool tem personagens
            const poolStats = window.characterPoolManager.getPoolStats();
            const totalChars = Object.values(poolStats).reduce((sum, stat) => sum + stat.count, 0);
            console.log('📊 Total de personagens no pool:', totalChars);
            console.log('📊 Stats detalhados:', poolStats);
            
            updateProgress(85, 'process', totalChars);
            
            if (totalChars === 0) {
                console.warn('⚠️ Pool vazio! Tentando criar fallback...');
                // Tentar criar fallback manualmente
                window.characterPoolManager.createFallbackPool();
                const newStats = window.characterPoolManager.getPoolStats();
                const newTotal = Object.values(newStats).reduce((sum, stat) => sum + stat.count, 0);
                
                if (newTotal === 0) {
                    clearInterval(continuousProgressInterval);
                    updateProgress(90, 'ready'); // Parar em 90% em caso de erro
                    showProgressError(); // Mostrar erro na barra
                    setTimeout(() => {
                        stopProgressAnimation();
                        if (characterLoadingScreen) characterLoadingScreen.classList.remove('active');
                        summonButton.innerHTML = 'Erro - Recarregue a Página';
                        summonButton.style.opacity = '0.7';
                    }, 1000);
                    return;
                }
                console.log('✅ Fallback criado com sucesso! Total:', newTotal);
                updateProgress(90, 'process', newTotal);
            }
            
            // Finalizar carregamento com sucesso
            clearInterval(continuousProgressInterval);
            updateProgress(100, 'ready', totalChars);
            setTimeout(() => {
                stopProgressAnimation();
                if (characterLoadingScreen) characterLoadingScreen.classList.remove('active');
                summonButton.innerHTML = 'Invocar';
                summonButton.style.opacity = '1';
                summonButton.disabled = false;
                isInitializing = false;
            }, 1000);
            
        } catch (error) {
            clearTimeout(timeout);
            clearInterval(continuousProgressInterval);
            console.error('❌ Failed to initialize character pool:', error);
            // Tentar fallback em caso de erro
            try {
                updateProgress(85, 'process');
                window.characterPoolManager.createFallbackPool();
                updateProgress(100, 'ready');
                setTimeout(() => {
                    stopProgressAnimation();
                    if (characterLoadingScreen) characterLoadingScreen.classList.remove('active');
                    summonButton.innerHTML = 'Invocar (Modo Offline)';
                    summonButton.style.opacity = '1';
                    summonButton.disabled = false;
                    isInitializing = false;
                }, 1000);
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
                updateProgress(90, 'ready'); // Parar em 90% em caso de erro
                showProgressError(); // Mostrar erro na barra
                setTimeout(() => {
                    stopProgressAnimation();
                    if (characterLoadingScreen) characterLoadingScreen.classList.remove('active');
                    summonButton.innerHTML = 'Erro - Recarregue a Página';
                    summonButton.style.opacity = '0.5';
                }, 1000);
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
        
        // Primeiro, fazer a carta atual sair de visão (deslizar para a direita)
        const tl = gsap.timeline();
        
        // Fase 1: Carta atual sai de visão
        tl.to(cardElement, {
            x: 280, // Deslizar para fora da tela pela direita
            scale: 0.8,
            opacity: 0,
            duration: 0.4,
            ease: 'power2.in'
        })
        // Fase 2: Configurar nova carta e fazer ela entrar
        .call(() => {
            // Configurar o card com a imagem do personagem
            cardElement.innerHTML = `<img src="${character.image}" alt="${character.name}" onerror="this.src='https://via.placeholder.com/280x400/1a1a2e/a33bff?text=Sem+Imagem'">`;
            
            // Adicionar classe para animação CSS
            cardElement.classList.add('revealing');
            
            // Configuração inicial - nova carta começa deslizada para a esquerda
            gsap.set(cardElement, { 
                x: -280, // Deslizar para fora da tela pela esquerda
                y: 0, 
                rotation: 0, // Sem rotação
                scale: 0.8, 
                opacity: 0,
                zIndex: 100 
            });
        })
        // Fase 3: Nova carta entra de visão
        .to(cardElement, { 
            x: 0, // Deslizar para o centro
            scale: 1,
            opacity: 1,
            duration: 0.6, 
            ease: 'power2.out' 
        })
        // Efeito de glow com a cor da raridade
        .to(cardElement, {
            boxShadow: `0 0 30px 10px ${glowColor}70, 0 0 60px 25px ${glowColor}40, 0 0 90px 35px ${glowColor}20`,
            duration: 0.6,
            ease: 'power2.inOut',
            yoyo: true,
            repeat: 2
        }, "-=.3")
        // Mostrar animação do nome
        .call(() => {
            showCharacterNameAnimation(character, rarityInfo, cardElement);
        }, null, "-=1.0")
        // Remover classe de animação após completar
        .call(() => {
            cardElement.classList.remove('revealing');
        });

        // Criar partículas de efeito
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
                x: `random(-150, 150)px`,
                y: `random(-150, 150)px`,
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

        // Animação MAIS RÁPIDA - reduzida de 0.3s para 0.15s e delay de 1.2s para 0.8s
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
                duration: 0.15, // Reduzido de 0.3s para 0.15s
                ease: 'back.out(1.4)'
            })
            .to(nameContainer, {
                opacity: 0,
                scale: 0.8,
                x: 10,
                y: -5,
                duration: 0.15, // Reduzido de 0.2s para 0.15s
                ease: 'power2.in',
                delay: 0.8 // Reduzido de 1.2s para 0.8s
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
