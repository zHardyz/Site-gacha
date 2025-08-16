// Definição global e centralizada de raridades
const GLOBAL_RARITIES = {
    'Common':   { 
        dropRate: 0.35, 
        color: '#8a8f98', 
        glow: '#8a8f9880', 
        name: 'Comum', 
        emoji: '⚪',
        order: 1
    },
    'Rare':     { 
        dropRate: 0.25, 
        color: '#3b82f6', 
        glow: '#3b82f680', 
        name: 'Raro', 
        emoji: '🔵',
        order: 2
    },
    'Epic':     { 
        dropRate: 0.20, 
        color: '#a855f7', 
        glow: '#a855f780', 
        name: 'Épico', 
        emoji: '🟣',
        order: 3
    },
    'Legendary':{ 
        dropRate: 0.12, 
        color: '#f59e0b', 
        glow: '#f59e0b80', 
        name: 'Lendário', 
        emoji: '🟡',
        order: 4
    },
    'Mythic':   { 
        dropRate: 0.06, 
        color: '#ef4444', 
        glow: '#ef444480', 
        name: 'Mítico', 
        emoji: '🔴',
        order: 5
    },
    'Special':  { 
        dropRate: 0.02, 
        color: '#22d3ee', 
        glow: '#22d3ee80', 
        name: 'Especial', 
        emoji: '✨',
        order: 6
    }
};

// Função global para obter informações de raridade
function getRarityInfo(rarity) {
    if (!rarity || typeof rarity !== 'string') {
        console.warn('⚠️ Raridade inválida:', rarity);
        return GLOBAL_RARITIES['Common'];
    }
    
    const rarityKey = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
    const rarityInfo = GLOBAL_RARITIES[rarityKey] || GLOBAL_RARITIES[rarity] || GLOBAL_RARITIES['Common'];
    
    if (!GLOBAL_RARITIES[rarityKey] && !GLOBAL_RARITIES[rarity]) {
        console.warn(`⚠️ Raridade "${rarity}" não encontrada, usando Common como fallback`);
    }
    
    // Debug em desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log(`🔍 getRarityInfo("${rarity}") → ${rarityInfo.name} (${rarityInfo.color})`);
    }
    
    return rarityInfo;
}

// Função para aplicar estilos de raridade a um elemento
function applyRarityStyles(element, rarity, options = {}) {
    const rarityInfo = getRarityInfo(rarity);
    const {
        background = true,
        border = true,
        color = true,
        shadow = false
    } = options;
    
    if (!element) {
        console.warn('⚠️ Elemento não fornecido para applyRarityStyles');
        return;
    }
    
    if (background) {
        element.style.setProperty('background', 
            `linear-gradient(135deg, ${rarityInfo.color}, ${rarityInfo.color}99)`, 'important');
    }
    
    if (border) {
        element.style.setProperty('border', `2px solid ${rarityInfo.color}`, 'important');
    }
    
    if (color) {
        element.style.setProperty('color', '#ffffff', 'important');
    }
    
    if (shadow) {
        element.style.setProperty('box-shadow', `0 0 20px ${rarityInfo.glow}`, 'important');
    }
    
    return rarityInfo;
}

// Compatibilidade com código antigo
const rarities = GLOBAL_RARITIES;

// Função para determinar raridade pela popularidade (mesma lógica do characterPool)
function determineRarityByPopularity(popularity) {
    if (popularity >= 120000) return 'Special';
    if (popularity >= 60000) return 'Mythic';
    if (popularity >= 25000) return 'Legendary';
    if (popularity >= 10000) return 'Epic';
    if (popularity >= 3000) return 'Rare';
    return 'Common';
}

