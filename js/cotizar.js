import supabase from './supabase-client.js';

let municipalities = [];
let products = [];

async function loadData() {
  try {
    const [munRes, prodRes] = await Promise.all([
      supabase.from('municipalities').select('id, name').eq('active', true).order('name'),
      supabase.from('products').select('id, name').eq('active', true).order('name')
    ]);
    
    if (munRes.data) {
      municipalities = munRes.data;
      const munSelect = document.getElementById('lead-municipality');
      if (munSelect) {
        municipalities.forEach(m => {
          const option = document.createElement('option');
          option.value = m.id;
          option.textContent = m.name;
          munSelect.appendChild(option);
        });
      }
    }
    
    if (prodRes.data) {
      products = prodRes.data;
      const prodSelect = document.getElementById('lead-product');
      if (prodSelect) {
        products.forEach(p => {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = p.name;
          prodSelect.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function init() {
  loadData();
  
  const form = document.getElementById('cotizar-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
  
  const whatsappBtn = document.getElementById('whatsapp-btn');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', handleWhatsApp);
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('lead-name').value.trim();
  const email = document.getElementById('lead-email').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  const productId = document.getElementById('lead-product').value;
  const municipalityId = document.getElementById('lead-municipality').value;
  const message = document.getElementById('lead-message').value.trim();
  const website = document.getElementById('lead-website').value.trim();
  const resultDiv = document.getElementById('lead-result');
  
  // Anti-spam trap
  if (website) {
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div style="color: var(--accent);">Solicitud recibida.</div>';
    }
    return;
  }
  
  if (!name) {
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div style="color: var(--wood);">Por favor ingresa tu nombre.</div>';
    }
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        message: message || null,
        product_id: productId || null,
        municipality_id: municipalityId || null,
        status: 'new',
        active: true
      });
    
    if (error) throw error;
    
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div style="color: var(--accent);">Cotización enviada correctamente.</div>';
    }
    form.reset();
  } catch (error) {
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `<div style="color: var(--wood);">Error: ${escapeHtml(error.message)}</div>`;
    }
  }
}

function handleWhatsApp() {
  const name = document.getElementById('lead-name').value.trim();
  const message = document.getElementById('lead-message').value.trim();
  const productSelect = document.getElementById('lead-product');
  const productName = productSelect.options[productSelect.selectedIndex]?.textContent || '';
  
  let text = `Hola Omy's Wood Art,\n\n`;
  if (name) text += `Soy ${name}.\n\n`;
  if (productName && productName !== 'Selecciona un producto') {
    text += `Me interesa cotizar: ${productName}\n\n`;
  }
  if (message) text += `Mensaje: ${message}\n\n`;
  text += `Gracias!`;
  
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/17875550123?text=${encoded}`;
  window.open(url, '_blank');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}