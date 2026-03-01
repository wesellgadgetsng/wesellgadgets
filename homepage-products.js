// ============================================================
// homepage-products.js
// Loads products from Supabase and renders cards that are
// pixel-identical to the hand-coded HTML template.
// ============================================================
import { supabase } from './supabase-config.js';

// ── XSS-safe escaper ────────────────────────────────────────
function esc(val) {
  return String(val ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}

// ── Time badge (mirrors script.js logic) ────────────────────
function buildBadge(postDateStr) {
  if (!postDateStr) return null;
  const diff = Date.now() - new Date(postDateStr).getTime();
  if (diff <= 0) return null;

  const S = 1000, M = S*60, H = M*60, D = H*24,
        W = D*7, MN = D*30.44, Y = D*365.25;
  let text = '';
  if      (diff >= Y)  text = `${Math.floor(diff/Y)}Y`;
  else if (diff >= MN) text = `${Math.floor(diff/MN)}MN`;
  else if (diff >= W)  text = `${Math.floor(diff/W)}W`;
  else if (diff >= D)  text = `${Math.floor(diff/D)}D`;
  else if (diff >= H)  text = `${Math.floor(diff/H)}H`;
  else if (diff >= M)  text = `${Math.floor(diff/M)}M`;
  else                 text = `${Math.floor(diff/S)}S`;

  const badge = document.createElement('div');
  badge.className = 'badge-new' + (diff < 72*H ? ' pulse' : '');
  badge.textContent = text;
  return badge;
}

// ── Card builder — exactly matches the HTML template ────────
function buildProductCard(p, images) {
  const el = document.createElement('div');

  // Container classes for CSS search compatibility
  const cat   = (p.category          || '').toLowerCase();
  const brand = (p.brand             || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
  const cond  = (p.condition         || '').toLowerCase();
  const ram   = (p.ram               || '').replace(/[^\d]/g, '');
  const cpu   = (p.processor         || '').toLowerCase().replace(/intel core\s*/i, '').trim();
  const stor  = (p.storage           || '').replace(/[^\d]/g, '');
  const os    = (p.operating_system  || '').toLowerCase();
  const pid   = (p.custom_product_id || '');

  el.className = ['product-card-container', cat, cat+'s',
    brand, cond, ram, cpu, stor, os, pid
  ].filter(Boolean).join(' ');

  el.dataset.date = p.post_date || '';

  // Sort images by sort_order
  const imgs = [...(images || [])].sort((a, b) => a.sort_order - b.sort_order);

  // Image slides — crossorigin needed for background-blender canvas
  const slidesHTML = imgs.map((img, i) => `
    <img ${i === 0 ? 'loading="eager"' : 'loading="lazy"'}
         decoding="async"
         class="product-media-image product-media"
         crossorigin="anonymous"
         alt="${esc(p.name)} image ${i + 1}"
         src="${esc(img.public_url)}">`
  ).join('');

  // Optional video slide
  const videoHTML = p.video_url ? `
    <div class="video-container product-media">
      <video class="product-media-video"
             src="${esc(p.video_url)}"
             type="video/mp4" muted playsinline data-video></video>
      <div class="video-controls" data-video-controls>
        <button class="play-btn" data-play-toggle>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <span class="video-time" data-time-display>0:00 / 0:00</span>
      </div>
    </div>` : '';

  // Display helpers
  const condDisplay  = cond ? cond.charAt(0).toUpperCase() + cond.slice(1) : '';
  const qtyDisplay   = Number(p.quantity) > 0 ? 'Available' : 'Out of Stock';
  const catLabel     = cat  ? cat.charAt(0).toUpperCase() + cat.slice(1) + 's' : '';
  const priceDisplay = '₦ ' + Number(p.price || 0).toLocaleString('en-NG');
  const waLink       = p.whatsapp_link || 'https://wa.me/+2347039661343';

  el.innerHTML = `
    <div class="product-media-container">
      <div class="product-media-wrapper" data-gallery tabindex="0">
        ${slidesHTML}
        ${videoHTML}
      </div>

      <div class="product-pagination" data-pagination></div>

      <button data-fullscreen-toggle class="fullscreen-button" aria-label="Toggle fullscreen">
        <svg width="24" height="24" viewBox="0 0 24 24" class="enter-icon">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" class="exit-icon" style="display:none;">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm1-8h-3v2h5V5h-2v3z"/>
        </svg>
      </button>

      <button class="add-to-cart">
        <img src="media/add-to-cart.svg" alt="add-to-cart-image">
      </button>
    </div>

    <div class="product-info">
      <h3 class="product-name keyword">${esc(p.name)}</h3>
      <p class="condition keyword">${esc(condDisplay)}</p>
      <p class="quantity keyword">${qtyDisplay}</p>

      <p class="specs" data-specs-text>${esc(p.specs || '')}</p>
      <p class="show-more" data-show-more-toggle>Show more</p>

      <p class="price keyword">${priceDisplay}</p>
      <a href="${esc(waLink)}"
         target="_blank" rel="noopener noreferrer"
         class="button-3">Order Now</a>

      <p class="ram      keyword hidden">${esc(p.ram              || '')}</p>
      <p class="core     keyword hidden">${esc(p.processor        || '')}</p>
      <p class="storage  keyword hidden">${esc(p.storage          || '')}</p>
      <p class="brand    keyword hidden">${esc(p.brand            || '')}</p>
      <p class="screen   keyword hidden">${esc(p.screen_size      || '')}</p>
      <p class="os       keyword hidden">${esc(p.operating_system || '')}</p>
      <p class="product  keyword hidden">${esc(catLabel)}</p>
      <p class="supplier keyword hidden">${esc(p.supplier         || '')}</p>
      <p class="product-id keyword hidden">${esc(p.custom_product_id || '')}</p>
    </div>`;

  return el;
}

// ── Masonry init / relayout ──────────────────────────────────
function initMasonry(wrapper) {
  if (typeof Masonry === 'undefined') return;
  const run = () => {
    if (window.masonryInstance) {
      window.masonryInstance.reloadItems();
      window.masonryInstance.layout();
    } else {
      window.masonryInstance = new Masonry(wrapper, {
        itemSelector:    '.product-card-container',
        columnWidth:     '.product-card-container',
        percentPosition: true,
        gutter:          12,
        horizontalOrder: true,
        transitionDuration: '0.3s',
      });
    }
  };
  typeof imagesLoaded === 'function'
    ? imagesLoaded(wrapper, run)
    : run();
}

// ── Wire up every card after injection ──────────────────────
function initAllCards(wrapper) {
  const allCards = Array.from(wrapper.querySelectorAll('.product-card-container'));
  const loadMoreBtn = document.getElementById('load-more-btn');
  let currentLimit = 20;

  // 1. Per-card initialisation (gallery, zoom, video, fullscreen)
  allCards.forEach(card => {
    if (!card.dataset.initialized && typeof initializeProductCard === 'function') {
      initializeProductCard(card);
      card.dataset.initialized = 'true';
    
    }
    // Badge
    const mediaContainer = card.querySelector('.product-media-container');
    if (mediaContainer && !mediaContainer.querySelector('.badge-new')) {
      const badge = buildBadge(card.dataset.date);
      if (badge) mediaContainer.appendChild(badge);
    }
  });

  // 2. Override pagination to use live card list
  window.updatePagination = function () {
    const live = Array.from(wrapper.querySelectorAll('.product-card-container'));
    const visible = live.filter(c => !c.classList.contains('hidden'));
    visible.forEach((c, i) =>
      c.classList.toggle('paginated-hidden', i >= currentLimit));
    if (loadMoreBtn)
      loadMoreBtn.style.display = visible.length > currentLimit ? 'block' : 'none';
  };

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentLimit += 20;
      window.updatePagination();
    });
  }
  window.updatePagination();

  // 3. Re-index search (add to script.js — see note below)
  if (typeof window.reinitSearch === 'function') window.reinitSearch();

  // 4. Masonry
  initMasonry(wrapper);
}

// ── Main loader ──────────────────────────────────────────────
async function loadHomepageProducts() {
  const wrapper = document.querySelector('.product-cards-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '<p class="loading-msg" style="padding:40px;text-align:center;color:rgba(255,255,255,.4)">Loading products…</p>';

  const { data: products, error } = await supabase
    .from('products')
    .select('*, product_images(public_url, is_primary, sort_order)')
    .eq('is_published', true)
    .order('post_date', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    wrapper.innerHTML = '<p style="text-align:center;color:#ff6b6b;padding:40px">Failed to load products.</p>';
    return;
  }

  if (!products?.length) {
    wrapper.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,.4);padding:40px">No products available yet.</p>';
    return;
  }

  wrapper.innerHTML = '';

  products.forEach(p => {
    const card = buildProductCard(p, p.product_images || []);
    wrapper.appendChild(card);
  });

  initAllCards(wrapper);
}

// Modules are deferred — DOM is already ready when this runs
loadHomepageProducts();
