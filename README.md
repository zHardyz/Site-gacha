# 🎯 Sistema de Gacha - Documentação Técnica

## 📋 Visão Geral

Este é um sistema de gacha (invocação) de personagens de anime baseado em dados reais da AniList. O sistema utiliza a popularidade dos personagens (número de favoritos) para determinar suas raridades de forma dinâmica e realística.

## 🔧 Arquitetura do Sistema de Raridades

### 📁 Arquivo Principal: `js/bannerConfig.js`

Este é o **arquivo central** que contém todas as configurações globais de raridade. Todas as modificações de probabilidades, cores e limites devem ser feitas aqui.

#### 🎨 Definição Global de Raridades

```javascript
const GLOBAL_RARITIES = {
    'Common': { 
        dropRate: 0.35,        // 35% de chance no sorteio
        color: '#8a8f98',      // Cor cinza
        glow: '#8a8f9880',     // Brilho translúcido
        name: 'Comum',         // Nome em português
        emoji: '⚪',           // Emoji representativo
        order: 1               // Ordem para classificação
    },
    'Rare': { 
        dropRate: 0.25,        // 25% de chance
        color: '#3b82f6',      // Cor azul
        glow: '#3b82f680', 
        name: 'Raro', 
        emoji: '🔵',
        order: 2 
    },
    'Epic': { 
        dropRate: 0.20,        // 20% de chance
        color: '#a855f7',      // Cor roxa
        glow: '#a855f780', 
        name: 'Épico', 
        emoji: '🟣',
        order: 3 
    },
    'Legendary': { 
        dropRate: 0.12,        // 12% de chance
        color: '#f59e0b',      // Cor dourada
        glow: '#f59e0b80', 
        name: 'Lendário', 
        emoji: '🟡',
        order: 4 
    },
    'Mythic': { 
        dropRate: 0.06,        // 6% de chance
        color: '#ef4444',      // Cor vermelha
        glow: '#ef444480', 
        name: 'Mítico', 
        emoji: '🔴',
        order: 5 
    },
    'Special': { 
        dropRate: 0.02,        // 2% de chance
        color: '#22d3ee',      // Cor ciano
        glow: '#22d3ee80', 
        name: 'Especial', 
        emoji: '✨',
        order: 6 
    }
};
```

#### 📊 Limites de Popularidade por Raridade

```javascript
function determineRarityByPopularity(popularity) {
    if (popularity >= 120000) return 'Special';   // 120k+ favoritos
    if (popularity >= 60000) return 'Mythic';     // 60k+ favoritos  
    if (popularity >= 25000) return 'Legendary';  // 25k+ favoritos
    if (popularity >= 10000) return 'Epic';       // 10k+ favoritos
    if (popularity >= 3000) return 'Rare';        // 3k+ favoritos
    return 'Common';                              // <3k favoritos
}
```

## ⚙️ Como Modificar Probabilidades e Raridades

### 1. 🎲 Alterar Chances de Drop

**Arquivo:** `js/bannerConfig.js`  
**Localização:** `GLOBAL_RARITIES` → `dropRate`

```javascript
// Exemplo: Aumentar chance de Lendário de 12% para 15%
'Legendary': { 
    dropRate: 0.15,  // Era 0.12 (12%), agora 0.15 (15%)
    // ... outras propriedades
}
```

⚠️ **IMPORTANTE:** A soma de todos os `dropRate` deve ser igual a 1.0 (100%)

### 2. 📊 Alterar Limites de Popularidade

**Arquivo:** `js/bannerConfig.js`  
**Função:** `determineRarityByPopularity()`

```javascript
// Exemplo: Tornar Épico mais acessível (10k → 8k favoritos)
if (popularity >= 8000) return 'Epic';  // Era 10000, agora 8000
```

### 3. 🎨 Modificar Cores e Aparência

**Arquivo:** `js/bannerConfig.js`  
**Localização:** `GLOBAL_RARITIES` → `color`, `glow`, `emoji`

