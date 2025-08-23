// Script para atualizar o navbar em todas as páginas
// Execute este script para aplicar o novo navbar em todas as páginas HTML

const fs = require('fs');
const path = require('path');

const pages = [
    'index.html',
    'stock.html', 
    'buscar.html',
    'favoritos.html',
    'collections.html',
    'logs.html'
];

const navbarInclude = `
    <!-- Include Navbar -->
    <div id="navbar-container"></div>`;

const navbarScript = `
    <script src="js/navbar.js"></script>
    
    <script>
        // Load navbar
        fetch('navbar.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('navbar-container').innerHTML = html;
                // Initialize navbar after loading
                if (window.Navbar) {
                    new window.Navbar();
                }
            })
            .catch(error => console.error('Error loading navbar:', error));
    </script>`;

function updatePage(pageName) {
    const filePath = path.join(__dirname, pageName);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Arquivo ${pageName} não encontrado`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Adicionar CSS do navbar se não existir
    if (!content.includes('css/navbar.css')) {
        content = content.replace(
            /<link rel="stylesheet" href="css\/style\.css">/,
            '<link rel="stylesheet" href="css/style.css">\n    <link rel="stylesheet" href="css/navbar.css">'
        );
    }
    
    // Remover navbar antigo
    content = content.replace(
        /<!-- Botão de menu mobile -->[\s\S]*?<\/header>/g,
        navbarInclude
    );
    
    // Remover navbar mobile antigo
    content = content.replace(
        /<!-- Navbar mobile[\s\S]*?<\/nav>/g,
        ''
    );
    
    // Remover navbar desktop antigo
    content = content.replace(
        /<header class="main-header">[\s\S]*?<\/header>/g,
        ''
    );
    
    // Remover scripts antigos de navbar
    content = content.replace(
        /\/\/ Mobile Menu Toggle[\s\S]*?}\);[\s\S]*?<\/script>/g,
        ''
    );
    
    // Adicionar script do navbar se não existir
    if (!content.includes('js/navbar.js')) {
        // Encontrar o último script antes do </body>
        const lastScriptIndex = content.lastIndexOf('<script');
        if (lastScriptIndex !== -1) {
            const beforeScript = content.substring(0, lastScriptIndex);
            const afterScript = content.substring(lastScriptIndex);
            content = beforeScript + navbarScript + '\n    ' + afterScript;
        }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${pageName} atualizado`);
}

console.log('🔄 Atualizando navbar em todas as páginas...\n');

pages.forEach(updatePage);

console.log('\n🎉 Atualização concluída!');
console.log('📝 Verifique se todas as páginas estão funcionando corretamente.');
