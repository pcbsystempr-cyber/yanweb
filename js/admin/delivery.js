import supabase from '../supabase-client.js';

const AdminDelivery = {
  municipalities: [],
  regions: [
    { id: 'norte', name: 'Norte', municipalities: ['Arecibo', 'Barceloneta', 'Camuy', 'Ciales', 'Florida', 'Hatillo', 'Manatí', 'Morovis', 'Quebradillas', 'Utuado'] },
    { id: 'sur', name: 'Sur', municipalities: ['Adjuntas', 'Coamo', 'Guánica', 'Guayanilla', 'Jayuya', 'Juana Díaz', 'Lajas', 'Maricao', 'Peñuelas', 'Ponce', 'Sabana Grande', 'Santa Isabel', 'Villalba', 'Yauco'] },
    { id: 'este', name: 'Este', municipalities: ['Canóvanas', 'Ceiba', 'Culebra', 'Fajardo', 'Humacao', 'Las Piedras', 'Loíza', 'Luquillo', 'Maunabo', 'Naguabo', 'Patillas', 'Río Grande', 'Vieques', 'Yabucoa'] },
    { id: 'oeste', name: 'Oeste', municipalities: ['Aguada', 'Aguadilla', 'Añasco', 'Cabo Rojo', 'Hormigueros', 'Isabela', 'Lares', 'Las Marías', 'Mayagüez', 'Moca', 'Rincón', 'San Germán', 'San Sebastián'] },
    { id: 'metro', name: 'Metro', municipalities: ['Bayamón', 'Carolina', 'Cataño', 'Corozal', 'Dorado', 'Guaynabo', 'Juncos', 'San Juan', 'Toa Alta', 'Toa Baja', 'Trujillo Alto', 'Vega Alta', 'Vega Baja'] },
    { id: 'central', name: 'Central', municipalities: ['Aibonito', 'Barranquitas', 'Caguas', 'Cayey', 'Cidra', 'Comerío', 'Gurabo', 'Orocovis', 'San Lorenzo'] }
  ],
  deliverySettings: {},
  editingMunicipalityId: null,

  async init() {
    this.bindEvents();
    await this.loadMunicipalities();
    await this.loadDeliverySettings();
  },

  bindEvents() {
    // Search filter
    const searchInput = document.getElementById('municipality-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterMunicipalities(e.target.value));
    }

    // Region filter
    const regionFilter = document.getElementById('region-filter');
    if (regionFilter) {
      regionFilter.addEventListener('change', (e) => this.filterByRegion(e.target.value));
    }

    // Bulk edit by region
    const bulkEditBtn = document.getElementById('bulk-edit-btn');
    if (bulkEditBtn) {
      bulkEditBtn.addEventListener('click', () => this.openBulkEditModal());
    }

    // Bulk edit modal
    const bulkEditModal = document.getElementById('bulk-edit-modal');
    if (bulkEditModal) {
      bulkEditModal.addEventListener('click', (e) => {
        if (e.target === bulkEditModal) this.closeBulkEditModal();
      });
    }

    const bulkEditForm = document.getElementById('bulk-edit-form');
    if (bulkEditForm) {
      bulkEditForm.addEventListener('submit', (e) => this.handleBulkEdit(e));
    }

    const cancelBulkBtn = document.getElementById('cancel-bulk-btn');
    if (cancelBulkBtn) {
      cancelBulkBtn.addEventListener('click', () => this.closeBulkEditModal());
    }

    // Delivery settings form
    const settingsForm = document.getElementById('delivery-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
    }

    // Toggle active column header
    const toggleAll = document.getElementById('toggle-all-active');
    if (toggleAll) {
      toggleAll.addEventListener('change', (e) => this.toggleAllActive(e.target.checked));
    }
  },

  async loadMunicipalities() {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('id, name, base_price, active, region')
        .order('name', { ascending: true });

      if (error) throw error;
      this.municipalities = data || [];
      this.renderMunicipalities();
      this.populateRegionFilter();
    } catch (error) {
      console.error('Error loading municipalities:', error);
      this.showMessage('Error al cargar municipios', 'error');
    }
  },

  async loadDeliverySettings() {
    try {
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('key, value')
        .eq('active', true);

      if (error) throw error;
      
      this.deliverySettings = (data || []).reduce((acc, s) => {
        acc[s.key] = parseFloat(s.value) || 0;
        return acc;
      }, {});

      this.populateSettingsForm();
    } catch (error) {
      console.error('Error loading delivery settings:', error);
    }
  },

  populateRegionFilter() {
    const select = document.getElementById('region-filter');
    if (!select) return;

    select.innerHTML = '<option value="">Todas las regiones</option>' +
      this.regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  },

  getRegionForMunicipality(name) {
    for (const region of this.regions) {
      if (region.municipalities.includes(name)) {
        return region.id;
      }
    }
    return 'otro';
  },

  filterMunicipalities(searchTerm) {
    const term = searchTerm.toLowerCase();
    const rows = document.querySelectorAll('#municipalities-table tbody tr');
    
    rows.forEach(row => {
      const name = row.dataset.name?.toLowerCase() || '';
      const matches = name.includes(term);
      row.style.display = matches ? '' : 'none';
    });
  },

  filterByRegion(regionId) {
    const rows = document.querySelectorAll('#municipalities-table tbody tr');
    
    rows.forEach(row => {
      const region = row.dataset.region;
      const matches = !regionId || region === regionId;
      row.style.display = matches ? '' : 'none';
    });
  },

  renderMunicipalities() {
    const tbody = document.getElementById('municipalities-tbody');
    const empty = document.getElementById('municipalities-empty');
    
    if (!tbody) return;

    if (this.municipalities.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = this.municipalities.map(m => {
      const region = this.getRegionForMunicipality(m.name);
      const price = Number(m.base_price).toFixed(2);
      
      return `
        <tr data-id="${m.id}" data-name="${this.escapeHtml(m.name)}" data-region="${region}">
          <td class="col-name">${this.escapeHtml(m.name)}</td>
          <td class="col-region">${this.escapeHtml(this.getRegionName(region))}</td>
          <td class="col-price">
            <input type="number" 
                   class="price-input" 
                   value="${price}" 
                   step="0.01" 
                   min="0" 
                   data-id="${m.id}"
                   ${!m.active ? 'disabled' : ''}
                   aria-label="Precio base para ${this.escapeHtml(m.name)}">
          </td>
          <td class="col-active">
            <label class="toggle-switch">
              <input type="checkbox" class="active-toggle" data-id="${m.id}" ${m.active ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </td>
        </tr>
      `;
    }).join('');

    this.bindMunicipalityEvents();
  },

  getRegionName(regionId) {
    const region = this.regions.find(r => r.id === regionId);
    return region ? region.name : 'Otra';
  },

  bindMunicipalityEvents() {
    // Price input blur - save on blur
    document.querySelectorAll('.price-input').forEach(input => {
      input.addEventListener('blur', (e) => this.saveMunicipalityPrice(e));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.target.blur();
        }
      });
    });

    // Active toggle
    document.querySelectorAll('.active-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => this.toggleMunicipalityActive(e));
    });
  },

  async saveMunicipalityPrice(e) {
    const input = e.target;
    const id = input.dataset.id;
    const price = parseFloat(input.value);

    if (isNaN(price) || price < 0) {
      input.value = Number(input.defaultValue).toFixed(2);
      this.showMessage('Precio inválido', 'error');
      return;
    }

    const originalValue = input.value;
    input.disabled = true;

    try {
      const { error } = await supabase
        .from('municipalities')
        .update({ base_price: price, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Update local data
      const mun = this.municipalities.find(m => m.id == id);
      if (mun) mun.base_price = price;

      this.showMessage(`Precio actualizado: $${price.toFixed(2)}`, 'success');
    } catch (error) {
      console.error('Error updating price:', error);
      input.value = originalValue;
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      input.disabled = false;
    }
  },

  async toggleMunicipalityActive(e) {
    const toggle = e.target;
    const id = toggle.dataset.id;
    const active = toggle.checked;

    toggle.disabled = true;

    try {
      const { error } = await supabase
        .from('municipalities')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Update local data
      const mun = this.municipalities.find(m => m.id == id);
      if (mun) {
        mun.active = active;
        // Disable/enable price input
        const priceInput = document.querySelector(`.price-input[data-id="${id}"]`);
        if (priceInput) priceInput.disabled = !active;
      }

      this.showMessage(`${this.escapeHtml(mun?.name || 'Municipio')} ${active ? 'activado' : 'desactivado'}`, 'success');
    } catch (error) {
      console.error('Error toggling active:', error);
      toggle.checked = !active;
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      toggle.disabled = false;
    }
  },

  async toggleAllActive(active) {
    const toggles = document.querySelectorAll('.active-toggle');
    const ids = Array.from(toggles).map(t => t.dataset.id);

    // Disable all toggles during bulk update
    toggles.forEach(t => t.disabled = true);

    try {
      const { error } = await supabase
        .from('municipalities')
        .update({ active, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      // Update local data and UI
      this.municipalities.forEach(m => {
        if (ids.includes(String(m.id))) {
          m.active = active;
        }
      });
      toggles.forEach(t => t.checked = active);
      
      // Enable/disable price inputs
      document.querySelectorAll('.price-input').forEach(input => {
        if (ids.includes(input.dataset.id)) {
          input.disabled = !active;
        }
      });

      this.showMessage(`${ids.length} municipios ${active ? 'activados' : 'desactivados'}`, 'success');
    } catch (error) {
      console.error('Error bulk toggling:', error);
      toggles.forEach(t => t.checked = !active);
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      toggles.forEach(t => t.disabled = false);
    }
  },

  openBulkEditModal() {
    const modal = document.getElementById('bulk-edit-modal');
    const regionSelect = document.getElementById('bulk-region-select');
    const percentInput = document.getElementById('bulk-percent');
    
    if (regionSelect) {
      regionSelect.innerHTML = '<option value="">Selecciona región</option>' +
        this.regions.map(r => `<option value="${r.id}">${r.name} (${r.municipalities.length} municipios)</option>`).join('');
    }
    if (percentInput) percentInput.value = '';
    
    if (modal) modal.showModal();
  },

  closeBulkEditModal() {
    const modal = document.getElementById('bulk-edit-modal');
    if (modal) modal.close();
  },

  async handleBulkEdit(e) {
    e.preventDefault();
    
    const regionSelect = document.getElementById('bulk-region-select');
    const percentInput = document.getElementById('bulk-percent');
    const submitBtn = document.getElementById('bulk-submit-btn');
    
    const regionId = regionSelect.value;
    const percent = parseFloat(percentInput.value);

    if (!regionId) {
      this.showMessage('Selecciona una región', 'error');
      return;
    }
    if (isNaN(percent)) {
      this.showMessage('Porcentaje inválido', 'error');
      return;
    }

    const region = this.regions.find(r => r.id === regionId);
    const targetMunicipalities = this.municipalities.filter(m => 
      region.municipalities.includes(m.name) && m.active
    );

    if (targetMunicipalities.length === 0) {
      this.showMessage('No hay municipios activos en esa región', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Aplicando...';

    try {
      const updates = targetMunicipalities.map(m => {
        const newPrice = Math.round(m.base_price * (1 + percent / 100) * 100) / 100;
        return supabase
          .from('municipalities')
          .update({ base_price: newPrice, updated_at: new Date().toISOString() })
          .eq('id', m.id);
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;

      // Update local data
      targetMunicipalities.forEach(m => {
        m.base_price = Math.round(m.base_price * (1 + percent / 100) * 100) / 100;
      });

      this.renderMunicipalities();
      this.closeBulkEditModal();
      this.showMessage(`${targetMunicipalities.length} precios actualizados (${percent > 0 ? '+' : ''}${percent}%)`, 'success');
    } catch (error) {
      console.error('Error bulk editing:', error);
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Aplicar';
    }
  },

  populateSettingsForm() {
    const fields = {
      'weight-surcharge': this.deliverySettings.weight_surcharge_per_kg || 0,
      'size-surcharge': this.deliverySettings.size_surcharge_per_cm3 || 0,
      'min-delivery': this.deliverySettings.min_delivery || 0,
      'free-delivery-over': this.deliverySettings.free_delivery_over || 0
    };

    Object.entries(fields).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) input.value = value;
    });
  },

  async handleSettingsSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('settings-submit-btn');
    const settings = {
      weight_surcharge_per_kg: parseFloat(document.getElementById('weight-surcharge').value) || 0,
      size_surcharge_per_cm3: parseFloat(document.getElementById('size-surcharge').value) || 0,
      min_delivery: parseFloat(document.getElementById('min-delivery').value) || 0,
      free_delivery_over: parseFloat(document.getElementById('free-delivery-over').value) || 0
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      const upserts = Object.entries(settings).map(([key, value]) => 
        supabase
          .from('delivery_settings')
          .upsert({ key, value: value.toString(), active: true }, { onConflict: 'key' })
      );

      const results = await Promise.all(upserts);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;

      this.deliverySettings = settings;
      this.showMessage('Ajustes de envío guardados', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showMessage(`Error: ${this.escapeHtml(error.message)}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Ajustes';
    }
  },

  showMessage(message, type) {
    const container = document.getElementById('delivery-message');
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
  document.addEventListener('DOMContentLoaded', () => AdminDelivery.init());
} else {
  AdminDelivery.init();
}

window.AdminDelivery = AdminDelivery;