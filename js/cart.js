import supabase from './supabase-client.js';

const Cart = {
  items: [],
  dialog: null,
  orderDialog: null,
  municipalityId: null,

  init() {
    this.loadFromStorage();
    this.createDialogs();
    this.bindEvents();
    this.render();
  },

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('omys_cart');
      if (stored) {
        this.items = JSON.parse(stored);
      }
    } catch (e) {
      this.items = [];
    }
  },

  saveToStorage() {
    localStorage.setItem('omys_cart', JSON.stringify(this.items));
  },

  createDialogs() {
    // Cart dialog
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'cart-dialog';
    this.dialog.innerHTML = `
      <div class="cart-header">
        <h2 class="cart-title">Tu Pedido</h2>
        <button class="cart-close" aria-label="Cerrar carrito">&times;</button>
      </div>
      <div class="cart-body" id="cart-body"></div>
      <div class="cart-footer">
        <div class="cart-municipality">
          <label for="cart-municipality">Municipio para envío</label>
          <select id="cart-municipality"></select>
        </div>
        <div class="cart-summary" id="cart-summary"></div>
        <button class="btn cart-checkout-btn" id="cart-checkout-btn" disabled>Ordenar</button>
      </div>
    `;
    document.body.appendChild(this.dialog);

    // Order form dialog
    this.orderDialog = document.createElement('dialog');
    this.orderDialog.className = 'order-form-dialog';
    this.orderDialog.innerHTML = `
      <div class="order-form-header">
        <h2 class="order-form-title">Confirmar Pedido</h2>
      </div>
      <div class="order-form-body">
        <form id="order-form" novalidate>
          <div class="order-form-group">
            <label class="order-form-label" for="order-name">Nombre *</label>
            <input type="text" id="order-name" class="order-form-input" required>
          </div>
          <div class="order-form-group">
            <label class="order-form-label" for="order-phone">Teléfono (Puerto Rico) *</label>
            <input type="tel" id="order-phone" class="order-form-input" placeholder="787-555-0123" required>
          </div>
          <div class="order-form-group">
            <label class="order-form-label" for="order-notes">Notas</label>
            <textarea id="order-notes" class="order-form-textarea" placeholder="Instrucciones de entrega, referencias, etc."></textarea>
          </div>
          <!-- Campo trampa anti-spam -->
          <div class="order-form-honeypot" aria-hidden="true">
            <label for="order-website">Sitio web</label>
            <input type="text" id="order-website" name="website" tabindex="-1" autocomplete="off">
          </div>
          <button type="submit" class="btn order-form-submit" id="order-submit-btn">Confirmar Pedido</button>
          <div id="order-message" class="order-form-message"></div>
        </form>
      </div>
    `;
    document.body.appendChild(this.orderDialog);
  },

  bindEvents() {
    // Cart dialog events
    this.dialog.querySelector('.cart-close').addEventListener('click', () => this.close());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    // Municipality selector
    const munSelect = this.dialog.querySelector('#cart-municipality');
    munSelect.addEventListener('change', () => {
      this.municipalityId = munSelect.value || null;
      this.renderSummary();
    });

    // Checkout button
    this.dialog.querySelector('#cart-checkout-btn').addEventListener('click', () => this.openOrderForm());

    // Order form events
    this.orderDialog.querySelector('#order-form').addEventListener('submit', (e) => this.handleOrderSubmit(e));
    this.orderDialog.addEventListener('click', (e) => {
      if (e.target === this.orderDialog) this.closeOrderForm();
    });
  },

  addItem(product) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || 'assets/hero-banner.jpg',
        qty: 1
      });
    }
    this.saveToStorage();
    this.render();
    this.open();
  },

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.saveToStorage();
    this.render();
  },

  updateQty(productId, qty) {
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.qty = Math.max(1, qty);
      this.saveToStorage();
      this.render();
    }
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  async calculateShipping() {
    if (!this.municipalityId || this.items.length === 0) return 0;

    try {
      const config = window.SUPABASE_CONFIG || { url: '', anonKey: '' };
      const functionUrl = `${config.url}/functions/v1/calculate-shipping`;
      
      // Calculate total weight and dimensions from items (simplified)
      // Use default values if product doesn't have dimensions (weight: 1kg, 30x20x10 cm)
      const totalWeight = this.items.reduce((sum, item) => sum + (item.weight || 1) * item.qty, 0);
      const maxLength = Math.max(...this.items.map(item => item.length || 30));
      const maxWidth = Math.max(...this.items.map(item => item.width || 20));
      const maxHeight = Math.max(...this.items.map(item => item.height || 10));
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
        },
        body: JSON.stringify({
          municipalityId: this.municipalityId,
          weightKg: totalWeight,
          lengthCm: maxLength,
          widthCm: maxWidth,
          heightCm: maxHeight,
          orderAmount: this.getSubtotal(),
        }),
      });
      
      const data = await response.json();
      return response.ok ? data.deliveryPrice : 0;
    } catch (e) {
      console.error('Error calculating shipping:', e);
      return 0;
    }
  },

  async renderSummary() {
    const summaryEl = this.dialog.querySelector('#cart-summary');
    const checkoutBtn = this.dialog.querySelector('#cart-checkout-btn');
    const subtotal = this.getSubtotal();
    
    let shipping = 0;
    if (this.municipalityId) {
      shipping = await this.calculateShipping();
    }
    
    const total = subtotal + shipping;
    
    summaryEl.innerHTML = `
      <div class="cart-summary-row">
        <span>Subtotal</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      <div class="cart-summary-row">
        <span>Envío</span>
        <span>${this.municipalityId ? '$' + shipping.toFixed(2) : 'Selecciona municipio'}</span>
      </div>
      <div class="cart-summary-row total">
        <span>Total</span>
        <span>$${total.toFixed(2)}</span>
      </div>
    `;
    
    checkoutBtn.disabled = this.items.length === 0 || !this.municipalityId;
  },

  render() {
    // Render cart body
    const bodyEl = this.dialog.querySelector('#cart-body');
    
    if (this.items.length === 0) {
      bodyEl.innerHTML = '<div class="cart-empty">Tu carrito está vacío</div>';
    } else {
      bodyEl.innerHTML = `
        <div class="cart-items" id="cart-items"></div>
      `;
      const itemsEl = bodyEl.querySelector('#cart-items');
      itemsEl.innerHTML = this.items.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="${this.escapeHtml(item.name)}" class="cart-item-image" onerror="this.src='assets/hero-banner.jpg'">
          <div class="cart-item-info">
            <span class="cart-item-name">${this.escapeHtml(item.name)}</span>
            <span class="cart-item-price">$${Number(item.price).toFixed(2)} c/u</span>
          </div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" data-action="decrease" aria-label="Disminuir">−</button>
            <input type="number" class="cart-qty-input" value="${item.qty}" min="1" max="99" readonly>
            <button class="cart-qty-btn" data-action="increase" aria-label="Aumentar">+</button>
          </div>
          <div class="cart-item-total">$${(Number(item.price) * item.qty).toFixed(2)}</div>
          <button class="cart-item-remove" aria-label="Eliminar">✕</button>
        </div>
      `).join('');
      
      // Bind item events
      itemsEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const itemEl = e.target.closest('.cart-item');
          const id = Number(itemEl.dataset.id);
          const action = e.target.dataset.action;
          const item = this.items.find(i => i.id === id);
          if (item) {
            this.updateQty(id, action === 'increase' ? item.qty + 1 : item.qty - 1);
          }
        });
      });
      
      itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const itemEl = e.target.closest('.cart-item');
          const id = Number(itemEl.dataset.id);
          this.removeItem(id);
        });
      });
      
      itemsEl.querySelectorAll('.cart-qty-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const itemEl = e.target.closest('.cart-item');
          const id = Number(itemEl.dataset.id);
          const qty = Math.max(1, parseInt(e.target.value) || 1);
          this.updateQty(id, qty);
        });
      });
    }
    
    // Render municipality selector
    this.renderMunicipalities();
    this.renderSummary();
  },

  async renderMunicipalities() {
    const select = this.dialog.querySelector('#cart-municipality');
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      
      select.innerHTML = '<option value="">Selecciona un municipio</option>' +
        (data || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
      
      if (this.municipalityId) {
        select.value = this.municipalityId;
      }
    } catch (e) {
      console.error('Error loading municipalities:', e);
    }
  },

  open() {
    this.render();
    this.dialog.showModal();
  },

  close() {
    this.dialog.close();
  },

  openOrderForm() {
    this.close();
    this.orderDialog.showModal();
  },

  closeOrderForm() {
    this.orderDialog.close();
  },

  async handleOrderSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const name = form.querySelector('#order-name').value.trim();
    const phone = form.querySelector('#order-phone').value.trim();
    const notes = form.querySelector('#order-notes').value.trim();
    const website = form.querySelector('#order-website').value.trim();
    const submitBtn = form.querySelector('#order-submit-btn');
    const messageEl = form.querySelector('#order-message');
    
    // Anti-spam honeypot
    if (website) {
      messageEl.textContent = '¡Gracias! Le estaremos llamando próximamente para confirmar su pedido.';
      messageEl.className = 'order-form-message success';
      setTimeout(() => this.closeOrderForm(), 2000);
      return;
    }
    
    // Validate Puerto Rico phone format
    const phoneRegex = /^(?:\+?1[-.\s]?)?(?:\(?787\)?|\(?939\)?)[-.\s]?\d{3}[-.\s]?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      messageEl.textContent = 'Formato de teléfono inválido. Use formato de Puerto Rico (ej: 787-555-0123)';
      messageEl.className = 'order-form-message error';
      return;
    }
    
    if (!name) {
      messageEl.textContent = 'El nombre es requerido';
      messageEl.className = 'order-form-message error';
      return;
    }
    
    if (!this.municipalityId) {
      messageEl.textContent = 'Selecciona un municipio para el envío';
      messageEl.className = 'order-form-message error';
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';
    
    try {
      const config = window.SUPABASE_CONFIG || { url: '', anonKey: '' };
      const functionUrl = `${config.url}/functions/v1/create-order`;
      
      const orderItems = this.items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        qty: item.qty
      }));
      
      const subtotal = this.getSubtotal();
      const shipping = await this.calculateShipping();
      const total = subtotal + shipping;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.anonKey,
        },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          notes,
          municipality_id: this.municipalityId,
          subtotal,
          shipping_cost: shipping,
          total,
          items: orderItems
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Error al crear el pedido');
      
      // Success
      messageEl.textContent = '¡Gracias! Le estaremos llamando próximamente para confirmar su pedido.';
      messageEl.className = 'order-form-message success';
      
      // Clear cart
      this.items = [];
      this.saveToStorage();
      this.render();
      
      setTimeout(() => {
        this.closeOrderForm();
        form.reset();
        messageEl.textContent = '';
        messageEl.className = 'order-form-message';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Pedido';
      }, 3000);
      
    } catch (error) {
      messageEl.textContent = `Error: ${this.escapeHtml(error.message)}`;
      messageEl.className = 'order-form-message error';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Pedido';
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize cart when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Cart.init());
} else {
  Cart.init();
}

// Export for use in catalog.js
window.Cart = Cart;