```javascript
'Mythic': { 
    color: '#ff1493',      // Nova cor: Rosa choque
    glow: '#ff149380',     // Brilho correspondente
    emoji: '💖',           // Novo emoji
    name: 'Místico',       // Renomear raridade
}
```

### 4. 📈 Adicionar Nova Raridade

1. **Adicionar em `GLOBAL_RARITIES`:**
```javascript
'Ultra': { 
    dropRate: 0.01,        // 1% de chance
    color: '#9d174d',      // Cor rosa escuro
    glow: '#9d174d80', 
    name: 'Ultra Raro', 
    emoji: '💎',
    order: 7               // Maior que todas as outras
}
```

2. **Atualizar função de popularidade:**
```javascript
function determineRarityByPopularity(popularity) {
    if (popularity >= 200000) return 'Ultra';     // 200k+ favoritos
    if (popularity >= 120000) return 'Special';   // Continuar lógica...
    // ... resto da função
}
```

3. **Ajustar outras raridades** para somar 100%

## 🔧 Configurações Avançadas

### 📁 Pool de Personagens (`js/characterPool.js`)

#### 🔄 Configurações de Cache

```javascript
this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em ms
this.MAX_LAST_SUMMONS = 10; // Histórico de summons para anti-repetição
```

#### ⚖️ Balanceamento de Pools

```javascript
const minimumCounts = {
    'Special': 20,    // Mínimo 20 personagens Special
    'Mythic': 40,     // Mínimo 40 personagens Mythic
    'Legendary': 80,  // Mínimo 80 personagens Legendary
    'Epic': 150,      // Mínimo 150 personagens Epic
    'Rare': 200,      // Mínimo 200 personagens Rare
    'Common': 300     // Mínimo 300 personagens Common
};
```

#### 🎯 Configurações de Busca da API

```javascript
// Máximo de personagens a buscar da AniList
const maxCharacters = 4000;

// Estratégias de busca (páginas por estratégia)
totalFetched += await this.fetchCharactersBySort('FAVOURITES_DESC', 40);  // Top populares
totalFetched += await this.fetchCharactersBySort('RELEVANCE', 30);        // Relevantes
totalFetched += await this.fetchCharactersBySort('ID', 30);               // Aleatórios
```

### 📱 Sistema de Spins (`js/spinSystem.js`)

```javascript
// Configurações de invocações
let spinsLeft = 10;  // Número inicial de spins
let resetTime = getNextResetTime();  // Reset a cada hora

function getNextResetTime() {
    const now = new Date();
    // Reset a cada hora (pode ser modificado)
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0).getTime();
}
```

## 🛠️ Funções Utilitárias Globais

### 📋 Funções Disponíveis no Console

Execute no Console do navegador (F12):

```javascript
// Verificar e corrigir raridades inconsistentes
debugRarityConsistency()

// Limpar cache e rebuildar pool de personagens
forcePoolRebuild()

// Testar lógica de raridades
testRarityConsistency()

// Obter informações de uma raridade
getRarityInfo('Legendary')  // Retorna { color, name, emoji, etc. }

// Aplicar estilos de raridade a um elemento
applyRarityStyles(elemento, 'Mythic', { shadow: true })
```

### 🔧 Funções de Desenvolvimento

```javascript
// Determinar raridade pela popularidade
determineRarityByPopularity(50000)  // Retorna 'Mythic'

// Acessar configurações globais
window.GLOBAL_RARITIES.Legendary.color  // '#f59e0b'
```

## 📊 Sistema de Logs e Debug

### 🔍 Logs Automáticos

O sistema produz logs detalhados em ambiente de desenvolvimento (localhost):

```javascript
// Exemplo de log de summon
✨ Summoned: Naruto Uzumaki
  📊 Popularidade: 89.234 favoritos
  🎯 Raridade Real: Mythic (baseada na popularidade)
  🎲 Pool Sorteado: Legendary
  📂 Pool Original: Epic
```

