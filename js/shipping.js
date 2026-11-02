import supabase from './supabase-client.js';

let municipalities = [];

async function loadMunicipalities() {
  try {
    const { data, error } = await supabase
      .from('municipalities')
      .select('id, name, base_price')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    municipalities = data || [];
    
    const selects = [
      document.getElementById('municipality-select'),
      document.getElementById('calc-municipality')
    ];
    
    selects.forEach(select => {
      if (!select) return;
      municipalities.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;
        option.dataset.basePrice = m.base_price;
        select.appendChild(option);
      });
    });
    
    const munSelect = document.getElementById('municipality-select');
    if (munSelect) {
      munSelect.addEventListener('change', handleMunicipalityChange);
    }
    
    const calcBtn = document.getElementById('calc-btn');
    if (calcBtn) {
      calcBtn.addEventListener('click', handleCalculate);
    }
  } catch (error) {
    console.error('Error loading municipalities:', error);
  }
}

function handleMunicipalityChange() {
  const select = document.getElementById('municipality-select');
  const infoDiv = document.getElementById('delivery-price-info');
  if (!select || !infoDiv) return;
  
  const selected = select.options[select.selectedIndex];
  if (!selected.value) {
    infoDiv.innerHTML = '';
    return;
  }
  
  const basePrice = parseFloat(selected.dataset.basePrice) || 0;
  infoDiv.innerHTML = `
    <div class="catalog-name">${escapeHtml(selected.textContent)}</div>
    <div class="catalog-price">Precio base: $${basePrice.toFixed(2)}</div>
  `;
}

async function handleCalculate() {
  const calcMunicipality = document.getElementById('calc-municipality');
  const calcWeight = document.getElementById('calc-weight');
  const calcLength = document.getElementById('calc-length');
  const calcWidth = document.getElementById('calc-width');
  const calcHeight = document.getElementById('calc-height');
  const calcAmount = document.getElementById('calc-amount');
  const calcResult = document.getElementById('calc-result');
  
  if (!calcMunicipality || !calcWeight || !calcLength || !calcWidth || !calcHeight || !calcAmount || !calcResult) return;
  
  if (!calcMunicipality.value) {
    calcResult.style.display = 'block';
    calcResult.innerHTML = '<div style="color: var(--wood);">Selecciona un municipio</div>';
    return;
  }
  
  const weightKg = parseFloat(calcWeight.value) || 0;
  const lengthCm = parseFloat(calcLength.value) || 0;
  const widthCm = parseFloat(calcWidth.value) || 0;
  const heightCm = parseFloat(calcHeight.value) || 0;
  const orderAmount = parseFloat(calcAmount.value) || 0;
  
  try {
    const config = window.SUPABASE_CONFIG || { url: '', anonKey: '' };
    const functionUrl = `${config.url}/functions/v1/calculate-shipping`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
      },
      body: JSON.stringify({
        municipalityId: calcMunicipality.value,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        orderAmount,
      }),
    });
    
    const data = await response.json();
    calcResult.style.display = 'block';
    
    if (!response.ok) {
      calcResult.innerHTML = `<div style="color: var(--wood);">Error: ${escapeHtml(data.error || 'Error desconocido')}</div>`;
      return;
    }
    
    calcResult.innerHTML = `
      <div class="catalog-name">Resultado del cálculo</div>
      <div class="catalog-meta">Municipio: ${escapeHtml(data.municipality)}</div>
      <div class="catalog-meta">Precio base: $${data.basePrice.toFixed(2)}</div>
      <div class="catalog-meta">Recargo por peso: $${data.weightSurcharge.toFixed(2)}</div>
      <div class="catalog-meta">Recargo por tamaño: $${data.sizeSurcharge.toFixed(2)}</div>
      <div class="catalog-meta">Volumen: ${data.volumeCm3.toFixed(2)} cm³</div>
      <div class="catalog-price">Precio de entrega: $${data.deliveryPrice.toFixed(2)}</div>
      ${data.freeDelivery ? '<div class="catalog-status">¡Entrega gratis!</div>' : ''}
    `;
  } catch (error) {
    calcResult.style.display = 'block';
    calcResult.innerHTML = `<div style="color: var(--wood);">Error: ${escapeHtml(error.message)}</div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function init() {
  loadMunicipalities();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}