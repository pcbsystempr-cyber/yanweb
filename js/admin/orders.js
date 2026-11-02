import supabase from '../supabase-client.js';

const AdminOrders = {
  orders: [],
  currentFilter: '',

  async init() {
    // Check admin authentication before loading orders
    const isAdmin = await this.checkAdminAuth();
    if (!isAdmin) {
      this.showAccessDenied();
      return;
    }
    this.bindEvents();
    await this.loadOrders();
    this.startAutoRefresh();
  },

  async checkAdminAuth() {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error checking admin auth:', error);
      return false;
    }
  },

  showAccessDenied() {
    const listEl = document.getElementById('orders-list');
    const emptyEl = document.getElementById('orders-empty');
    if (listEl) listEl.innerHTML = '';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '<p>Acceso denegado. Solo administradores.</p>';
    }
    // Hide pending count
    const countEl = document.getElementById('pending-count');
    if (countEl) countEl.textContent = '0';
  },

  bindEvents() {
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.render();
      });
    }
  },

  async loadOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_phone,
          notes,
          municipality_id,
          subtotal,
          shipping_cost,
          total,
          status,
          admin_notes,
          created_at,
          order_items (
            product_name,
            unit_price,
            qty
          ),
          municipalities (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.orders = data || [];
      this.render();
      this.updatePendingCount();
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  },

  startAutoRefresh() {
    setInterval(() => this.loadOrders(), 30000);
  },

  getFilteredOrders() {
    if (!this.currentFilter) return this.orders;
    return this.orders.filter(o => o.status === this.currentFilter);
  },

  updatePendingCount() {
    const count = this.orders.filter(o => o.status === 'pendiente').length;
    const countEl = document.getElementById('pending-count');
    if (countEl) {
      countEl.textContent = count;
    }
  },

  render() {
    const listEl = document.getElementById('orders-list');
    const emptyEl = document.getElementById('orders-empty');
    const filtered = this.getFilteredOrders();

    if (filtered.length === 0) {
      if (listEl) listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) {
      listEl.innerHTML = filtered.map(order => this.renderOrderCard(order)).join('');
      this.bindOrderEvents();
    }
  },

  renderOrderCard(order) {
    const municipality = order.municipalities?.name || 'Desconocido';
    const items = order.order_items || [];
    const createdAt = new Date(order.created_at).toLocaleString('es-PR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-card-header">
          <span class="order-card-id">#${order.id} · ${createdAt}</span>
          <div class="order-card-status">
            <select class="order-status-select status-${order.status}" data-order-id="${order.id}">
              <option value="pendiente" ${order.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="confirmado" ${order.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
              <option value="en_produccion" ${order.status === 'en_produccion' ? 'selected' : ''}>En producción</option>
              <option value="entregado" ${order.status === 'entregado' ? 'selected' : ''}>Entregado</option>
              <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </div>
        </div>
        <div class="order-card-body">
          <div class="order-info-row">
            <span class="order-info-label">Cliente:</span>
            <span class="order-info-value">${this.escapeHtml(order.customer_name)}</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-label">Teléfono:</span>
            <span class="order-info-value"><a href="tel:${this.escapeHtml(order.customer_phone)}">${this.escapeHtml(order.customer_phone)}</a></span>
          </div>
          <div class="order-info-row">
            <span class="order-info-label">Municipio:</span>
            <span class="order-info-value">${this.escapeHtml(municipality)}</span>
          </div>
          <div class="order-products">
            ${items.map(item => `
              <div class="order-product-item">
                <span class="order-product-name">${this.escapeHtml(item.product_name)}</span>
                <span class="order-product-qty">x${item.qty} · $${Number(item.unit_price).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="order-total">
            <span>Total:</span>
            <span>$${Number(order.total).toFixed(2)}</span>
          </div>
          <div class="order-actions">
            <a href="tel:${this.escapeHtml(order.customer_phone)}" class="order-action-btn call">📞 Llamar</a>
            <a href="https://wa.me/${this.escapeHtml(order.customer_phone)}?text=${encodeURIComponent(this.getWhatsAppMessage(order))}" target="_blank" rel="noopener noreferrer" class="order-action-btn whatsapp">💬 WhatsApp</a>
          </div>
          <div class="order-notes">
            <label class="order-notes-label">Notas internas</label>
            <textarea class="order-notes-textarea" data-order-id="${order.id}" placeholder="Notas internas para el equipo...">${this.escapeHtml(order.admin_notes || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  },

  getWhatsAppMessage(order) {
    const items = order.order_items || [];
    const itemsText = items.map(i => `• ${i.product_name} x${i.qty}`).join('\n');
    return `Hola ${order.customer_name},\n\nTu pedido #${order.id}:\n${itemsText}\n\nTotal: $${Number(order.total).toFixed(2)}\n\nEstado: ${order.status}\n\nGracias por confiar en Omy's Wood Art.`;
  },

  bindOrderEvents() {
    // Status change
    document.querySelectorAll('.order-status-select').forEach(select => {
      select.addEventListener('change', (e) => this.handleStatusChange(e));
    });

    // Admin notes change
    document.querySelectorAll('.order-notes-textarea').forEach(textarea => {
      let timeout;
      textarea.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => this.handleNotesChange(e), 500);
      });
    });
  },

  async handleStatusChange(e) {
    const orderId = e.target.dataset.orderId;
    const newStatus = e.target.value;
    const card = e.target.closest('.order-card');
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local data
      const order = this.orders.find(o => o.id == orderId);
      if (order) order.status = newStatus;
      
      // Update select class
      e.target.className = `order-status-select status-${newStatus}`;
      
      this.updatePendingCount();
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert on error
      const order = this.orders.find(o => o.id == orderId);
      if (order) e.target.value = order.status;
      alert('Error al actualizar estado');
    }
  },

  async handleNotesChange(e) {
    const orderId = e.target.dataset.orderId;
    const notes = e.target.value;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ admin_notes: notes, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      const order = this.orders.find(o => o.id == orderId);
      if (order) order.admin_notes = notes;
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminOrders.init());
} else {
  AdminOrders.init();
}