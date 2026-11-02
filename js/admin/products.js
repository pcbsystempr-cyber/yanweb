import supabase from '../supabase-client.js';

const AdminProducts = {
  products: [],
  categories: [],
  currentProductId: null,
  isEditing: false,
  imagePreviews: [],

  async init() {
    await this.loadCategories();
    this.bindEvents();
    await this.loadProducts();
  },

  async loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      this.categories = data || [];
      this.populateCategorySelects();
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  },

  populateCategorySelects() {
    const selects = document.querySelectorAll('.product-category-select');
    selects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Selecciona categoría</option>' +
        this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (currentValue) select.value = currentValue;
    });
  },

  bindEvents() {
    // Add product button
    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openProductModal());
    }

    // Product form submit
    const form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleProductSubmit(e));
    }

    // Cancel button
    const cancelBtn = document.getElementById('product-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeProductModal());
    }

    // Image input
    const imageInput = document.getElementById('product-images');
    if (imageInput) {
      imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
    }

    // Close modal on backdrop click
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeProductModal();
      });
    }

    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
    }

    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
    }
  },

  async loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          images,
          active,
          sort_order,
          category_id,
          categories:category_id (id, name)
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      this.products = data || [];
      this.render();
    } catch (error) {
      console.error('Error loading products:', error);
      this.showMessage('Error al cargar productos', 'error');
    }
  },

  render() {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('products-empty');
    
    if (!grid) return;

    if (this.products.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    
    grid.innerHTML = this.products.map(product => this.renderProductCard(product)).join('');
    this.bindProductCardEvents();
  },

  renderProductCard(product) {
    const category = product.categories?.name || 'Sin categoría';
    const price = Number(product.price).toFixed(2);
    const mainImage = product.images?.[0] || '../assets/hero-banner.jpg';
    const statusClass = product.active ? 'status-active' : 'status-inactive';
    const statusText = product.active ? 'Activo' : 'Inactivo';

    return `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-card-image">
          <img src="${mainImage}" alt="${this.escapeHtml(product.name)}" onerror="this.src='../assets/hero-banner.jpg'">
          <span class="product-status ${statusClass}">${statusText}</span>
        </div>
        <div class="product-card-content">
          <h3 class="product-card-name">${this.escapeHtml(product.name)}</h3>
          <p class="product-card-category">${this.escapeHtml(category)}</p>
          <p class="product-card-price">$${price}</p>
          <div class="product-card-actions">
            <button class="btn-icon btn-edit" data-action="edit" aria-label="Editar">✏️</button>
            <button class="btn-icon btn-duplicate" data-action="duplicate" aria-label="Duplicar">📋</button>
            <button class="btn-icon btn-delete" data-action="delete" aria-label="Eliminar">🗑️</button>
          </div>
        </div>
      </div>
    `;
  },

  bindProductCardEvents() {
    document.querySelectorAll('.product-card').forEach(card => {
      const productId = card.dataset.productId;
      
      card.querySelector('[data-action="edit"]').addEventListener('click', () => this.openProductModal(productId));
      card.querySelector('[data-action="duplicate"]').addEventListener('click', () => this.duplicateProduct(productId));
      card.querySelector('[data-action="delete"]').addEventListener('click', () => this.openDeleteModal(productId));
    });
  },

  openProductModal(productId = null) {
    this.isEditing = !!productId;
    this.currentProductId = productId;
    this.imagePreviews = [];

    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    const submitBtn = document.getElementById('product-submit-btn');
    const imagePreview = document.getElementById('image-preview');

    if (title) title.textContent = this.isEditing ? 'Editar Producto' : 'Nuevo Producto';
    if (submitBtn) submitBtn.textContent = this.isEditing ? 'Guardar Cambios' : 'Crear Producto';
    if (imagePreview) imagePreview.innerHTML = '';

    if (form) form.reset();

    if (this.isEditing) {
      const product = this.products.find(p => p.id == productId);
      if (product) {
        this.populateForm(product);
      }
    }

    if (modal) modal.showModal();
  },

  populateForm(product) {
    const fields = {
      'product-name': product.name,
      'product-price': product.price,
      'product-description': product.description || '',
      'product-category': product.category_id || '',
      'product-sort-order': product.sort_order || 0,
      'product-active': product.active
    };

    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = value;
        } else {
          el.value = value;
        }
      }
    });

    // Show existing images
    if (product.images && product.images.length > 0) {
      const preview = document.getElementById('image-preview');
      if (preview) {
        product.images.forEach((img, index) => {
          this.addImagePreview(img, index, true);
        });
      }
    }
  },

  closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.close();
    this.currentProductId = null;
    this.isEditing = false;
    this.imagePreviews = [];
  },

  handleImageSelect(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('image-preview');
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      this.compressAndPreview(file);
    });
  },

  compressAndPreview(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Max dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP
        canvas.toBlob((blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
              type: 'image/webp',
              lastModified: Date.now()
            });
            this.addImagePreview(URL.createObjectURL(webpFile), this.imagePreviews.length, false, webpFile);
            this.imagePreviews.push(webpFile);
            resolve(webpFile);
          }
        }, 'image/webp', 0.8);
      };
      
      reader.readAsDataURL(file);
    });
  },

  addImagePreview(src, index, isExisting = false, file = null) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview-item';
    wrapper.dataset.index = index;
    
    wrapper.innerHTML = `
      <img src="${src}" alt="Preview ${index + 1}">
      <button type="button" class="image-remove-btn" aria-label="Eliminar imagen">✕</button>
      ${!isExisting ? '<span class="image-badge">Nueva</span>' : ''}
    `;

    wrapper.querySelector('.image-remove-btn').addEventListener('click', () => {
      if (!isExisting) {
        this.imagePreviews = this.imagePreviews.filter((_, i) => i !== index);
        // Re-index remaining
        this.refreshImagePreviews();
      } else {
        // For existing images, mark for deletion
        wrapper.classList.add('marked-for-deletion');
        wrapper.querySelector('img').style.opacity = '0.5';
      }
    });

    preview.appendChild(wrapper);
  },

  refreshImagePreviews() {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    const newFiles = this.imagePreviews;
    this.imagePreviews = [];
    preview.innerHTML = '';
    
    newFiles.forEach((file, index) => {
      this.addImagePreview(URL.createObjectURL(file), index, false, file);
    });
  },

  async handleProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('product-submit-btn');
    const messageEl = document.getElementById('product-form-message');
    
    const name = document.getElementById('product-name').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const description = document.getElementById('product-description').value.trim();
    const categoryId = document.getElementById('product-category').value;
    const sortOrder = parseInt(document.getElementById('product-sort-order').value) || 0;
    const active = document.getElementById('product-active').checked;

    if (!name) {
      this.showFormMessage('El nombre es requerido', 'error');
      return;
    }
    if (isNaN(price) || price < 0) {
      this.showFormMessage('Precio inválido', 'error');
      return;
    }
    if (!categoryId) {
      this.showFormMessage('Selecciona una categoría', 'error');
      return;
    }

    this.setFormLoading(true);
    this.hideFormMessage();

    try {
      let imageUrls = [];
      
      // Upload new images first
      if (this.imagePreviews.length > 0) {
        imageUrls = await this.uploadImages(this.imagePreviews);
      }

      // Get existing images that weren't marked for deletion
      if (this.isEditing) {
        const product = this.products.find(p => p.id == this.currentProductId);
        if (product && product.images) {
          const preview = document.getElementById('image-preview');
          const keptImages = [];
          
          if (preview) {
            preview.querySelectorAll('.image-preview-item:not(.marked-for-deletion)').forEach((item, index) => {
              const img = item.querySelector('img');
              if (img && img.src.startsWith('http')) {
                // Extract URL from existing image
                const existingImg = product.images[index];
                if (existingImg) keptImages.push(existingImg);
              }
            });
          }
          
          // Combine kept existing images with new ones
          imageUrls = [...keptImages, ...imageUrls];
        }
      }

      const productData = {
        name,
        price,
        description: description || null,
        category_id: categoryId,
        sort_order: sortOrder,
        active,
        images: imageUrls
      };

      let result;
      if (this.isEditing) {
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', this.currentProductId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      this.showFormMessage(this.isEditing ? 'Producto actualizado correctamente' : 'Producto creado correctamente', 'success');
      
      setTimeout(() => {
        this.closeProductModal();
        this.loadProducts();
      }, 1500);

    } catch (error) {
      console.error('Error saving product:', error);
      this.showFormMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      this.setFormLoading(false);
    }
  },

  async uploadImages(files) {
    const urls = [];
    const timestamp = Date.now();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${timestamp}-${i}-${file.name}`;
      const filePath = `products/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          contentType: 'image/webp',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Error subiendo imagen ${i + 1}: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      
      urls.push(urlData.publicUrl);
    }
    
    return urls;
  },

  async duplicateProduct(productId) {
    const product = this.products.find(p => p.id == productId);
    if (!product) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: `${product.name} (Copia)`,
          price: product.price,
          description: product.description,
          category_id: product.category_id,
          sort_order: (product.sort_order || 0) + 1,
          active: false, // Duplicates start as inactive
          images: product.images || []
        })
        .select()
        .single();

      if (error) throw error;

      this.showMessage('Producto duplicado correctamente', 'success');
      this.loadProducts();
    } catch (error) {
      console.error('Error duplicating product:', error);
      this.showMessage(`Error al duplicar: ${this.escapeHtml(error.message)}`, 'error');
    }
  },

  openDeleteModal(productId) {
    this.currentProductId = productId;
    const modal = document.getElementById('delete-modal');
    const product = this.products.find(p => p.id == productId);
    
    if (modal) {
      const nameEl = document.getElementById('delete-product-name');
      if (nameEl && product) nameEl.textContent = product.name;
      modal.showModal();
    }
  },

  closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.close();
    this.currentProductId = null;
  },

  async confirmDelete() {
    if (!this.currentProductId) return;

    const confirmBtn = document.getElementById('confirm-delete-btn');
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Eliminando...';

    try {
      // Delete product (cascade will handle order_items, images in storage need manual cleanup)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', this.currentProductId);

      if (error) throw error;

      this.showMessage('Producto eliminado correctamente', 'success');
      this.closeDeleteModal();
      this.loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      this.showMessage(`Error al eliminar: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalText;
    }
  },

  showMessage(message, type) {
    const container = document.getElementById('products-message');
    if (!container) return;
    
    container.innerHTML = `<div class="message message-${type}">${this.escapeHtml(message)}</div>`;
    container.style.display = 'block';
    
    setTimeout(() => {
      container.style.display = 'none';
      container.innerHTML = '';
    }, 4000);
  },

  showFormMessage(message, type) {
    const el = document.getElementById('product-form-message');
    if (!el) return;
    
    el.textContent = message;
    el.className = `form-message form-message-${type}`;
    el.style.display = 'block';
  },

  hideFormMessage() {
    const el = document.getElementById('product-form-message');
    if (el) {
      el.style.display = 'none';
      el.className = 'form-message';
    }
  },

  setFormLoading(loading) {
    const submitBtn = document.getElementById('product-submit-btn');
    const cancelBtn = document.getElementById('product-cancel-btn');
    const inputs = document.querySelectorAll('#product-form input, #product-form select, #product-form textarea');
    
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? (this.isEditing ? 'Guardando...' : 'Creando...') : (this.isEditing ? 'Guardar Cambios' : 'Crear Producto');
    }
    if (cancelBtn) cancelBtn.disabled = loading;
    inputs.forEach(input => input.disabled = loading);
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
  document.addEventListener('DOMContentLoaded', () => AdminProducts.init());
} else {
  AdminProducts.init();
}

window.AdminProducts = AdminProducts;