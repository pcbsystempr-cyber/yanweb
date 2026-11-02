// Welcome questionnaire and background music
let bgAudio = null;
let bgIsPlaying = false;
let currentLang = 'es';

// Translations
const i18n = {
  es: {
    'welcome.title': '¡Bienvenido a Omy\'s Wood Art!',
    'welcome.subtitle': 'Configura tu experiencia',
    'welcome.q1': '1. ¿Prefieres modo claro u oscuro?',
    'welcome.q2': '2. ¿En qué idioma prefieres la página?',
    'welcome.q3': '3. ¿Te gustaría música de fondo?',
    'welcome.theme.light': 'Claro (crema)',
    'welcome.theme.dark': 'Oscuro',
    'welcome.lang.es': 'Español',
    'welcome.lang.en': 'English',
    'welcome.music.yes': 'Sí, activar música',
    'welcome.music.no': 'No, gracias',
    'welcome.continue': 'Continuar',
    'nav.inicio': 'Inicio',
    'nav.nosotros': 'Nosotros',
    'nav.catalogo': 'Productos',
    'nav.theme': 'Oscuro',
    'hero.title': 'De la madera a la obra.',
    'hero.subtitle': 'Construimos juntos. Creamos para durar.',
    'hero.whatsapp': 'Contactar por WhatsApp',
    'section.quienes-somos': 'Quiénes Somos',
    'section.servicios': 'Servicios',
    'section.proceso': 'Proceso',
    'section.aliados': 'Aliados',
    'section.catalogo': 'Catálogo',
    'section.testimonios': 'Testimonios',
    'catalog.filter.all': 'Todas las categorías',
    'catalog.search': 'Buscar productos...',
    'catalog.status.available': 'Disponible',
    'catalog.status.out': 'Agotado',
    'catalog.btn.add': 'Añadir al pedido',
    'footer.contacto': 'Contacto',
    'footer.whatsapp': 'WhatsApp: 17875550123',
    'footer.email': 'Email: omyswoodarts@gmail.com',
    'footer.redes': 'Redes',
    'footer.copyright': '© 2026 Omy\'s Wood Art. Puerto Rico.',
    'footer.admin': 'Admin',
    'music.on': '♪ Música: ON',
    'music.off': '♪ Música: OFF',
    'music.activate': '♪ Activar Música',
    'proceso.step1.title': '1. Consulta',
    'proceso.step1.desc': 'Escuchamos tus ideas y necesidades para entender tu proyecto.',
    'proceso.step2.title': '2. Diseño y Presupuesto',
    'proceso.step2.desc': 'Desarrollamos el diseño y te presentamos una cotización detallada.',
    'proceso.step3.title': '3. Fabricación',
    'proceso.step3.desc': 'Creamos tu pieza a mano con maderas seleccionadas y acabados de calidad.',
    'proceso.step4.title': '4. Entrega e Instalación',
    'proceso.step4.desc': 'Entregamos e instalamos tu proyecto con cuidado profesional.'
  },
  en: {
    'welcome.title': 'Welcome to Omy\'s Wood Art!',
    'welcome.subtitle': 'Configure your experience',
    'welcome.q1': '1. Do you prefer light or dark mode?',
    'welcome.q2': '2. What language do you prefer?',
    'welcome.q3': '3. Would you like background music?',
    'welcome.theme.light': 'Light (cream)',
    'welcome.theme.dark': 'Dark',
    'welcome.lang.es': 'Spanish',
    'welcome.lang.en': 'English',
    'welcome.music.yes': 'Yes, activate music',
    'welcome.music.no': 'No, thanks',
    'welcome.continue': 'Continue',
    'nav.inicio': 'Home',
    'nav.nosotros': 'About Us',
    'nav.catalogo': 'Products',
    'nav.theme': 'Dark',
    'hero.title': 'From wood to work.',
    'hero.subtitle': 'We build together. We create to last.',
    'hero.whatsapp': 'Contact via WhatsApp',
    'section.quienes-somos': 'About Us',
    'section.servicios': 'Services',
    'section.proceso': 'Process',
    'section.aliados': 'Allies',
    'section.catalogo': 'Catalog',
    'section.testimonios': 'Testimonials',
    'catalog.filter.all': 'All categories',
    'catalog.search': 'Search products...',
    'catalog.status.available': 'Available',
    'catalog.status.out': 'Out of stock',
    'catalog.btn.add': 'Add to order',
    'footer.contacto': 'Contact',
    'footer.whatsapp': 'WhatsApp: 17875550123',
    'footer.email': 'Email: omyswoodarts@gmail.com',
    'footer.redes': 'Socials',
    'footer.copyright': '© 2026 Omy\'s Wood Art. Puerto Rico.',
    'footer.admin': 'Admin',
    'music.on': '♪ Music: ON',
    'music.off': '♪ Music: OFF',
    'music.activate': '♪ Activate Music',
    'proceso.step1.title': '1. Consultation',
    'proceso.step1.desc': 'We listen to your ideas and needs to understand your project.',
    'proceso.step2.title': '2. Design and Quote',
    'proceso.step2.desc': 'We develop the design and present you with a detailed quote.',
    'proceso.step3.title': '3. Fabrication',
    'proceso.step3.desc': 'We create your piece by hand with selected woods and quality finishes.',
    'proceso.step4.title': '4. Delivery and Installation',
    'proceso.step4.desc': 'We deliver and install your project with professional care.'
  }
};

