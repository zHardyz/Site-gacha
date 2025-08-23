// Integração do sistema de Collections com a página de Stock
class CollectionsIntegration {
    constructor() {
        this.collections = [];
        this.currentCharacter = null;
        this.setupEventListeners();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Escutar mudanças nas collections
        window.addEventListener('collectionsChanged', () => {
            this.collections = window.collectionsSystem.listCollections();
            this.updateCollectionButtons();
        });

        // Carregar collections iniciais
        if (window.collectionsSystem) {
            this.collections = window.collectionsSystem.listCollections();
        }
    }

    // Atualizar botões de collection nos cards de personagem
    updateCollectionButtons() {
        const characterCards = document.querySelectorAll('.character-card');
        characterCards.forEach(card => {
            this.addCollectionButtons(card);
        });
    }

    // Adicionar botões de collection a um card de personagem
    addCollectionButtons(characterCard) {
        // Remover botões existentes
        const existingButtons = characterCard.querySelectorAll('.collection-buttons');
        existingButtons.forEach(btn => btn.remove());

        // Obter dados do personagem
        const characterName = characterCard.querySelector('.character-name')?.textContent;
        const characterAnime = characterCard.querySelector('.character-anime')?.textContent;
        
        if (!characterName || !characterAnime) return;

        // Verificar se o personagem está no inventário
        const inventory = JSON.parse(localStorage.getItem('gacha.inventory.v1') || '[]');
        const characterInInventory = inventory.find(char => 
            char.name === characterName && char.anime === characterAnime
        );

        if (!characterInInventory) return;

        // Criar container de botões
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'collection-buttons';
        buttonsContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 5px;
            z-index: 10;
        `;

        // Adicionar botão de menu de collections
        const menuButton = document.createElement('button');
        menuButton.className = 'collection-menu-btn';
        menuButton.innerHTML = '🗂️';
        menuButton.title = 'Adicionar às Collections';
        menuButton.style.cssText = `
            background: rgba(99, 102, 241, 0.9);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        `;

        menuButton.addEventListener('mouseenter', () => {
            menuButton.style.transform = 'scale(1.1)';
            menuButton.style.background = 'rgba(99, 102, 241, 1)';
        });

        menuButton.addEventListener('mouseleave', () => {
            menuButton.style.transform = 'scale(1)';
            menuButton.style.background = 'rgba(99, 102, 241, 0.9)';
        });

        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCollectionMenu(characterCard, characterInInventory);
        });

        buttonsContainer.appendChild(menuButton);
        characterCard.appendChild(buttonsContainer);

        // Tornar o card relativo para posicionamento absoluto dos botões
        characterCard.style.position = 'relative';
    }

    // Mostrar menu de collections
    showCollectionMenu(characterCard, character) {
        // Remover menu existente
        const existingMenu = document.querySelector('.collection-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Criar menu
        const menu = document.createElement('div');
        menu.className = 'collection-menu';
        menu.style.cssText = `
            position: absolute;
            top: 50px;
            right: 10px;
            background: rgba(30, 30, 50, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1rem;
            min-width: 200px;
            backdrop-filter: blur(10px);
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        // Título do menu
        const title = document.createElement('h4');
        title.textContent = 'Adicionar às Collections';
        title.style.cssText = `
            color: white;
            margin: 0 0 1rem 0;
            font-size: 0.9rem;
            font-weight: 600;
        `;
        menu.appendChild(title);

        // Lista de collections
        if (this.collections.length === 0) {
            const emptyText = document.createElement('p');
            emptyText.textContent = 'Nenhuma collection criada';
            emptyText.style.cssText = `
                color: #71717a;
                font-size: 0.8rem;
                margin: 0;
            `;
            menu.appendChild(emptyText);
        } else {
            this.collections.forEach(collection => {
                const isInCollection = window.collectionsSystem.hasCharacter(collection.id, {
                    name: character.name,
                    anime: character.anime
                });

                const collectionItem = document.createElement('div');
                collectionItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                `;

                const collectionName = document.createElement('span');
                collectionName.textContent = collection.name;
                collectionName.style.cssText = `
                    color: white;
                    font-size: 0.85rem;
                `;

                const addButton = document.createElement('button');
                addButton.textContent = isInCollection ? '✓' : '+';
                addButton.style.cssText = `
                    background: ${isInCollection ? 'rgba(16, 185, 129, 0.8)' : 'rgba(99, 102, 241, 0.8)'};
                    border: none;
                    border-radius: 4px;
                    width: 24px;
                    height: 24px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                `;

                if (!isInCollection) {
                    addButton.addEventListener('click', () => {
                        this.addToCollection(collection.id, character);
                        addButton.textContent = '✓';
                        addButton.style.background = 'rgba(16, 185, 129, 0.8)';
                    });
                }

                collectionItem.appendChild(collectionName);
                collectionItem.appendChild(addButton);
                menu.appendChild(collectionItem);
            });
        }

        // Botão para criar nova collection
        const createButton = document.createElement('button');
        createButton.textContent = '➕ Criar Nova Collection';
        createButton.style.cssText = `
            background: rgba(99, 102, 241, 0.8);
            border: none;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            color: white;
            cursor: pointer;
            font-size: 0.8rem;
            width: 100%;
            margin-top: 1rem;
            transition: all 0.3s ease;
        `;

        createButton.addEventListener('click', () => {
            window.open('collections.html', '_blank');
            menu.remove();
        });

        createButton.addEventListener('mouseenter', () => {
            createButton.style.background = 'rgba(99, 102, 241, 1)';
        });

        createButton.addEventListener('mouseleave', () => {
            createButton.style.background = 'rgba(99, 102, 241, 0.8)';
        });

        menu.appendChild(createButton);

        // Adicionar menu ao card
        characterCard.appendChild(menu);

        // Fechar menu ao clicar fora
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !characterCard.querySelector('.collection-menu-btn').contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    // Adicionar personagem à collection
    addToCollection(collectionId, character) {
        try {
            const result = window.collectionsSystem.addCharacterToCollection(collectionId, character);
            
            // O sistema de Collections já mostra notificações automaticamente
            // Não precisamos duplicar aqui
        } catch (error) {
            // O sistema de Collections já trata e mostra erros automaticamente
            console.warn('Erro na integração:', error);
        }
    }

    // Nota: Sistema de notificações removido - agora usa o sistema unificado do CollectionsSystem

    // Inicializar integração
    init() {
        // Aguardar carregamento do sistema de collections
        if (window.collectionsSystem) {
            this.collections = window.collectionsSystem.listCollections();
            this.updateCollectionButtons();
        } else {
            // Tentar novamente em breve
            setTimeout(() => this.init(), 100);
        }
    }
}

// Inicializar integração quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar carregamento dos scripts necessários
    setTimeout(() => {
        if (window.collectionsSystem) {
            window.collectionsIntegration = new CollectionsIntegration();
            window.collectionsIntegration.init();
        }
    }, 500);
});