### 📈 Monitoramento de Raridades

```javascript
// Ver distribuição atual do pool
console.log(window.characterPoolManager.getPoolStats());

// Exemplo de saída:
{
  Common: { count: 1680, percentage: "35.0" },
  Rare: { count: 1200, percentage: "25.0" },
  Epic: { count: 960, percentage: "20.0" },
  // ...
}
```

## 🚀 Guia de Implementação de Mudanças

### 1. ✅ Mudanças Simples (Apenas `bannerConfig.js`)

- Alterar cores das raridades
- Modificar nomes/emojis
- Ajustar probabilidades de drop
- Alterar limites de popularidade

### 2. ⚠️ Mudanças Complexas (Múltiplos arquivos)

- Adicionar/remover raridades
- Modificar sistema de pools
- Alterar lógica de anti-repetição

### 3. 🔄 Aplicar Mudanças

Após qualquer modificação:

1. **Limpar cache:** `forcePoolRebuild()`
2. **Recarregar página** para aplicar mudanças
3. **Verificar consistência:** `debugRarityConsistency()`
4. **Testar:** Fazer alguns summons

## 📁 Estrutura de Arquivos

```
Site-gacha/
├── js/
│   ├── bannerConfig.js     # ⭐ ARQUIVO PRINCIPAL - Configurações globais
│   ├── characterPool.js    # Sistema de pools e busca da API
│   ├── main.js            # Lógica de summon e revelação
│   ├── spinSystem.js      # Sistema de spins/invocações
│   ├── stock.js           # Página de coleção
│   ├── favoritos.js       # Página de favoritos
│   └── characterModal.js  # Modal de detalhes
├── css/
│   ├── style.css          # Estilos principais
│   ├── stock.css          # Estilos da coleção
│   └── favoritos.css      # Estilos dos favoritos
└── README.md              # Este arquivo
```

## 🔐 Variáveis de Ambiente

### 🌐 API da AniList

```javascript
// js/characterPool.js e stock.js
const ANILIST_API_URL = 'https://graphql.anilist.co';
const ANILIST_TOKEN = ""; // Opcional para rate limits maiores
```

### 💾 Chaves do LocalStorage

```javascript
const storageKeys = {
    inventory: 'gacha.inventory.v1',
    spinsLeft: 'spinsLeft', 
    resetTime: 'resetTime',
    characterPool: 'gacha.character.pool.v4',
    poolTimestamp: 'gacha.character.pool.timestamp.v3',
    lastSummons: 'gacha.last.summons.v1',
    favorites: 'gacha.favorites.v1'
};
```

## ⚡ Otimizações de Performance

### 📱 Cache Inteligente

- **Pool de personagens:** Cache de 24h
- **Imagens:** Lazy loading automático
- **API calls:** Rate limiting e retry logic

### 🎯 Anti-Repetição

- Histórico dos últimos 10 summons
- Peso maior para personagens não invocados recentemente
- Filtros por tempo desde último summon

## 💾 Gerenciamento de Dados e Reset

### 📋 Como o Salvamento Funciona

O sistema gacha salva **APENAS LOCALMENTE** no navegador de cada usuário:

```javascript
// Localização dos dados (localStorage do navegador)
localStorage['gacha.inventory.v1']    // Personagens da coleção
localStorage['gacha.favorites.v2']    // Personagens favoritos
localStorage['spinsLeft']             // Invocações restantes
localStorage['gacha.character.pool.v4'] // Cache de personagens da API
```

### ⚠️ **IMPORTANTE: Dados por Usuário/Navegador**

- ✅ **Individual:** Cada usuário tem sua própria coleção
- ✅ **Local:** Dados ficam apenas no navegador de cada pessoa
- ✅ **Privado:** Não há servidor central ou compartilhamento
- ❌ **Não sincroniza:** Entre dispositivos ou navegadores diferentes

