// ========== SISTEMA DE FAVORITOS NOVO - SIMPLES E FUNCIONAL ==========

class FavoritesSystem {
    constructor() {
        this.STORAGE_KEY = 'gacha.favorites.v2'; // Nova versão para reset
        this.favorites = [];
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.isInitialized = true;
        console.log('✅ Sistema de favoritos inicializado:', this.favorites.length, 'favoritos');
    }
    
    // Carregar favoritos do localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            this.favorites = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erro ao carregar favoritos:', error);
            this.favorites = [];
        }
    }
    
    // Salvar favoritos no localStorage
    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
            this.dispatchChangeEvent();
        } catch (error) {
            console.error('Erro ao salvar favoritos:', error);
        }
    }
    
    // Criar ID único para personagem
    createCharacterId(character) {
        return `${character.name}_${character.anime || 'unknown'}`;
    }
    
    // Verificar se personagem está favoritado
    isFavorited(character) {
        const id = this.createCharacterId(character);
        return this.favorites.some(fav => this.createCharacterId(fav) === id);
    }
    
    // Adicionar personagem aos favoritos
    addFavorite(character) {
        if (this.isFavorited(character)) {
            return false; // Já está favoritado
        }
        
        // Criar cópia limpa do personagem
        const favoriteCharacter = {
            name: character.name,
            anime: character.anime || 'Unknown',
            image: character.image,
            rarity: character.rarity,
            popularity: character.popularity || 0,
            quote: character.quote || null,
            quantity: character.quantity || 1,
            dateAdded: new Date().toISOString()
        };
        
        this.favorites.push(favoriteCharacter);
        this.saveToStorage();
        
        console.log(`➕ ${character.name} adicionado aos favoritos`);
        this.showToast(`${character.name} adicionado aos favoritos! 💖`);
        return true;
    }
    
    // Remover personagem dos favoritos
    removeFavorite(character) {
        const id = this.createCharacterId(character);
        const index = this.favorites.findIndex(fav => this.createCharacterId(fav) === id);
        
        if (index === -1) {
            return false; // Não estava favoritado
        }
        
        this.favorites.splice(index, 1);
        this.saveToStorage();
        
        console.log(`➖ ${character.name} removido dos favoritos`);
        this.showToast(`${character.name} removido dos favoritos`);
        return true;
    }
    
    // Toggle favorito (adicionar ou remover)
    toggleFavorite(character) {
        if (this.isFavorited(character)) {
            return this.removeFavorite(character);
        } else {
            return this.addFavorite(character);
        }
    }
    
    // Obter todos os favoritos
    getFavorites() {
        return [...this.favorites]; // Retorna cópia para evitar mutação
    }
    
    // Obter estatísticas
    getStats() {
        const totalFavorites = this.favorites.length;
        const uniqueRarities = new Set(this.favorites.map(f => f.rarity)).size;
        
        return {
            total: totalFavorites,
            rarities: uniqueRarities
        };
    }
    
    // Limpar todos os favoritos
    clearAll() {
        this.favorites = [];
        this.saveToStorage();
        this.showToast('Todos os favoritos foram removidos');
    }
    
    // Disparar evento de mudança
    dispatchChangeEvent() {
        window.dispatchEvent(new CustomEvent('favoritesChanged', {
            detail: {
                favorites: this.getFavorites(),
                stats: this.getStats()
            }
        }));
    }
    
    // Mostrar toast de feedback
    showToast(message) {
        // Remover toast anterior se existir
        const existingToast = document.querySelector('.favorites-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'favorites-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            background: linear-gradient(135deg, #ff6b9d, #ff8a9b);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-weight: 600;
            font-size: 0.9rem;
            box-shadow: 0 8px 25px rgba(255, 107, 157, 0.4);
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            pointer-events: none;
        `;
        
        document.body.appendChild(toast);
        
        // Animar entrada
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // Animar saída
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

// ========== INSTÂNCIA GLOBAL ==========
window.favoritesSystem = new FavoritesSystem();

// ========== FUNÇÕES GLOBAIS PARA COMPATIBILIDADE ==========

// Função global para verificar favorito
window.checkIfFavorited = function(character) {
    return window.favoritesSystem.isFavorited(character);
};

// Função global para toggle favorito
window.toggleFavorite = function(character) {
    return window.favoritesSystem.toggleFavorite(character);
};

// Função global para adicionar favorito
window.addToFavorites = function(character) {
    return window.favoritesSystem.addFavorite(character);
};

// Função global para remover favorito
window.removeFromFavorites = function(character) {
    return window.favoritesSystem.removeFavorite(character);
};

// Para debug no console
window.favoritesDebug = {
    list: () => window.favoritesSystem.getFavorites(),
    stats: () => window.favoritesSystem.getStats(),
    clear: () => window.favoritesSystem.clearAll(),
    add: (char) => window.favoritesSystem.addFavorite(char),
    remove: (char) => window.favoritesSystem.removeFavorite(char)
};

console.log('🚀 Sistema de favoritos carregado! Use favoritesDebug no console para testar.');
