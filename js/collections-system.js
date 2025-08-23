// Sistema de Collections para Gacha
class CollectionsSystem {
    constructor() {
        this.storageKey = 'gacha.collections.v1';
        this.versionKey = 'gacha.collections.version';
        this.CURRENT_VERSION = 'v2';
        this.collections = [];
        this.load();
    }

    // Carregar dados do localStorage com controle de versão e inicialização segura
    load() {
        try {
            // Verificar versão e fazer cache-busting se necessário
            const storedVersion = localStorage.getItem(this.versionKey);
            if (storedVersion !== this.CURRENT_VERSION) {
                console.warn(`Versão de collections desatualizada (${storedVersion} -> ${this.CURRENT_VERSION}), resetando dados...`);
                this.resetCollections();
                localStorage.setItem(this.versionKey, this.CURRENT_VERSION);
                this.showResetNotification();
                return;
            }

            // Carregar dados com validação segura
            const raw = localStorage.getItem(this.storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            
            // Validar se os dados são um array válido
            if (Array.isArray(parsed)) {
                this.collections = parsed;
            } else {
                console.warn("Dados de collections corrompidos, resetando...");
                this.resetCollections();
                this.showResetNotification();
            }
        } catch (error) {
            console.warn("Erro ao carregar collections, resetando dados:", error);
            this.resetCollections();
            this.showResetNotification();
        }
    }

    // Resetar collections para estado inicial
    resetCollections() {
        this.collections = [];
        localStorage.setItem(this.storageKey, JSON.stringify([]));
    }

    // Mostrar notificação de reset
    showResetNotification() {
        const message = "Dados de Collections foram resetados devido a uma atualização ou cache corrompido.";
        this.showToast(message, 'warning');
    }

    // Sistema de toast para feedback ao usuário
    showToast(message, type = 'info') {
        // Remover toast anterior se existir
        const existingToast = document.querySelector('.collections-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'collections-toast';
        toast.textContent = message;
        
        // Estilos baseados no tipo
        const baseStyles = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        let typeStyles = '';
        switch (type) {
            case 'success':
                typeStyles = 'background: linear-gradient(135deg, #4CAF50, #45a049);';
                break;
            case 'error':
                typeStyles = 'background: linear-gradient(135deg, #f44336, #d32f2f);';
                break;
            case 'warning':
                typeStyles = 'background: linear-gradient(135deg, #ff9800, #f57c00);';
                break;
            default:
                typeStyles = 'background: linear-gradient(135deg, #2196F3, #1976D2);';
        }

        toast.style.cssText = baseStyles + typeStyles;
        document.body.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remover após 5 segundos
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    // Salvar dados no localStorage com tratamento de erro melhorado
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.collections));
        } catch (error) {
            console.warn('Erro ao salvar collections:', error);
            // Tentar limpar dados antigos e salvar novamente
            try {
                localStorage.removeItem(this.storageKey);
                localStorage.setItem(this.storageKey, JSON.stringify(this.collections));
            } catch (retryError) {
                console.error('Falha ao salvar collections mesmo após limpeza:', retryError);
                this.showToast('Erro ao salvar dados de Collections', 'error');
            }
        }
    }

    // Gerar ID único para collection
    generateId() {
        return 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Validar e processar imagem de banner
    async processBannerImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                const aspectRatio = img.width / img.height;
                
                // Calcular dimensões finais (máximo 1200x400, mantendo proporção)
                let targetWidth = 1200;
                let targetHeight = 400;
                
                if (aspectRatio > 3) { // Muito largo (21:9+)
                    targetWidth = 1200;
                    targetHeight = Math.round(1200 / aspectRatio);
                } else if (aspectRatio < 2) { // Menos largo que 2:1
                    targetHeight = 400;
                    targetWidth = Math.round(400 * aspectRatio);
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Converter para dataURL com compressão JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                resolve({
                    dataUrl: dataUrl,
                    width: targetWidth,
                    height: targetHeight
                });
            };

            img.onerror = () => {
                reject(new Error('Erro ao carregar imagem'));
            };

            img.src = URL.createObjectURL(file);
        });
    }

    // Listar todas as collections
    listCollections() {
        return [...this.collections];
    }

    // Obter collection por ID
    getCollection(id) {
        return this.collections.find(collection => collection.id === id) || null;
    }

    // Criar nova collection
    async createCollection({ name, subtitle, bannerFile }) {
        try {
            // Validar entrada
            if (!name || !name.trim()) {
                throw new Error('Nome da collection é obrigatório');
            }

            let banner = null;
            
            if (bannerFile) {
                try {
                    banner = await this.processBannerImage(bannerFile);
                } catch (bannerError) {
                    console.warn('Erro ao processar banner:', bannerError);
                    // Continuar sem banner se houver erro
                }
            }

            const collection = {
                id: this.generateId(),
                name: name.trim(),
                subtitle: subtitle ? subtitle.trim() : '',
                banner: banner,
                createdAt: new Date().toISOString(),
                items: []
            };

            this.collections.push(collection);
            this.save();
            this.dispatchChangeEvent();

            this.showToast(`Collection "${collection.name}" criada com sucesso!`, 'success');
            return collection;
        } catch (error) {
            console.warn('Erro ao criar collection:', error);
            this.showToast(`Erro ao criar collection: ${error.message}`, 'error');
            throw error;
        }
    }

    // Atualizar collection
    async updateCollection(id, { name, subtitle, bannerFile }) {
        try {
            const collection = this.getCollection(id);
            if (!collection) {
                throw new Error('Collection não encontrada');
            }

            if (name !== undefined) {
                if (!name || !name.trim()) {
                    throw new Error('Nome da collection não pode estar vazio');
                }
                collection.name = name.trim();
            }
            
            if (subtitle !== undefined) {
                collection.subtitle = subtitle ? subtitle.trim() : '';
            }

            if (bannerFile) {
                try {
                    collection.banner = await this.processBannerImage(bannerFile);
                } catch (bannerError) {
                    console.warn('Erro ao processar banner:', bannerError);
                    // Continuar sem atualizar o banner se houver erro
                }
            }

            this.save();
            this.dispatchChangeEvent();

            this.showToast(`Collection "${collection.name}" atualizada com sucesso!`, 'success');
            return collection;
        } catch (error) {
            console.warn('Erro ao atualizar collection:', error);
            this.showToast(`Erro ao atualizar collection: ${error.message}`, 'error');
            throw error;
        }
    }

    // Deletar collection
    deleteCollection(id) {
        try {
            const index = this.collections.findIndex(collection => collection.id === id);
            if (index === -1) {
                throw new Error('Collection não encontrada');
            }

            const collectionName = this.collections[index].name;
            this.collections.splice(index, 1);
            this.save();
            this.dispatchChangeEvent();

            this.showToast(`Collection "${collectionName}" removida com sucesso!`, 'success');
        } catch (error) {
            console.warn('Erro ao deletar collection:', error);
            this.showToast(`Erro ao deletar collection: ${error.message}`, 'error');
            throw error;
        }
    }

    // Adicionar personagem à collection
    addCharacterToCollection(id, characterObjectFromInventory) {
        try {
            const collection = this.getCollection(id);
            if (!collection) {
                throw new Error('Collection não encontrada');
            }

            // Validar dados do personagem
            if (!characterObjectFromInventory || !characterObjectFromInventory.name || !characterObjectFromInventory.anime) {
                throw new Error('Dados do personagem inválidos');
            }

            // Verificar se o personagem já está na collection
            const existingIndex = collection.items.findIndex(item => 
                item.name === characterObjectFromInventory.name && 
                item.anime === characterObjectFromInventory.anime
            );

            if (existingIndex !== -1) {
                this.showToast(`${characterObjectFromInventory.name} já está nesta collection!`, 'info');
                return { ok: false, reason: 'already_in' };
            }

            // Criar snapshot do personagem
            const characterSnapshot = {
                name: characterObjectFromInventory.name,
                anime: characterObjectFromInventory.anime,
                image: characterObjectFromInventory.image,
                quantity: characterObjectFromInventory.quantity || 1,
                addedAt: new Date().toISOString()
            };

            collection.items.push(characterSnapshot);
            this.save();
            this.dispatchChangeEvent();

            this.showToast(`${characterObjectFromInventory.name} adicionado à collection!`, 'success');
            return { ok: true };
        } catch (error) {
            console.warn('Erro ao adicionar personagem à collection:', error);
            this.showToast(`Erro ao adicionar personagem: ${error.message}`, 'error');
            throw error;
        }
    }

    // Remover personagem da collection
    removeCharacterFromCollection(id, { name, anime }) {
        try {
            const collection = this.getCollection(id);
            if (!collection) {
                throw new Error('Collection não encontrada');
            }

            if (!name || !anime) {
                throw new Error('Nome e anime do personagem são obrigatórios');
            }

            const index = collection.items.findIndex(item => 
                item.name === name && item.anime === anime
            );

            if (index === -1) {
                throw new Error('Personagem não encontrado na collection');
            }

            collection.items.splice(index, 1);
            this.save();
            this.dispatchChangeEvent();

            this.showToast(`${name} removido da collection!`, 'success');
        } catch (error) {
            console.warn('Erro ao remover personagem da collection:', error);
            this.showToast(`Erro ao remover personagem: ${error.message}`, 'error');
            throw error;
        }
    }

    // Verificar se personagem está na collection
    hasCharacter(id, { name, anime }) {
        const collection = this.getCollection(id);
        if (!collection) {
            return false;
        }

        return collection.items.some(item => 
            item.name === name && item.anime === anime
        );
    }

    /**
     * Atualiza a imagem de um personagem dentro de uma collection
     * @param {string} collectionId - ID da collection
     * @param {Object} character - Objeto com name e anime do personagem
     * @param {string} newImageDataUrl - Nova imagem em formato dataURL
     * @returns {boolean} - true se atualizado com sucesso
     */
    updateCharacterImage(collectionId, character, newImageDataUrl) {
        try {
            const collection = this.getCollection(collectionId);
            if (!collection) {
                throw new Error('Collection não encontrada');
            }

            if (!character || !character.name || !character.anime) {
                throw new Error('Dados do personagem inválidos');
            }

            if (!newImageDataUrl) {
                throw new Error('Nova imagem é obrigatória');
            }

            const characterIndex = collection.items.findIndex(item => 
                item.name === character.name && item.anime === character.anime
            );

            if (characterIndex === -1) {
                throw new Error('Personagem não encontrado na collection');
            }

            // Atualizar a imagem do personagem
            collection.items[characterIndex].image = newImageDataUrl;

            // Salvar as mudanças
            this.save();
            
            // Disparar evento de mudança
            this.dispatchChangeEvent();

            this.showToast(`Imagem de ${character.name} atualizada!`, 'success');
            return true;
        } catch (error) {
            console.warn('Erro ao atualizar imagem do personagem:', error);
            this.showToast(`Erro ao atualizar imagem: ${error.message}`, 'error');
            throw error;
        }
    }

    // Disparar evento de mudança
    dispatchChangeEvent() {
        window.dispatchEvent(new CustomEvent('collectionsChanged', {
            detail: { collections: this.listCollections() }
        }));
    }

    // Sincronizar quantidade com inventário
    syncWithInventory() {
        try {
            const rawInventory = localStorage.getItem('gacha.inventory.v1');
            let inventory = [];
            
            if (rawInventory) {
                try {
                    inventory = JSON.parse(rawInventory);
                    if (!Array.isArray(inventory)) {
                        console.warn('Inventário não é um array válido, usando array vazio');
                        inventory = [];
                    }
                } catch (parseError) {
                    console.warn('Erro ao fazer parse do inventário:', parseError);
                    inventory = [];
                }
            }

            const inventoryMap = new Map();
            
            // Criar mapa do inventário
            inventory.forEach(char => {
                if (char && char.name && char.anime) {
                    const key = `${char.name}|${char.anime}`;
                    inventoryMap.set(key, char.quantity || 1);
                }
            });

            let updated = false;

            // Atualizar quantidades nas collections
            this.collections.forEach(collection => {
                if (collection && collection.items && Array.isArray(collection.items)) {
                    collection.items.forEach(item => {
                        if (item && item.name && item.anime) {
                            const key = `${item.name}|${item.anime}`;
                            const inventoryQuantity = inventoryMap.get(key) || 0;
                            
                            if (item.quantity !== inventoryQuantity) {
                                item.quantity = inventoryQuantity;
                                updated = true;
                            }
                        }
                    });
                }
            });

            if (updated) {
                this.save();
                this.dispatchChangeEvent();
            }
        } catch (error) {
            console.warn('Erro ao sincronizar com inventário:', error);
            // Não mostrar toast para sincronização automática para evitar spam
        }
    }
}

// Instância global
window.collectionsSystem = new CollectionsSystem();

// Sincronizar com inventário quando mudanças ocorrerem
window.addEventListener('storage', (e) => {
    if (e.key === 'gacha.inventory.v1') {
        window.collectionsSystem.syncWithInventory();
    }
});

// Sincronizar inicialmente
window.collectionsSystem.syncWithInventory();