### 🗑️ Como Resetar o Stock/Coleção

#### **Método 1: Console do Navegador (Recomendado)**

1. Abra as **Ferramentas do Desenvolvedor** (F12)
2. Vá na aba **Console**
3. Execute um dos comandos:

```javascript
// Reset APENAS do inventário/coleção
devTools.resetInventory()

// Reset APENAS dos favoritos
localStorage.removeItem('gacha.favorites.v2')

// Reset APENAS dos spins
devTools.resetSpins()

// Reset TOTAL (apaga tudo)
devTools.resetAll()
```

#### **Método 2: Limpeza Manual Completa**

```javascript
// Limpar TODOS os dados do gacha
localStorage.clear()
// Depois recarregue a página (F5)
```

#### **Método 3: Seletivo por Categoria**

```javascript
// Apenas coleção (mantém favoritos e spins)
localStorage.removeItem('gacha.inventory.v1')

// Apenas favoritos (mantém coleção)
localStorage.removeItem('gacha.favorites.v2')

// Apenas cache de personagens (força atualização da API)
localStorage.removeItem('gacha.character.pool.v4')

// Resetar spins para máximo
localStorage.removeItem('spinsLeft')
localStorage.removeItem('resetTime')
```

### 🌐 Outros Usuários São Afetados?

**❌ NÃO!** Cada usuário tem dados completamente separados:

- **Usuário A:** Suas próprias cartas, favoritos, spins
- **Usuário B:** Suas próprias cartas, favoritos, spins (diferentes do A)
- **Reset individual:** Limpar seus dados **não afeta mais ninguém**

### 🔧 Ferramentas de Debug Disponíveis

Execute no console (F12) para gerenciar dados:

```javascript
// Ver informações dos dados salvos
devTools.storage()  // Mostra tamanho de cada categoria

// Exportar backup da coleção
devTools.export()   // Copia backup para clipboard

// Ver status dos favoritos
favoritesDebug.stats()  // Quantidade e raridades

// Limpar cache (força atualização de personagens)
window.characterPoolManager.forceRefresh()
```

### 📤 Backup e Restauração

```javascript
// Criar backup completo
const backup = devTools.export()
// Cole o resultado em um arquivo .txt

// Restaurar backup (cole o JSON do backup)
devTools.import(backupJson)
```

### 🔄 Situações Comuns de Reset

#### **Desenvolvimento/Teste:**
```javascript
devTools.resetInventory()  // Limpar para testar
```

#### **Dados Corrompidos:**
```javascript
devTools.resetAll()       // Reset total
```

#### **Quero Começar do Zero:**
```javascript
localStorage.clear()      // Apagar tudo
```

#### **Apenas Atualizar Personagens:**
```javascript
localStorage.removeItem('gacha.character.pool.v4')
// Recarregar página
```

## 🐛 Solução de Problemas

### ❌ Raridades Inconsistentes

```javascript
// 1. Executar correção automática
debugRarityConsistency()

// 2. Se persistir, rebuildar pool
forcePoolRebuild()
// Recarregar página

// 3. Verificar logs no console para diagnosticar
```

### 🔄 Pool Vazio ou Corrupto

```javascript
// Forçar rebuild completo
localStorage.clear()  // ⚠️ Apaga TODO o progresso
// Recarregar página
```

### 📊 Probabilidades Não Batendo

```javascript
// Verificar se soma é 100%
Object.values(GLOBAL_RARITIES).reduce((sum, r) => sum + r.dropRate, 0)
// Deve retornar 1.0
```

---

## 📜 Histórico de Versões

- **v1.0** - Sistema básico de gacha
- **v1.1** - Sistema global de raridades implementado
- **v1.2** - Correção de inconsistências entre summon/stock
- **v1.3** - Sistema de cache e anti-repetição
- **v1.4** - Documentação completa e funções de debug

---

*Para suporte técnico ou dúvidas sobre implementação, consulte os logs do console em modo desenvolvedor.*
