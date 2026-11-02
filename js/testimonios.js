import supabase from './supabase-client.js';

async function loadTestimonials() {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    renderTestimonials(data || []);
  } catch (error) {
    console.error('Error loading testimonials:', error);
    showEmpty(true);
  }
}

function renderTestimonials(testimonials) {
  const grid = document.getElementById('testimonials-grid');
  const emptyDiv = document.getElementById('testimonials-empty');
  
  if (!testimonials || testimonials.length === 0) {
    showEmpty(true);
    return;
  }
  
  showEmpty(false);
  if (grid) {
    grid.innerHTML = testimonials.map(t => {
      const rating = t.rating ? '★'.repeat(Math.min(t.rating, 5)) + '☆'.repeat(5 - Math.min(t.rating, 5)) : '';
      return `
        <div class="card scroll-reveal">
          <div class="catalog-info">
            <div class="catalog-name">${escapeHtml(t.name)}</div>
            ${rating ? `<div style="color: var(--accent); font-size: 0.875rem;">${escapeHtml(rating)}</div>` : ''}
            <p style="color: var(--ink-soft); margin-top: 0.5rem;">${escapeHtml(t.text)}</p>
            ${t.project ? `<div class="catalog-meta">Proyecto: ${escapeHtml(t.project)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

function showEmpty(show) {
  const grid = document.getElementById('testimonials-grid');
  const emptyDiv = document.getElementById('testimonials-empty');
  if (show) {
    if (grid) grid.innerHTML = '';
    if (emptyDiv) emptyDiv.style.display = 'block';
  } else {
    if (emptyDiv) emptyDiv.style.display = 'none';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function init() {
  loadTestimonials();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}