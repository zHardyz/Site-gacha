// Sistema de Gerenciamento de Dados e Reset
class DataManager {
    constructor() {
        this.storageKeys = {
            inventory: 'gacha.inventory.v1',
            spinsLeft: 'spinsLeft',
            resetTime: 'resetTime',
            characterPool: 'gacha.character.pool.v3',
            poolTimestamp: 'gacha.character.pool.timestamp.v3',
            lastSummons: 'gacha.last.summons.v1',
            favorites: 'gacha.favorites.v1', // Nova funcionalidade de favoritos
            collections: 'gacha.collections.v1' // Sistema de collections
        };
    }

    // Verificar tamanho total dos dados no localStorage
    getStorageUsage() {
        let totalSize = 0;
        const usage = {};
        
        for (const [key, storageKey] of Object.entries(this.storageKeys)) {
            const data = localStorage.getItem(storageKey);
            const size = data ? new Blob([data]).size : 0;
            usage[key] = {
                size: size,
                sizeFormatted: this.formatBytes(size),
                exists: !!data
            };
            totalSize += size;
        }
        
        return {
            total: totalSize,
            totalFormatted: this.formatBytes(totalSize),
            breakdown: usage
        };
    }

    // Formatar bytes para leitura humana
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Reset específico do inventário
    resetInventory() {
        return new Promise((resolve) => {
            try {
                localStorage.removeItem(this.storageKeys.inventory);
                localStorage.removeItem(this.storageKeys.favorites);
                console.log('✅ Inventário resetado com sucesso');
                resolve(true);
            } catch (error) {
                console.error('❌ Erro ao resetar inventário:', error);
                resolve(false);
            }
        });
    }

    // Reset dos spins (para teste)
    resetSpins() {
        return new Promise((resolve) => {
            try {
                localStorage.removeItem(this.storageKeys.spinsLeft);
                localStorage.removeItem(this.storageKeys.resetTime);
                console.log('✅ Sistema de spins resetado');
                resolve(true);
            } catch (error) {
                console.error('❌ Erro ao resetar spins:', error);
                resolve(false);
            }
        });
    }

    // Reset do cache de personagens (força rebuild)
    resetCharacterPool() {
        return new Promise((resolve) => {
            try {
                localStorage.removeItem(this.storageKeys.characterPool);
                localStorage.removeItem(this.storageKeys.poolTimestamp);
                localStorage.removeItem(this.storageKeys.lastSummons);
                console.log('✅ Cache de personagens resetado');
                resolve(true);
            } catch (error) {
                console.error('❌ Erro ao resetar cache:', error);
                resolve(false);
            }
        });
    }

    // Reset TOTAL (limpa tudo)
    resetAll() {
        return new Promise((resolve) => {
            try {
                Object.values(this.storageKeys).forEach(key => {
                    localStorage.removeItem(key);
                });
                console.log('🔄 RESET TOTAL realizado - todos os dados foram limpos');
                resolve(true);
            } catch (error) {
                console.error('❌ Erro no reset total:', error);
                resolve(false);
            }
        });
    }

    // Backup dos dados
    exportData() {
        const data = {};
        for (const [key, storageKey] of Object.entries(this.storageKeys)) {
            const item = localStorage.getItem(storageKey);
            if (item) {
                try {
                    data[key] = JSON.parse(item);
                } catch {
                    data[key] = item; // Se não for JSON válido, manter como string
                }
            }
        }
        
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: data
        };
        
