// homepage-products.js
import { supabase } from './supabase-config.js';

async function loadHomepageProducts() {
  const wrapper = document.querySelector('.product-cards-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '<p class="loading-msg">Loading products…</p>';

  const { data: products, error } = await supabase
    .from('products')
    .select('*, product_images(public_url, is_primary, sort_order)')
    .eq('is_published', true)
    .order('post_date', { ascending: false });

  if (error || !products?.length) {
    wrapper.innerHTML = '<p class="empty-msg">No products available yet.</p>';
    return;
  }

  wrapper.innerHTML = '';

  products.forEach(product => {
    const images = (product.product_images || [])
      .sort((a, b) => a.sort_order - b.sort_order);
    const card = buildProductCard(product, images);
    wrapper.appendChild(card);
  });

  // Re-init Masonry + per-card JS
  initAllCards();
}

function buildProductCard(p, images) {
  const container = document.createElement('div');
  container.className = 'product-card-container';
  container.dataset.date = p.post_date;

  const mediaSlides = images.map((img, i) => `
    <img class="product-media-image product-media"
         src="${img.public_url}"
         alt="${p.name} image ${i + 1}"
         loading="${i === 0 ? 'eager' : 'lazy'}"
         draggable="false">
  `).join('');

  const keywords = (p.keywords || []).map(k =>
    `<p class="keyword hidden">${k}</p>`).join('');

  const price = Number(p.price).toLocaleString('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0
  });

  container.innerHTML = `
    <div class="product-media-container">
      <div class="product-media-wrapper" data-gallery tabindex="0">
        ${mediaSlides}
      </div>
      <div class="product-pagination" data-pagination></div>
      <button data-fullscreen-toggle class="fullscreen-button" aria-label="Toggle fullscreen">
        <img src="media/fullscreen.png" alt="fullscreen">
      </button>
      <button class="add-to-cart">
        <img src="media/add-to-cart.png" alt="add-to-cart-image">
      </button>
    </div>
    <div class="product-info">
      <span class="product-badge" data-badge></span>
      <h3 class="product-name">${p.name}</h3>
      <p class="condition">${p.condition}</p>
      <p class="show-more" data-show-more-toggle>Show more</p>
      <p class="specs" data-specs-text>${p.specs || ''}</p>
      ${keywords}
      <p class="price">${price}</p>
      <p class="quantity-tag">Qty: ${p.quantity}</p>
      <a href="${p.whatsapp_link || 'https://wa.me/+2347039661343'}">
        <button class="button-3">Order Now</button>
      </a>
    </div>
  `;
  return container;
}

function initAllCards() {
  document.querySelectorAll('.product-card-container').forEach(card => {
    initializeProductCard(card);   // your existing per-card JS function
    applyDynamicBadge(card);       // your existing badge logic
  });

  if (typeof imagesLoaded === 'function' && typeof Masonry === 'function') {
    const wrapper = document.querySelector('.product-cards-wrapper');
    imagesLoaded(wrapper, () => {
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
    });
  }
}

document.addEventListener('DOMContentLoaded', loadHomepageProducts);
