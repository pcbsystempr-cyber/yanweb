import supabase from '../supabase-client.js';

const AdminAuth = {
  loginForm: null,
  loginError: null,
  loginBtn: null,
  emailInput: null,
  passwordInput: null,

  init() {
    this.bindElements();
    this.bindEvents();
    this.checkSession();
  },

  bindElements() {
    this.loginForm = document.getElementById('login-form');
    this.loginError = document.getElementById('login-error');
    this.loginBtn = document.getElementById('login-btn');
    this.emailInput = document.getElementById('login-email');
    this.passwordInput = document.getElementById('login-password');
  },

  bindEvents() {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Theme toggle for admin
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Bottom navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchSection(e.currentTarget.dataset.section);
      });
    });
  },

  switchSection(section) {
    // Update nav items
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.admin-section').forEach(sec => {
      sec.style.display = sec.id === `${section}-section` ? 'block' : 'none';
    });

    // Update header title
    const titleEl = document.getElementById('admin-title');
    const titles = {
      orders: 'Pedidos',
      products: 'Productos',
      delivery: 'Municipios y Envío',
      brand: 'Marca e Imágenes',
      leads: 'Cotizaciones',
      settings: 'Ajustes'
    };
    if (titleEl) titleEl.textContent = titles[section] || 'Admin';

    // Initialize section-specific modules
    if (section === 'orders' && window.AdminOrders) {
      window.AdminOrders.init();
    } else if (section === 'products' && window.AdminProducts) {
      window.AdminProducts.init();
    } else if (section === 'delivery' && window.AdminDelivery) {
      window.AdminDelivery.init();
    } else if (section === 'brand' && window.AdminBrand) {
      window.AdminBrand.init();
    } else if (section === 'leads' && window.AdminLeads) {
      window.AdminLeads.init();
    }
  },

  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Check if user is in admins table
      const isAdmin = await this.checkAdminStatus(session.user.id);
      if (isAdmin) {
        this.showAdminPanel();
        return;
      } else {
        // Not an admin, sign out
        await this.signOutAndShowError('Acceso denegado. No eres administrador.');
        return;
      }
    }
    
    // No session, show login
    this.showLogin();
  },

  async checkAdminStatus(userId) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .eq('active', true)
        .single();
      
      if (error || !data) return false;
      return true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value.trim();
    
    if (!email || !password) {
      this.showError('Por favor ingresa correo y contraseña');
      return;
    }
    
    this.setLoading(true);
    this.hideError();
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (data.user) {
        const isAdmin = await this.checkAdminStatus(data.user.id);
        if (isAdmin) {
          this.showAdminPanel();
        } else {
          await supabase.auth.signOut();
          this.showError('Acceso denegado. No eres administrador.');
        }
      }
    } catch (error) {
      this.showError(this.getErrorMessage(error.message));
    } finally {
      this.setLoading(false);
    }
  },

  async handleLogout() {
    await supabase.auth.signOut();
    this.showLogin();
  },

  async signOutAndShowError(message) {
    await supabase.auth.signOut();
    this.showError(message);
    this.showLogin();
  },

  showLogin() {
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const bottomNav = document.getElementById('bottom-nav');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (adminPanel) adminPanel.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    
    this.setInitialTheme();
  },

  showAdminPanel() {
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const bottomNav = document.getElementById('bottom-nav');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
    if (bottomNav) bottomNav.style.display = 'flex';
    
    this.setInitialTheme();
    
    // Trigger orders load if on orders page
    if (window.AdminOrders && typeof window.AdminOrders.init === 'function') {
      window.AdminOrders.init();
    }
  },

  showError(message) {
    if (this.loginError) {
      this.loginError.textContent = message;
      this.loginError.style.display = 'block';
    }
  },

  hideError() {
    if (this.loginError) {
      this.loginError.style.display = 'none';
    }
  },

  setLoading(loading) {
    if (this.loginBtn) {
      this.loginBtn.disabled = loading;
      this.loginBtn.textContent = loading ? 'Entrando...' : 'Entrar';
    }
    if (this.emailInput) this.emailInput.disabled = loading;
    if (this.passwordInput) this.passwordInput.disabled = loading;
  },

  getErrorMessage(error) {
    const messages = {
      'Invalid login credentials': 'Correo o contraseña incorrectos',
      'Email not confirmed': 'Confirma tu correo electrónico',
      'Too many requests': 'Demasiados intentos. Intenta más tarde',
      'User not found': 'Usuario no encontrado'
    };
    return messages[error] || 'Error al iniciar sesión';
  },

  // Theme management for admin
  setInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    this.updateThemeButton();
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeButton();
  },

  updateThemeButton() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const theme = document.documentElement.getAttribute('data-theme');
      themeToggle.textContent = theme === 'dark' ? '🌞' : '🌙';
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  }
};

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminAuth.init());
} else {
  AdminAuth.init();
}

// Export for use in other admin modules
window.AdminAuth = AdminAuth;