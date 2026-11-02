import supabase from '../supabase-client.js';

const AdminBrand = {
  brandItems: [
    { key: 'hero_banner', label: 'Banner Principal (Hero)', currentUrl: '' },
    { key: 'logo_seal', label: 'Sello / Logo Pequeño', currentUrl: '' },
    { key: 'logo_full', label: 'Logo Completo', currentUrl: '' }
  ],
  imagePreviews: {},

  async init() {
    this.bindEvents();
    await this.loadBrandContent();
  },

  bindEvents() {
    // File inputs
    this.brandItems.forEach(item => {
      const input = document.getElementById(`brand-${item.key}`);
      if (input) {
        input.addEventListener('change', (e) => this.handleImageSelect(e, item.key));
      }
    });

    // Save button
    const saveBtn = document.getElementById('brand-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveAll());
    }

    // Reset buttons
    this.brandItems.forEach(item => {
      const resetBtn = document.getElementById(`brand-reset-${item.key}`);
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.resetToDefault(item.key));
      }
    });
  },

  async loadBrandContent() {
    try {
      const { data, error } = await supabase
        .from('site_content')
        .select('key, value')
        .in('key', ['hero_banner', 'logo_seal', 'logo_full']);

      if (error) throw error;

      const contentMap = (data || []).reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      this.brandItems.forEach(item => {
        const url = contentMap[item.key] || this.getDefaultUrl(item.key);
        item.currentUrl = url;
        this.updatePreview(item.key, url);
      });
    } catch (error) {
      console.error('Error loading brand content:', error);
      this.showMessage('Error al cargar contenido de marca', 'error');
    }
  },

  getDefaultUrl(key) {
    const defaults = {
      hero_banner: '../assets/hero-banner.jpg',
      logo_seal: '../assets/logo-sello.png',
      logo_full: '../assets/logo-full.jpg'
    };
    return defaults[key] || '';
  },

  updatePreview(key, url) {
    const preview = document.getElementById(`preview-${key}`);
    const input = document.getElementById(`brand-${key}`);
    
    if (preview) {
      preview.innerHTML = `<img src="${url}" alt="${this.brandItems.find(i => i.key === key)?.label}" onerror="this.src='../assets/hero-banner.jpg'">`;
    }
    if (input) {
      input.dataset.currentUrl = url;
    }
  },

  handleImageSelect(e, key) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      this.imagePreviews[key] = file;
      this.updatePreview(key, event.target.result);
      this.showMessage(`Imagen seleccionada para ${this.getLabel(key)}`, 'success');
    };
    reader.readAsDataURL(file);
  },

  getLabel(key) {
    const item = this.brandItems.find(i => i.key === key);
    return item ? item.label : key;
  },

  async saveAll() {
    const saveBtn = document.getElementById('brand-save-btn');
    const hasChanges = Object.keys(this.imagePreviews).length > 0;

    if (!hasChanges) {
      this.showMessage('No hay cambios para guardar', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
      const uploads = [];

      for (const [key, file] of Object.entries(this.imagePreviews)) {
        const compressedFile = await this.compressImage(file);
        const fileName = `${key}-${Date.now()}.webp`;
        const filePath = `brand/${fileName}`;

        const { data, error } = await supabase.storage
          .from('site-assets')
          .upload(filePath, compressedFile, {
            contentType: 'image/webp',
            upsert: true
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('site-assets')
          .getPublicUrl(filePath);

        uploads.push({ key, url: urlData.publicUrl });
      }

      // Save URLs to site_content
      const upserts = uploads.map(({ key, url }) =>
        supabase
          .from('site_content')
          .upsert({ key, value: url, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      );

      const results = await Promise.all(upserts);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      // Update local state
      uploads.forEach(({ key, url }) => {
        const item = this.brandItems.find(i => i.key === key);
        if (item) item.currentUrl = url;
      });

      this.imagePreviews = {};
      this.showMessage('Imágenes de marca actualizadas correctamente', 'success');
    } catch (error) {
      console.error('Error saving brand:', error);
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar Cambios';
    }
  },

  compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Max dimensions for brand images
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(webpFile);
          }
        }, 'image/webp', 0.85);
      };
      
      reader.readAsDataURL(file);
    });
  },

  resetToDefault(key) {
    const defaultUrl = this.getDefaultUrl(key);
    this.updatePreview(key, defaultUrl);
    
    // Clear file input
    const input = document.getElementById(`brand-${key}`);
    if (input) input.value = '';
    
    // Remove from previews if it was a new upload
    delete this.imagePreviews[key];
    
    this.showMessage(`Restaurado a imagen por defecto para ${this.getLabel(key)}`, 'success');
  },

  showMessage(message, type) {
    const container = document.getElementById('brand-message');
    if (!container) return;
    
    container.innerHTML = `<div class="message message-${type}">${this.escapeHtml(message)}</div>`;
    container.style.display = 'block';
    
    setTimeout(() => {
      container.style.display = 'none';
      container.innerHTML = '';
    }, 4000);
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminBrand.init());
} else {
  AdminBrand.init();
}

window.AdminBrand = AdminBrand;