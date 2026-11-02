import supabase from './supabase-client.js';

let allProducts = [];
let categories = [];
let municipalities = [];

async function loadCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    categories = data || [];
    
    const filterSelect = document.getElementById('category-filter');
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      filterSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function loadMunicipalities() {
  try {
    const { data, error } = await supabase
      .from('municipalities')
      .select('id, name, region, base_price')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    municipalities = data || [];
  } catch (error) {
    console.error('Error loading municipalities:', error);
  }
  
  // Fallback: add test municipalities if database is empty
  if (municipalities.length === 0) {
    municipalities = [
      { id: 'mun-san-juan', name: 'San Juan', region: 'Metro', base_price: 15.00 },
      { id: 'mun-bayamon', name: 'Bayamón', region: 'Metro', base_price: 15.00 },
      { id: 'mun-carolina', name: 'Carolina', region: 'Metro', base_price: 15.00 },
      { id: 'mun-ponce', name: 'Ponce', region: 'Sur', base_price: 35.00 },
      { id: 'mun-mayaguez', name: 'Mayagüez', region: 'Oeste', base_price: 40.00 },
      { id: 'mun-caguas', name: 'Caguas', region: 'Centro', base_price: 25.00 },
    ];
  }
}

async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        images,
        active,
        weight_kg,
        length_cm,
        width_cm,
        height_cm,
        categories:category_id (id, name)
      `)
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    allProducts = data || [];
    
    // Fallback: add test product if database is empty
    if (allProducts.length === 0) {
      allProducts = [{
        id: 'prod-test-001',
        name: 'Mesa de Comedor Roble',
        description: 'Mesa de comedor artesanal en roble macizo, hecha a mano con acabado natural. Dimensiones personalizables. Ideal para 6-8 personas.',
        price: 1250.00,
        images: ['assets/hero-banner.jpg'],
        active: true,
        weight_kg: 25.0,
        length_cm: 180.0,
        width_cm: 90.0,
        height_cm: 75.0,
        categories: { id: 'cat-test-001', name: 'Muebles a Medida' }
      }];
    }
    
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    // Fallback on error too
    allProducts = [{
      id: 'prod-test-001',
      name: 'Mesa de Comedor Roble',
      description: 'Mesa de comedor artesanal en roble macizo, hecha a mano con acabado natural. Dimensiones personalizables. Ideal para 6-8 personas.',
      price: 1250.00,
      images: ['assets/hero-banner.jpg'],
      active: true,
      weight_kg: 25.0,
      length_cm: 180.0,
      width_cm: 90.0,
      height_cm: 75.0,
      categories: { id: 'cat-test-001', name: 'Muebles a Medida' }
    }];
    renderProducts();
  }
}

function showEmpty(show) {
  const grid = document.getElementById('catalog-grid');
  const emptyDiv = document.getElementById('catalog-empty');
  if (show) {
    if (grid) grid.innerHTML = '';
    if (emptyDiv) emptyDiv.style.display = 'block';
  } else {
    if (emptyDiv) emptyDiv.style.display = 'none';
  }
}

function renderProducts() {
  const grid = document.getElementById('catalog-grid');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;
  
  let filtered = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !selectedCategory || 
      (product.categories && product.categories.id == selectedCategory);
    return matchesSearch && matchesCategory;
  });
  
  if (filtered.length === 0) {
    if (grid) grid.innerHTML = '';
    showEmpty(true);
    return;
  }
  
  showEmpty(false);
  if (grid) {
    grid.innerHTML = filtered.map(product => {
      const imageUrl = (product.images && product.images.length > 0)
        ? product.images[0]
        : 'assets/hero-banner.jpg';
      const categoryName = product.categories ? product.categories.name : '';
      const price = product.price ? Number(product.price).toFixed(2) : '0.00';
      const status = product.active ? 'Disponible' : 'Agotado';
      
      return `
        <div class="card catalog-card scroll-reveal" data-product='${JSON.stringify(product)}'>
          <img src="${imageUrl}" alt="${escapeHtml(product.name)}" class="catalog-image" onerror="this.src='assets/hero-banner.jpg'">
          <div class="catalog-info">
            <div class="catalog-name">${escapeHtml(product.name)}</div>
            <div class="catalog-price">Desde $${escapeHtml(price)}</div>
            <div class="catalog-meta">${escapeHtml(categoryName)}</div>
            <span class="catalog-status">${escapeHtml(status)}</span>
          </div>
          <button class="btn btn-add-cart" data-product='${JSON.stringify({
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images
          })}'>Añadir al pedido</button>
        </div>
      `;
    }).join('');
    
    // Bind product card clicks to open modal
    grid.querySelectorAll('.catalog-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't open modal if clicking the add to cart button
        if (e.target.classList.contains('btn-add-cart')) return;
        const product = JSON.parse(card.dataset.product);
        openProductModal(product);
      });
    });
    
    // Bind add to cart buttons
    grid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const product = JSON.parse(e.target.dataset.product);
        if (window.Cart && typeof window.Cart.addItem === 'function') {
          window.Cart.addItem(product);
        } else {
          console.warn('Cart not initialized yet');
        }
      });
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openProductModal(product) {
  const modal = document.getElementById('product-modal');
  const modalBody = modal.querySelector('.product-modal-body');
  const imageUrl = (product.images && product.images.length > 0)
    ? product.images[0]
    : 'assets/hero-banner.jpg';
  const categoryName = product.categories ? product.categories.name : '';
  const price = product.price ? Number(product.price).toFixed(2) : '0.00';
  const description = product.description || 'Sin descripción disponible.';
  
  // Populate municipality options
  const municipalityOptions = municipalities.map(m => 
    `<option value="${m.id}" data-base-price="${m.base_price}" data-region="${m.region}">${m.name} (${m.region})</option>`
  ).join('');
  
  modalBody.innerHTML = `
    <img src="${imageUrl}" alt="${escapeHtml(product.name)}" class="product-modal-image" onerror="this.src='assets/hero-banner.jpg'">
    <div class="catalog-info">
      <div class="product-modal-title">${escapeHtml(product.name)}</div>
      <div class="catalog-meta">${escapeHtml(categoryName)}</div>
    </div>
    <p class="product-modal-description">${escapeHtml(description)}</p>
    <div class="product-modal-price">Desde $${escapeHtml(price)}</div>
    
    <div class="product-modal-actions">
      <button class="btn btn-add-cart" data-product='${JSON.stringify({
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images
      })}'>Añadir al pedido</button>
      <a href="https://wa.me/17875550123?text=${encodeURIComponent(`Hola, me interesa el producto: ${product.name}`)}" target="_blank" rel="noopener noreferrer" class="btn" style="background-color: var(--accent);">Consultar por WhatsApp</a>
    </div>
    
    <div class="product-modal-divider"></div>
    
    <h3 class="product-modal-section-title">Calcular Envío</h3>
    <div class="delivery-calculator">
      <div class="delivery-calculator-row">
        <div>
          <label for="modal-municipality">Municipio *</label>
          <select id="modal-municipality" class="delivery-calculator-select">
            <option value="">Selecciona un municipio</option>
            ${municipalityOptions}
          </select>
        </div>
        <div>
          <label for="modal-weight">Peso (kg)</label>
          <input type="number" id="modal-weight" class="delivery-calculator-input" step="0.1" min="0" value="${product.weight_kg || 1}" placeholder="0.0">
        </div>
      </div>
      <div class="delivery-calculator-row">
        <div>
          <label for="modal-length">Largo (cm)</label>
          <input type="number" id="modal-length" class="delivery-calculator-input" step="0.1" min="0" value="${product.length_cm || 30}" placeholder="0.0">
        </div>
        <div>
          <label for="modal-width">Ancho (cm)</label>
          <input type="number" id="modal-width" class="delivery-calculator-input" step="0.1" min="0" value="${product.width_cm || 20}" placeholder="0.0">
        </div>
      </div>
      <div class="delivery-calculator-row">
        <div>
          <label for="modal-height">Alto (cm)</label>
          <input type="number" id="modal-height" class="delivery-calculator-input" step="0.1" min="0" value="${product.height_cm || 10}" placeholder="0.0">
        </div>
        <div>
          <label for="modal-amount">Monto de pedido ($)</label>
          <input type="number" id="modal-amount" class="delivery-calculator-input" step="0.01" min="0" value="${price}" placeholder="0.00">
        </div>
      </div>
      <button id="modal-calc-btn" class="btn" style="width: 100%;">Calcular Envío</button>
      <div id="modal-calc-result" class="delivery-calculator-result" style="display: none;"></div>
    </div>
    
    <div class="product-modal-divider"></div>
    
    <h3 class="product-modal-section-title">Solicitar Cotización</h3>
    <form id="modal-quote-form" class="quote-form" novalidate>
      <div class="quote-form-row">
        <div>
          <label for="modal-lead-name">Nombre *</label>
          <input type="text" id="modal-lead-name" class="quote-form-input" required>
        </div>
        <div>
          <label for="modal-lead-email">Email</label>
          <input type="email" id="modal-lead-email" class="quote-form-input">
        </div>
      </div>
      <div class="quote-form-row">
        <div>
          <label for="modal-lead-phone">Teléfono *</label>
          <input type="tel" id="modal-lead-phone" class="quote-form-input" required>
        </div>
        <div>
          <label for="modal-lead-municipality">Municipio</label>
          <select id="modal-lead-municipality" class="quote-form-select">
            <option value="">Selecciona un municipio</option>
            ${municipalityOptions}
          </select>
        </div>
      </div>
      <div>
        <label for="modal-lead-message">Mensaje</label>
        <textarea id="modal-lead-message" class="quote-form-textarea" rows="3" placeholder="Detalles de tu proyecto..."></textarea>
      </div>
      <input type="hidden" id="modal-lead-product" value="${product.id}">
      <input type="hidden" id="modal-lead-product-name" value="${escapeHtml(product.name)}">
      <div class="quote-form-actions">
        <button type="submit" class="btn">Enviar Cotización</button>
        <button type="button" id="modal-whatsapp-btn" class="btn" style="background-color: var(--accent);">Enviar por WhatsApp</button>
      </div>
      <div id="modal-quote-message" class="quote-form-message"></div>
    </form>
  `;
  
  // Bind modal events
  bindModalEvents(product);
  
  // Show modal
  modal.showModal();
}

function bindModalEvents(product) {
  const modal = document.getElementById('product-modal');
  const price = product.price ? Number(product.price).toFixed(2) : '0.00';
  
  // Close button
  modal.querySelector('.product-modal-close').addEventListener('click', () => {
    modal.close();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
  
  // Add to cart in modal
  modal.querySelector('.btn-add-cart').addEventListener('click', (e) => {
    e.stopPropagation();
    const productData = JSON.parse(e.target.dataset.product);
    if (window.Cart && typeof window.Cart.addItem === 'function') {
      window.Cart.addItem(productData);
    }
  });
  
  // Delivery calculator
  const calcBtn = modal.querySelector('#modal-calc-btn');
  const calcResult = modal.querySelector('#modal-calc-result');
  
  calcBtn.addEventListener('click', async () => {
    const municipalityId = modal.querySelector('#modal-municipality').value;
    const weight = parseFloat(modal.querySelector('#modal-weight').value) || 0;
    const length = parseFloat(modal.querySelector('#modal-length').value) || 0;
    const width = parseFloat(modal.querySelector('#modal-width').value) || 0;
    const height = parseFloat(modal.querySelector('#modal-height').value) || 0;
    const amount = parseFloat(modal.querySelector('#modal-amount').value) || 0;
    
    if (!municipalityId) {
      calcResult.textContent = 'Por favor selecciona un municipio';
      calcResult.style.display = 'block';
      calcResult.style.backgroundColor = '#fee2e2';
      calcResult.style.color = '#991b1b';
      return;
    }
    
    calcBtn.disabled = true;
    calcBtn.textContent = 'Calculando...';
    
    try {
      const response = await fetch('/.netlify/functions/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          municipality_id: municipalityId,
          weight_kg: weight,
          length_cm: length,
          width_cm: width,
          height_cm: height,
          order_amount: amount
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        calcResult.textContent = `Error: ${data.error}`;
        calcResult.style.backgroundColor = '#fee2e2';
        calcResult.style.color = '#991b1b';
      } else {
        calcResult.innerHTML = `
          <strong>Envío: $${data.shipping_cost.toFixed(2)}</strong><br>
          <small>Subtotal: $${data.subtotal.toFixed(2)} | Total: $${data.total.toFixed(2)}</small>
          ${data.free_shipping ? '<br><small style="color: var(--accent);">¡Envío gratis!</small>' : ''}
        `;
        calcResult.style.backgroundColor = 'var(--accent-soft)';
        calcResult.style.color = 'var(--accent)';
      }
      calcResult.style.display = 'block';
    } catch (error) {
      calcResult.textContent = 'Error al calcular el envío';
      calcResult.style.backgroundColor = '#fee2e2';
      calcResult.style.color = '#991b1b';
      calcResult.style.display = 'block';
    } finally {
      calcBtn.disabled = false;
      calcBtn.textContent = 'Calcular Envío';
    }
  });
  
  // Quote form
  const quoteForm = modal.querySelector('#modal-quote-form');
  const quoteMessage = modal.querySelector('#modal-quote-message');
  const whatsappBtn = modal.querySelector('#modal-whatsapp-btn');
  
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: modal.querySelector('#modal-lead-name').value.trim(),
      email: modal.querySelector('#modal-lead-email').value.trim(),
      phone: modal.querySelector('#modal-lead-phone').value.trim(),
      municipality_id: modal.querySelector('#modal-lead-municipality').value || null,
      message: modal.querySelector('#modal-lead-message').value.trim(),
      product_id: modal.querySelector('#modal-lead-product').value,
      product_name: modal.querySelector('#modal-lead-product-name').value,
      status: 'nuevo'
    };
    
    if (!formData.name || !formData.phone) {
      quoteMessage.textContent = 'Nombre y teléfono son obligatorios';
      quoteMessage.className = 'quote-form-message error';
      return;
    }
    
    const submitBtn = quoteForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    try {
      const { error } = await supabase
        .from('leads')
        .insert([formData]);
      
      if (error) throw error;
      
      quoteMessage.textContent = 'Cotización enviada correctamente. Te contactaremos pronto.';
      quoteMessage.className = 'quote-form-message success';
      quoteForm.reset();
    } catch (error) {
      console.error('Error saving lead:', error);
      quoteMessage.textContent = 'Error al enviar la cotización. Intenta de nuevo.';
      quoteMessage.className = 'quote-form-message error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Cotización';
    }
  });
  
  // WhatsApp button in quote form
  whatsappBtn.addEventListener('click', () => {
    const name = modal.querySelector('#modal-lead-name').value.trim();
    const phone = modal.querySelector('#modal-lead-phone').value.trim();
    const municipality = modal.querySelector('#modal-lead-municipality').value;
    const message = modal.querySelector('#modal-lead-message').value.trim();
    const productName = modal.querySelector('#modal-lead-product-name').value;
    
    if (!name || !phone) {
      quoteMessage.textContent = 'Por favor completa nombre y teléfono para usar WhatsApp';
      quoteMessage.className = 'quote-form-message error';
      return;
    }
    
    const municipalityText = municipality 
      ? municipalities.find(m => m.id == municipality)?.name || municipality
      : 'No especificado';
    
    const whatsappMessage = `Hola, mi nombre es ${name}. Me interesa cotizar: ${productName}. Municipio: ${municipalityText}. ${message ? 'Mensaje: ' + message : ''}`;
    const whatsappUrl = `https://wa.me/17875550123?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  });
}

function init() {
  loadCategories().then(() => {
    loadProducts();
  });
  loadMunicipalities();
  
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (categoryFilter) categoryFilter.addEventListener('change', renderProducts);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}