function t(key) {
  return i18n[currentLang][key] || key;
}

function applyLanguage() {
  // Translate all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  // Update theme button
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtn.textContent = currentTheme === 'dark' ? t('nav.theme') === 'Dark' ? 'Dark' : 'Oscuro' : t('nav.theme') === 'Dark' ? 'Light' : 'Claro';
  }
  
  // Update music button
  const musicBtn = document.getElementById('music-toggle');
  if (musicBtn) {
    musicBtn.textContent = bgIsPlaying ? t('music.on') : t('music.off');
  }
  
  document.documentElement.lang = currentLang;
}

const Welcome = {
  init() {
    const modal = document.getElementById('welcome-modal');
    
    // Show music control if music was previously enabled
    const musicPref = localStorage.getItem('music');
    if (musicPref === 'yes') {
      const musicControl = document.getElementById('music-control');
      const musicBtn = document.getElementById('music-toggle');
      if (musicControl) musicControl.style.display = 'block';
      if (musicBtn) bgIsPlaying = true;
    }
    
    // Always show questionnaire
    modal.showModal();
    this.bindEvents();
    
    // Apply saved theme if exists
    const theme = localStorage.getItem('theme');
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    }
    
    // Init music if previously enabled
    if (musicPref === 'yes' && !bgAudio) {
      this.initMusic(true);
    }
    
    applyLanguage();
  },

  bindEvents() {
    const modal = document.getElementById('welcome-modal');
    const continueBtn = document.getElementById('welcome-continue');
    const options = modal.querySelectorAll('.welcome-opt');
    
    let selections = { theme: null, lang: null, music: null };

    options.forEach(opt => {
      opt.addEventListener('click', () => {
        // Remove active class from siblings in same group
        opt.parentElement.querySelectorAll('.welcome-opt').forEach(o => {
          o.classList.remove('active');
          o.style.backgroundColor = '';
          o.style.color = '';
        });
        
        // Mark selected
        opt.classList.add('active');
        
        const type = opt.dataset.theme ? 'theme' : opt.dataset.lang ? 'lang' : 'music';
        selections[type] = opt.dataset.theme || opt.dataset.lang || opt.dataset.music;
        
        // Enable continue when all 3 selected
        if (selections.theme && selections.lang && selections.music) {
          continueBtn.disabled = false;
          continueBtn.style.backgroundColor = 'var(--wood)';
          continueBtn.style.borderColor = 'var(--wood)';
          continueBtn.style.color = 'var(--cream)';
          continueBtn.style.cursor = 'pointer';
          continueBtn.style.opacity = '1';
        }
      });
    });

    continueBtn.addEventListener('click', () => {
      // Save preferences
      localStorage.setItem('theme', selections.theme);
      localStorage.setItem('lang', selections.lang);
      localStorage.setItem('music', selections.music);
      localStorage.setItem('welcome-completed', 'true');
      
      currentLang = selections.lang;
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', selections.theme);
      document.documentElement.style.colorScheme = selections.theme;
      
      // Update theme button text
      const themeToggleBtn = document.getElementById('theme-toggle');
      if (themeToggleBtn) {
        themeToggleBtn.textContent = selections.theme === 'dark' ? t('nav.theme') : t('nav.theme');
      }
      
      // Apply language to page
      applyLanguage();
      
      // Init music if selected - play on user interaction
      if (selections.music === 'yes') {
        // Create audio element synchronously within user gesture
        if (!bgAudio) {
          bgAudio = new Audio('mp3/waveloom-no-copyright-jazz-elegant-525518.mp3');
          bgAudio.loop = true;
          bgAudio.volume = 0.3;
          bgAudio.preload = 'auto';
        }
        
        // Show music control
        const musicControl = document.getElementById('music-control');
        const musicBtn = document.getElementById('music-toggle');
        if (musicControl) {
          musicControl.style.display = 'block';
          musicControl.style.visibility = 'visible';
          musicControl.style.opacity = '1';
        }
        
        // Play immediately within user gesture
        bgAudio.play().then(() => {
          bgIsPlaying = true;
          if (musicBtn) musicBtn.textContent = t('music.on');
          console.log('Music playing successfully');
        }).catch(error => {
          console.warn('Autoplay blocked:', error);
          bgIsPlaying = false;
          if (musicBtn) {
            musicBtn.textContent = t('music.activate');
            musicBtn.style.backgroundColor = 'var(--accent)';
            musicBtn.style.color = 'var(--cream)';
          }
        });
      }
      
      modal.close();
    });
  },

  applySavedPreferences() {
    const theme = localStorage.getItem('theme');
    const lang = localStorage.getItem('lang');
    
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    }
    if (lang) {
      currentLang = lang;
      document.documentElement.lang = lang;
    }
  },

  initMusic(autoplay = false) {
    const musicControl = document.getElementById('music-control');
    const musicBtn = document.getElementById('music-toggle');
    
    if (!musicControl || !musicBtn) {
      console.warn('Music control elements not found');
      return;
    }
    
    musicControl.style.display = 'block';
    musicControl.style.visibility = 'visible';
    musicControl.style.opacity = '1';
    
    // Create audio only once
    if (!bgAudio) {
      try {
        bgAudio = new Audio('mp3/waveloom-no-copyright-jazz-elegant-525518.mp3');
        bgAudio.loop = true;
        bgAudio.volume = 0.3;
        bgAudio.preload = 'auto';
      } catch (e) {
        console.error('Error creating audio element:', e);
        return;
      }
    }
    
    if (autoplay && !bgIsPlaying) {
      const playPromise = bgAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          bgIsPlaying = true;
          musicBtn.textContent = t('music.on');
          console.log('Music playing');
        }).catch(error => {
          console.warn('Autoplay blocked:', error);
          musicBtn.textContent = t('music.activate');
          musicBtn.style.backgroundColor = 'var(--accent)';
          musicBtn.style.color = 'var(--cream)';
          bgIsPlaying = false;
        });
      }
    } else {
      musicBtn.textContent = bgIsPlaying ? t('music.on') : t('music.off');
    }
    
    // Replace existing listener
    const newBtn = musicBtn.cloneNode(true);
    if (musicBtn.parentNode) {
      musicBtn.parentNode.replaceChild(newBtn, musicBtn);
    }
    
    newBtn.addEventListener('click', () => {
      if (!bgAudio) return;
      
      if (bgIsPlaying) {
        bgAudio.pause();
        newBtn.textContent = t('music.off');
        bgIsPlaying = false;
      } else {
        bgAudio.play().then(() => {
          newBtn.textContent = t('music.on');
          bgIsPlaying = true;
        }).catch(error => {
          console.warn('Play failed:', error);
        });
      }
    });
  }
};

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Welcome.init());
} else {
  Welcome.init();
}