// Função de debug para corrigir raridades inconsistentes
function debugRarityConsistency() {
    console.log('🔧 Verificando consistência de raridades...');
    
    // Verificar inventário
    const inventoryData = localStorage.getItem('gacha.inventory.v1');
    if (inventoryData) {
        const inventory = JSON.parse(inventoryData);
        let fixed = 0;
        
        inventory.forEach(char => {
            if (char.popularity && typeof char.popularity === 'number') {
                // Usar a mesma lógica do characterPool
                const correctRarity = determineRarityByPopularity(char.popularity);
                
                if (char.rarity !== correctRarity) {
                    console.log(`🔧 ${char.name}: ${char.rarity} → ${correctRarity} (${char.popularity.toLocaleString()} favoritos)`);
                    char.rarity = correctRarity;
                    fixed++;
                }
            }
        });
        
        if (fixed > 0) {
            localStorage.setItem('gacha.inventory.v1', JSON.stringify(inventory));
            console.log(`✅ ${fixed} personagens corrigidos no inventário`);
        } else {
            console.log('✅ Inventário já está consistente');
        }
    }
    
    // Verificar favoritos
    const favoritesData = localStorage.getItem('gacha.favorites.v1');
    if (favoritesData) {
        const favorites = JSON.parse(favoritesData);
        let fixed = 0;
        
        favorites.forEach(char => {
            if (char.popularity && typeof char.popularity === 'number') {
                const correctRarity = determineRarityByPopularity(char.popularity);
                
                if (char.rarity !== correctRarity) {
                    console.log(`🔧 Favorito ${char.name}: ${char.rarity} → ${correctRarity}`);
                    char.rarity = correctRarity;
                    fixed++;
                }
            }
        });
        
        if (fixed > 0) {
            localStorage.setItem('gacha.favorites.v1', JSON.stringify(favorites));
            console.log(`✅ ${fixed} favoritos corrigidos`);
        } else {
            console.log('✅ Favoritos já estão consistentes');
        }
    }
}

// Tornar funções globalmente acessíveis
window.GLOBAL_RARITIES = GLOBAL_RARITIES;
window.getRarityInfo = getRarityInfo;
window.applyRarityStyles = applyRarityStyles;
window.rarities = rarities;
window.debugRarityConsistency = debugRarityConsistency;
window.determineRarityByPopularity = determineRarityByPopularity;

// Função para limpar cache e forçar rebuild do pool
window.forcePoolRebuild = function() {
    console.log('🔄 Forçando rebuild do pool de personagens...');
    
    // Limpar todos os caches relacionados
    localStorage.removeItem('gacha.character.pool.v4');
    localStorage.removeItem('gacha.character.pool.timestamp.v3');
    localStorage.removeItem('gacha.last.summons.v1');
    
    console.log('✅ Cache limpo! Recarregue a página para rebuildar o pool.');
    console.log('⚠️ Isso pode demorar alguns segundos na primeira vez.');
};

// Função de teste para verificar consistência de raridade
window.testRarityConsistency = function() {
    console.log('🧪 Testando consistência de raridade...');
    
    // Simular alguns personagens com diferentes popularidades
    const testCases = [
        { name: 'Personagem Popular', popularity: 50000 },
        { name: 'Personagem Muito Popular', popularity: 100000 },
        { name: 'Personagem Comum', popularity: 1000 },
        { name: 'Personagem Raro', popularity: 5000 },
        { name: 'Personagem Épico', popularity: 15000 }
    ];
    
    testCases.forEach(char => {
        const rarity = determineRarityByPopularity(char.popularity);
        const rarityInfo = getRarityInfo(rarity);
        console.log(`📊 ${char.name} (${char.popularity.toLocaleString()} favoritos) → ${rarityInfo.name} (${rarity})`);
    });
    
    console.log('✅ Teste concluído!');
};

let bannerCharacters = [];

// Executar correção automática de raridades quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Sistema de raridades global carregado');
    console.log('💡 Para corrigir raridades inconsistentes, execute: debugRarityConsistency()');
    
    // Executar correção automática em 2 segundos para dar tempo dos outros scripts carregarem
    setTimeout(() => {
        if (typeof debugRarityConsistency === 'function') {
            debugRarityConsistency();
        }
    }, 2000);
});