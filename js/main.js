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

    const ANILIST_API_URL = 'https://graphql.anilist.co';
    const ANILIST_TOKEN = ""; // Insira aqui seu token OAuth quando necessário

    let fetchedCharacters = new Set();

    // Função para normalizar raridade para o padrão do stock.js
    function normalizeRarity(rarity) {
        const map = {
            'Comum': 'Common',
            'Incomum': 'Rare', // ajuste conforme sua lógica real
            'Raro': 'Rare',
            'Épico': 'Epic',
            'Lendário': 'Legendary',
            'Mítico': 'Mythic',
            'Especial': 'Special'
        };
        return map[rarity] || rarity;
    }

    function populateRarityChances() {
        const rarityList = document.createElement('ul');
        for (const rarity in rarities) {
            const percentage = (rarities[rarity].dropRate * 100).toFixed(1);
            const listItem = document.createElement('li');
            // Aqui mostramos o nome em inglês ou traduzido como quiser
            listItem.innerHTML = `${rarity}: <span style="color: ${rarities[rarity].color}">${percentage}%</span>`;
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

    async function fetchCharacters(page = 1, perPage = 50) {
        const query = `
            query ($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    characters(sort: FAVOURITES_DESC) {
                        id
                        name { full }
                        image { large }
                        popularity: favourites
                        media { nodes { title { romaji } } }
                    }
                }
            }
        `;
        const variables = { page, perPage };
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (ANILIST_TOKEN) {
            headers['Authorization'] = `Bearer ${ANILIST_TOKEN}`;
        }
        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query, variables })
            });
            const data = await response.json();
            return data.data.Page.characters;
        } catch (error) {
            console.error('Error fetching characters:', error);
            return [];
        }
    }

    function getRarity(popularity) {
        if (popularity > 50000) return 'Special';
        if (popularity > 30000) return 'Mythic';
        if (popularity > 20000) return 'Legendary';
        if (popularity > 5000) return 'Rare';
        if (popularity > 1000) return 'Common'; // Pode ajustar se quiser subdividir
        return 'Common';
    }

    function getStars(popularity) {
        if (popularity > 50000) return 5;
        if (popularity > 30000) return 4;
        if (popularity > 15000) return 3;
        if (popularity > 5000) return 2;
        if (popularity > 1000) return 1;
        return 0;
    }

    async function loadInitialCharacters() {
        let characters = [];
        let page = 1;
        while (characters.length < 100) {
            const fetched = await fetchCharacters(page);
            if (fetched.length === 0) break;
            fetched.forEach(char => {
                if (!fetchedCharacters.has(char.id)) {
                    fetchedCharacters.add(char.id);
                    characters.push({
                        id: char.id,
                        name: char.name.full,
                        image: char.image.large,
                        rarity: getRarity(char.popularity),
                        popularity: char.popularity,
                        stars: getStars(char.popularity),
                        anime: char.media.nodes[0]?.title?.romaji || 'Unknown'
                    });
                }
            });
            page++;
        }
        bannerCharacters = characters.slice(0, 100);
        createCarousel();
    }

    function createCarousel() {
        carouselContainer.innerHTML = '';
        const carousel = document.createElement('div');
        carousel.className = 'carousel';
        bannerCharacters.forEach(() => {
            const card = document.createElement('div');
            card.className = 'carousel-card';
            carousel.appendChild(card);
        });
        carouselContainer.appendChild(carousel);
    }

    function spinCarousel() {
        if (bannerCharacters.length === 0) return;
        summonButton.disabled = true;

        const winningCharacter = selectCharacter();
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
                if (window.handleSpin) window.handleSpin();
                summonButton.disabled = false;
            }
        });
    }

    function selectCharacter() {
        const randomNumber = Math.random();
        let cumulativeProbability = 0;
        for (const rarity in rarities) {
            cumulativeProbability += rarities[rarity].dropRate;
            if (randomNumber <= cumulativeProbability) {
                const charactersOfRarity = bannerCharacters.filter(c => c.rarity === rarity);
                if (charactersOfRarity.length > 0) {
                    return charactersOfRarity[Math.floor(Math.random() * charactersOfRarity.length)];
                }
            }
        }
        return bannerCharacters[Math.floor(Math.random() * bannerCharacters.length)];
    }

    function revealCharacter(character, cardElement) {
        const rarityKey = normalizeRarity(character.rarity);
        const rarityInfo = rarities[rarityKey] || rarities['Common'];
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
          }, "-=.2");

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

        console.log(`You got: ${character.name} (${character.rarity})`);
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
    

    populateRarityChances();
    animateInfoPanel();
    loadInitialCharacters();
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