        return JSON.stringify(backup, null, 2);
    }

    // Restaurar dados do backup
    importData(backupString) {
        return new Promise((resolve, reject) => {
            try {
                const backup = JSON.parse(backupString);
                
                if (!backup.data) {
                    throw new Error('Formato de backup inválido');
                }
                
                // Validar e restaurar cada item
                for (const [key, value] of Object.entries(backup.data)) {
                    if (this.storageKeys[key]) {
                        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                        localStorage.setItem(this.storageKeys[key], stringValue);
                    }
                }
                
                console.log('✅ Dados restaurados do backup');
                resolve(true);
            } catch (error) {
                console.error('❌ Erro ao importar backup:', error);
                reject(error);
            }
        });
    }

    // Verificar integridade dos dados
    validateData() {
        const issues = [];
        
        // Verificar inventário
        try {
            const inventory = localStorage.getItem(this.storageKeys.inventory);
            if (inventory) {
                const parsed = JSON.parse(inventory);
                if (!Array.isArray(parsed)) {
                    issues.push('Inventário não é um array válido');
                }
            }
        } catch {
            issues.push('Inventário possui JSON inválido');
        }
        
        // Verificar spins
        const spinsLeft = localStorage.getItem(this.storageKeys.spinsLeft);
        if (spinsLeft && (isNaN(parseInt(spinsLeft)) || parseInt(spinsLeft) < 0 || parseInt(spinsLeft) > 10)) {
            issues.push('Valor de spins inválido');
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    // Limpeza automática (remover dados corrompidos)
    autoCleanup() {
        const validation = this.validateData();
        let cleaned = false;
        
        if (!validation.isValid) {
            console.warn('🧹 Dados corrompidos detectados, iniciando limpeza...');
            
            validation.issues.forEach(issue => {
                if (issue.includes('Inventário')) {
                    localStorage.removeItem(this.storageKeys.inventory);
                    cleaned = true;
                }
                if (issue.includes('spins')) {
                    localStorage.removeItem(this.storageKeys.spinsLeft);
                    localStorage.removeItem(this.storageKeys.resetTime);
                    cleaned = true;
                }
            });
            
            if (cleaned) {
                console.log('✅ Limpeza automática concluída');
            }
        }
        
        return cleaned;
    }
}

// Instância global
window.dataManager = new DataManager();

// Console helpers para desenvolvimento
if (typeof window !== 'undefined') {
    window.devTools = {
        // Mostrar uso do storage
        storage: () => {
            const usage = window.dataManager.getStorageUsage();
            console.table(usage.breakdown);
            console.log(`Total: ${usage.totalFormatted}`);
        },
        
        // Reset rápido do inventário
        resetInventory: () => window.dataManager.resetInventory(),
        
        // Reset rápido dos spins
        resetSpins: () => window.dataManager.resetSpins(),
        
        // Reset total
        resetAll: () => {
            if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os seus dados. Continuar?')) {
                return window.dataManager.resetAll();
            }
        },
        
        // Exportar backup
        export: () => {
            const backup = window.dataManager.exportData();
            console.log('📦 Backup gerado:');
            console.log(backup);
            
            // Copiar para clipboard se possível
            if (navigator.clipboard) {
                navigator.clipboard.writeText(backup).then(() => {
                    console.log('✅ Backup copiado para o clipboard!');
                });
            }
            
            return backup;
        },
        
        // Verificar integridade
        validate: () => {
            const validation = window.dataManager.validateData();
            if (validation.isValid) {
                console.log('✅ Todos os dados estão íntegros');
            } else {
                console.warn('⚠️ Problemas encontrados:', validation.issues);
            }
            return validation;
        },
        
        // Corrigir inconsistências de raridade
        fixRarity: () => {
            const determineRarity = (popularity) => {
                return window.determineRarityByPopularity(popularity);
            };

            let inventoryFixed = 0;
            let favoritesFixed = 0;

            // Corrigir inventário
            try {
                const inventoryData = localStorage.getItem('gacha.inventory.v1');
                if (inventoryData) {
                    const inventory = JSON.parse(inventoryData);
                    inventory.forEach(char => {
                        if (char.popularity && typeof char.popularity === 'number') {
                            const correctRarity = determineRarity(char.popularity);
                            if (char.rarity !== correctRarity) {
                                console.log(`🔧 Inventário - ${char.name}: ${char.rarity} → ${correctRarity} (${char.popularity.toLocaleString()} favoritos)`);
                                char.rarity = correctRarity;
                                inventoryFixed++;
                            }
                        }
                    });
                    if (inventoryFixed > 0) {
                        localStorage.setItem('gacha.inventory.v1', JSON.stringify(inventory));
                    }
                }
            } catch (e) {
                console.error('Erro ao corrigir inventário:', e);
            }

            // Corrigir favoritos
            try {
                const favoritesData = localStorage.getItem('gacha.favorites.v1');
                if (favoritesData) {
                    const favorites = JSON.parse(favoritesData);
                    favorites.forEach(char => {
                        if (char.popularity && typeof char.popularity === 'number') {
                            const correctRarity = determineRarity(char.popularity);
                            if (char.rarity !== correctRarity) {
                                console.log(`🔧 Favoritos - ${char.name}: ${char.rarity} → ${correctRarity} (${char.popularity.toLocaleString()} favoritos)`);
                                char.rarity = correctRarity;
                                favoritesFixed++;
                            }
                        }
                    });
                    if (favoritesFixed > 0) {
                        localStorage.setItem('gacha.favorites.v1', JSON.stringify(favorites));
                    }
                }
            } catch (e) {
                console.error('Erro ao corrigir favoritos:', e);
            }

            const totalFixed = inventoryFixed + favoritesFixed;
            if (totalFixed > 0) {
                console.log(`✅ Total corrigido: ${totalFixed} (${inventoryFixed} inventário, ${favoritesFixed} favoritos)`);
                console.log('🔄 Recarregue a página para ver as mudanças');
            } else {
                console.log('✅ Nenhuma inconsistência encontrada');
            }

            return { inventoryFixed, favoritesFixed, totalFixed };
        }
    };
    
    console.log('🔧 DevTools carregadas! Use devTools.storage(), devTools.resetAll(), etc.');
}
