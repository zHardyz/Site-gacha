// Som de revelação
const revealSound = new Audio('audio/reveal.mp3');
revealSound.volume = 0.9;

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

    let isInitializing = true;

    // Mostrar indicação de carregamento
    summonButton.disabled = true;
    summonButton.textContent = 'Carregando Personagens...';
    summonButton.style.opacity = '0.7';

    // Inicializar o sistema de pool de personagens
    console.log('🔄 Initializing character pool...');
    try {
        await window.characterPoolManager.initialize();
        console.log('✅ Character pool ready!');
        
        // Restaurar botão
        summonButton.textContent = 'Invocar';
        summonButton.style.opacity = '1';
        summonButton.disabled = false;
        
        isInitializing = false;
    } catch (error) {
        console.error('❌ Failed to initialize character pool:', error);
        summonButton.textContent = 'Erro - Recarregue a Página';
        summonButton.style.opacity = '0.5';
    }

    function populateRarityChances() {
        const rarityList = document.createElement('ul');
        
        // Usar as novas porcentagens do character pool manager
        const poolStats = window.characterPoolManager.getPoolStats();
        
        for (const [rarity, stats] of Object.entries(poolStats)) {
            const rarityInfo = rarities[rarity] || { color: '#ffffff' };
            const listItem = document.createElement('li');
            const rarityName = rarityInfo.name || rarity;
            listItem.innerHTML = `${rarityName}: <span style="color: ${rarityInfo.color}">${stats.percentage}%</span>`;
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
        
        // Verificar se ainda tem spins disponíveis ANTES de iniciar
        if (window.canSpin && !window.canSpin()) {
            console.log("Sem invocações restantes!");
            return;
        }

        summonButton.disabled = true;

        // Usar o novo sistema de summon
        const winningCharacter = window.characterPoolManager.performSummon();
        if (!winningCharacter) {
            console.error("Failed to summon character!");
            summonButton.disabled = false;
            return;
        }

        // Adicionar stars baseado na popularidade
        winningCharacter.stars = getStars(winningCharacter.popularity);

        const cards = document.querySelectorAll('.carousel-card');
        const revealCard = cards[Math.floor(cards.length / 2)];

        const tl = gsap.timeline();
        tl.to(cards, {
            x: () => `random(-1000, 1000)%`,
            y: () => `random(-500, 500)%`,
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
        const rarityInfo = rarities[character.rarity] || rarities['Common'];
        const glowColor = rarityInfo.glow;
        
        cardElement.innerHTML = `<img src="${character.image}" alt="${character.name}">`;
        gsap.set(cardElement, { x: 0, y: 0, rotation: 0, scale: 1.5, zIndex: 100 });

        const tl = gsap.timeline();
        tl.to(cardElement, { scale: 1, duration: 0.5, ease: 'back.out(1.7)' })
          .to(cardElement, {
              boxShadow: `0 0 35px 15px ${glowColor}, 0 0 50px 20px ${rarityInfo.color}`,
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
                backgroundColor: glowColor
            }, {
                x: `random(-300, 300)px`,
                y: `random(-300, 300)px`,
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
                    ${character.rarity}
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
        const inventoryKey = 'gacha.inventory.v1';
        let inventory = [];
        try {
            const stored = localStorage.getItem(inventoryKey);
            inventory = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load inventory:", e);
            inventory = [];
        }

        const existing = inventory.find(c => c.name === character.name && c.anime === character.anime);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            character.quantity = 1;
            inventory.push(character);
        }

        try {
            localStorage.setItem(inventoryKey, JSON.stringify(inventory));
        } catch (e) {
            console.error("Failed to save inventory:", e);
        }
    }

    summonButton.addEventListener('click', spinCarousel);
    
    // Inicializar UI
    createCarousel();
    populateRarityChances();
    animateInfoPanel();
});
// Carregar som
const summonSound = new Audio('audio/summon.mp3'); 
summonSound.volume = 0.8; // Volume de 0 a 1

// Achar botão
const summonButton = document.getElementById('summon-button');

// Evento de clique
summonButton.addEventListener('click', () => {
    summonSound.currentTime = 0; // Reinicia caso clique rápido
    summonSound.play().catch(err => console.log("Som bloqueado pelo navegador:", err));

    // Aqui continua sua lógica original de summon...
});
