import supabase from '../supabase-client.js';

const AdminLeads = {
  leads: [],
  currentFilter: '',
  leadStates: [
    'nuevo',
    'info_pendiente',
    'cotizacion_enviada',
    'seguimiento_1',
    'seguimiento_2',
    'aprobado',
    'en_produccion',
    'entregado',
    'no_convertido'
  ],
  stateLabels: {
    nuevo: 'Nuevo',
    info_pendiente: 'Información pendiente',
    cotizacion_enviada: 'Cotización enviada',
    seguimiento_1: 'Seguimiento 1',
    seguimiento_2: 'Seguimiento 2',
    aprobado: 'Aprobado',
    en_produccion: 'En producción',
    entregado: 'Entregado',
    no_convertido: 'No convertido'
  },
  stateColors: {
    nuevo: 'accent',
    info_pendiente: 'cta',
    cotizacion_enviada: 'wood',
    seguimiento_1: 'cta',
    seguimiento_2: 'wood',
    aprobado: 'accent',
    en_produccion: 'wood',
    entregado: 'accent',
    no_convertido: 'muted'
  },

  async init() {
    this.bindEvents();
    await this.loadLeads();
  },

  bindEvents() {
    // Status filter
    const statusFilter = document.getElementById('lead-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.render();
      });
    }

    // Search
    const searchInput = document.getElementById('lead-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterLeads(e.target.value));
    }

    // Refresh button
    const refreshBtn = document.getElementById('leads-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadLeads());
    }
  },

  async loadLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          phone,
          message,
          product_id,
          municipality_id,
          status,
          active,
          created_at,
          products:product_id (name),
          municipalities:municipality_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.leads = data || [];
      this.render();
    } catch (error) {
      console.error('Error loading leads:', error);
      this.showMessage('Error al cargar cotizaciones', 'error');
    }
  },

  filterLeads(searchTerm) {
    const term = searchTerm.toLowerCase();
    const rows = document.querySelectorAll('#leads-table tbody tr');
    
    rows.forEach(row => {
      const name = row.dataset.name?.toLowerCase() || '';
      const email = row.dataset.email?.toLowerCase() || '';
      const phone = row.dataset.phone?.toLowerCase() || '';
      const matches = name.includes(term) || email.includes(term) || phone.includes(term);
      row.style.display = matches ? '' : 'none';
    });
  },

  getFilteredLeads() {
    if (!this.currentFilter) return this.leads;
    return this.leads.filter(l => l.status === this.currentFilter);
  },

  render() {
    const tbody = document.getElementById('leads-tbody');
    const empty = document.getElementById('leads-empty');
    
    if (!tbody) return;

    const filtered = this.getFilteredLeads();

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = filtered.map(lead => this.renderLeadRow(lead)).join('');
    this.bindLeadEvents();
  },

  renderLeadRow(lead) {
    const product = lead.products?.name || '—';
    const municipality = lead.municipalities?.name || '—';
    const createdAt = new Date(lead.created_at).toLocaleString('es-PR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const stateLabel = this.stateLabels[lead.status] || lead.status;
    const stateColor = this.stateColors[lead.status] || 'muted';

    return `
      <tr data-id="${lead.id}" data-name="${this.escapeHtml(lead.name)}" data-email="${this.escapeHtml(lead.email || '')}" data-phone="${this.escapeHtml(lead.phone || '')}">
        <td class="col-date">${createdAt}</td>
        <td class="col-name">${this.escapeHtml(lead.name)}</td>
        <td class="col-contact">
          ${lead.phone ? `<a href="tel:${this.escapeHtml(lead.phone)}">${this.escapeHtml(lead.phone)}</a>` : '—'}
          ${lead.email ? `<br><a href="mailto:${this.escapeHtml(lead.email)}">${this.escapeHtml(lead.email)}</a>` : ''}
        </td>
        <td class="col-product">${this.escapeHtml(product)}</td>
        <td class="col-municipality">${this.escapeHtml(municipality)}</td>
        <td class="col-status">
          <select class="lead-status-select status-${lead.status}" data-lead-id="${lead.id}">
            ${this.leadStates.map(s => `
              <option value="${s}" ${lead.status === s ? 'selected' : ''}>${this.stateLabels[s]}</option>
            `).join('')}
          </select>
        </td>
        <td class="col-actions">
          <a href="https://wa.me/${this.escapeHtml(lead.phone)}?text=${encodeURIComponent(this.getWhatsAppMessage(lead))}" target="_blank" rel="noopener noreferrer" class="btn-icon" aria-label="WhatsApp" ${!lead.phone ? 'style="opacity:0.5;pointer-events:none"' : ''}>💬</a>
          <a href="tel:${this.escapeHtml(lead.phone)}" class="btn-icon" aria-label="Llamar" ${!lead.phone ? 'style="opacity:0.5;pointer-events:none"' : ''}>📞</a>
        </td>
      </tr>
    `;
  },

  bindLeadEvents() {
    document.querySelectorAll('.lead-status-select').forEach(select => {
      select.addEventListener('change', (e) => this.handleStatusChange(e));
    });
  },

  async handleStatusChange(e) {
    const leadId = e.target.dataset.leadId;
    const newStatus = e.target.value;
    
    e.target.disabled = true;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      // Update local data
      const lead = this.leads.find(l => l.id == leadId);
      if (lead) lead.status = newStatus;

      // Update select class
      e.target.className = `lead-status-select status-${newStatus}`;

      this.showMessage(`Estado actualizado a "${this.stateLabels[newStatus]}"`, 'success');
    } catch (error) {
      console.error('Error updating lead status:', error);
      const lead = this.leads.find(l => l.id == leadId);
      if (lead) e.target.value = lead.status;
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      e.target.disabled = false;
    }
  },

  getWhatsAppMessage(lead) {
    const product = lead.products?.name || 'producto';
    return `Hola ${lead.name},\n\nGracias por tu interés en ${product}.\n\nTe contactamos de Omy's Wood Art para dar seguimiento a tu cotización.\n\n¡Saludos!`;
  },

  showMessage(message, type) {
    const container = document.getElementById('leads-message');
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
  document.addEventListener('DOMContentLoaded', () => AdminLeads.init());
} else {
  AdminLeads.init();
}

window.AdminLeads = AdminLeads;