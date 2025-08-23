// ===== NAVBAR UNIFICADO - JAVASCRIPT =====

class Navbar {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.toggle = document.getElementById('navbar-toggle');
        this.menu = document.getElementById('navbar-menu');
        this.links = document.querySelectorAll('.navbar-link');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setActivePage();
        this.setupKeyboardNavigation();
    }

    setupEventListeners() {
        // Toggle mobile menu
        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.toggleMenu());
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navbar.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Close menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });

        // Close menu when clicking on a link (mobile)
        this.links.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1023) {
                    this.closeMenu();
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1023) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        const isOpen = this.menu.classList.contains('active');
        
        if (isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.menu.classList.add('active');
        this.toggle.classList.add('active');
        this.toggle.setAttribute('aria-expanded', 'true');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
    }

    closeMenu() {
        this.menu.classList.remove('active');
        this.toggle.classList.remove('active');
        this.toggle.setAttribute('aria-expanded', 'false');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    setActivePage() {
        const currentPage = this.getCurrentPage();
        
        this.links.forEach(link => {
            link.classList.remove('active');
            
            const pageName = link.getAttribute('data-page');
            if (pageName === currentPage) {
                link.classList.add('active');
            }
        });
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        
        // Map filenames to page names
        const pageMap = {
            'index.html': 'home',
            'stock.html': 'stock',
            'buscar.html': 'buscar',
            'favoritos.html': 'favoritos',
            'collections.html': 'collections',
            'logs.html': 'logs'
        };
        
        return pageMap[filename] || 'home';
    }

    setupKeyboardNavigation() {
        // Handle keyboard navigation for mobile menu
        this.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleMenu();
            }
        });

        // Handle keyboard navigation for menu items
        this.links.forEach((link, index) => {
            link.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    // Allow default behavior for Enter/Space
                    return;
                }
                
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextIndex = (index + 1) % this.links.length;
                    this.links[nextIndex].focus();
                }
                
                if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prevIndex = index === 0 ? this.links.length - 1 : index - 1;
                    this.links[prevIndex].focus();
                }
                
                if (e.key === 'Home') {
                    e.preventDefault();
                    this.links[0].focus();
                }
                
                if (e.key === 'End') {
                    e.preventDefault();
                    this.links[this.links.length - 1].focus();
                }
            });
        });
    }
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Navbar();
});

// Export for potential use in other scripts
window.Navbar = Navbar;
