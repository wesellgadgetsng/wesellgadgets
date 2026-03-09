/* ================================================================
   homepage-products.js
   Responsibilities (this file owns ALL of these):
     1. Fetch products from Supabase
     2. Build card DOM elements
     3. Inject cards into .product-cards-wrapper
     4. Create & manage the Load More button
     5. Manage module-level pagination state
     6. Expose window.updatePagination / window.resetPaginationLimit
     7. Call window.reinitSearch after cards are ready
   ================================================================ */

   import { supabase } from './supabase-config.js';

   /* ─── XSS-safe escaper ─────────────────────────────────────── */
   function esc(val) {
     return String(val ?? '')
       .replace(/&/g,  '&amp;')
       .replace(/</g,  '&lt;')
       .replace(/>/g,  '&gt;')
       .replace(/"/g,  '&quot;')
       .replace(/'/g,  '&#x27;');
   }
   
   /* ─── Time badge ────────────────────────────────────────────── */
   function buildBadge(postDateStr) {
     if (!postDateStr) return null;
     const diff = Date.now() - new Date(postDateStr).getTime();
     if (diff <= 0) return null;
   
     const S  = 1000,
           M  = S * 60,
           H  = M * 60,
           D  = H * 24,
           W  = D * 7,
           MN = D * 30.44,
           Y  = D * 365.25;
   
     let text;
     if      (diff >= Y)  text = `${Math.floor(diff / Y)}Y`;
     else if (diff >= MN) text = `${Math.floor(diff / MN)}MN`;
     else if (diff >= W)  text = `${Math.floor(diff / W)}W`;
     else if (diff >= D)  text = `${Math.floor(diff / D)}D`;
     else if (diff >= H)  text = `${Math.floor(diff / H)}H`;
     else if (diff >= M)  text = `${Math.floor(diff / M)}M`;
     else                 text = `${Math.floor(diff / S)}S`;
   
     const badge = document.createElement('div');
     badge.className = 'badge-new' + (diff < 72 * H ? ' pulse' : '');
     badge.textContent = text;
     return badge;
   }
   
   /* ─── Card builder ──────────────────────────────────────────── */
   function buildProductCard(p, images) {
     const el  = document.createElement('div');
     const cat   = (p.category         || '').toLowerCase().replace(/\s+/g, '-');
     const brand = (p.brand            || '').toLowerCase().replace(/[^\w]/g, '').trim();
     const cond  = (p.condition        || '').toLowerCase().replace(/\s+/g, '-');
     const pid   = (p.custom_product_id || p.id || '');
   
     /* CSS classes (used by search tokenisation) */
     el.className = [
       'product-card-container',
       cat, cat + 's',           // e.g. "laptop laptops"
       brand, cond, pid,
     ].filter(Boolean).join(' ');

     /* Unique DOM id — used by deep-link URL system */
    if (pid) {
      el.id = 'p-' + pid.replace(/[^a-zA-Z0-9_-]/g, '-');
    }

   
     /* data attributes (read by reinitSearch & badge) */
     el.dataset.date = p.post_date || '';
     el.dataset.productId = pid;
     el.dataset.name      = p.name || '';
     el.dataset.brand     = p.brand || '';
     el.dataset.category  = p.category || '';
     el.dataset.price     = p.price || '0';
   
     /* Sort images */
     const imgs = [...(images || [])].sort((a, b) => a.sort_order - b.sort_order);
   
     /* Image slides */
     const slidesHTML = imgs.map((img, i) => `
     <img
       ${i < 2 ? 'loading="eager"' : 'loading="lazy"'}
       class="product-media-image product-media"
       draggable="false"
       alt="${esc(p.name)} image ${i + 1}"
       src="${esc(img.public_url)}">
     `).join('');
             
     /* Optional video slide */
     const videoHTML = p.video_url ? `
       <div class="video-container product-media">
         <video class="product-media-video"
                src="${esc(p.video_url)}"
                muted playsinline data-video></video>
         <div class="video-controls" data-video-controls>
           <button class="play-btn" data-play-toggle>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
               <path d="M8 5v14l11-7z"/>
             </svg>
           </button>
           <span class="video-time" data-time-display>0:00 / 0:00</span>
         </div>
       </div>` : '';
   
     /* Display helpers */
     const condDisplay  = p.condition
       ? p.condition.charAt(0).toUpperCase() + p.condition.slice(1) : '';
     const qtyDisplay   = Number(p.quantity) > 0 ? 'Available' : 'Out of Stock';
     const catLabel     = p.category
       ? p.category.charAt(0).toUpperCase() + p.category.slice(1) + 's' : '';
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
           <svg width="24" height="24" viewBox="0 0 24 24" class="enter-icon" fill="currentColor">
             <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
           </svg>
           <svg width="24" height="24" viewBox="0 0 24 24" class="exit-icon" fill="currentColor">
             <path d="M5 9h3V6h2v5H5V9z"/>
             <path d="M5 15h3v3h2v-5H5v2z"/>
             <path d="M19 9h-3V6h-2v5h5V9z"/>
             <path d="M19 15h-3v3h-2v-5h5v2z"/>
           </svg>
         </button>
   
         <button class="add-to-cart" aria-label="Add to cart">
           <img src="media/add-to-cart.svg" alt="add to cart" width="20" height="20">
         </button>
       </div>
   
       <div class="product-info">
         <h3 class="product-name keyword">${esc(p.name)}</h3>
         <p class="condition keyword">${esc(condDisplay)}</p>
         <p class="quantity keyword">${qtyDisplay}</p>
   
         <p class="specs" data-specs-text>${esc(p.specs || '')}</p>
         <p class="show-more" data-show-more-toggle>Show more</p>
   
         <p class="price keyword">${priceDisplay}</p>
        <div class="product-action-row">
          <button class="button-3 order-now-btn"
                  type="button"
                  data-action="order"
                  aria-label="Order ${esc(p.name)} via WhatsApp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                aria-hidden="true" style="flex-shrink:0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099
                      -.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199
                      -.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475
                      -.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458
                      .13-.606.134-.133.298-.347.446-.52.149-.174.198-.298
                      .298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612
                      -.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01
                      -.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04
                      2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2
                      5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195
                      1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248
                      -1.289.173-1.413-.074-.124-.272-.198-.57-.347z
                      M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847
                      L.057 23.882l6.204-1.625A11.946 11.946 0 0 0 12 24
                      c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
            </svg>
            Order Now
          </button>

          <button class="share-link-btn"
                  type="button"
                  data-action="share"
                  aria-label="Copy product link"
                  title="Copy shareable link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
   
         <!-- Hidden keyword fields — read by search tokeniser -->
         <p class="ram      keyword sr-only">${esc(p.ram              || '')}</p>
         <p class="core     keyword sr-only">${esc(p.processor        || '')}</p>
         <p class="storage  keyword sr-only">${esc(p.storage          || '')}</p>
         <p class="brand    keyword sr-only">${esc(p.brand            || '')}</p>
         <p class="screen   keyword sr-only">${esc(p.screen_size      || '')}</p>
         <p class="os       keyword sr-only">${esc(p.operating_system || '')}</p>
         <p class="product  keyword sr-only">${esc(catLabel)}</p>
         <p class="supplier keyword sr-only">${esc(p.supplier         || '')}</p>
         <p class="pid      keyword sr-only">${esc(pid)}</p>
       </div>`;
   
     return el;
   }
   
   /* ================================================================
      PAGINATION — module-level, single source of truth
      ================================================================ */
   
   const PAGE = {
     limit:     40,   // ← change this to your preferred initial batch size
     increment: 40,   // ← cards revealed per "Load More" click
     allCards:  [],   // master list (order = Supabase order_by)
     btn:       null, // reference to the Load More button element
   };
   
   /**
    * Create (or find) the Load More button and wire its click.
    * The button is injected as a sibling AFTER the wrapper, not inside it,
    * so it is never included in grid layout calculations.
    */
   function setupLoadMoreButton(wrapper) {
    
    if (PAGE.btn) return;

    let container = document.querySelector('.load-more-btn-cont');
  
    if (!container) {
      container = document.createElement('div');
      container.className = 'load-more-btn-cont';
      wrapper.insertAdjacentElement('afterend', container);
    }
  
    let btn = document.getElementById('load-more-btn');
  
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'load-more-btn';
      btn.className = 'load-more-btn';
      btn.textContent = 'Load More Products';
      container.appendChild(btn);
    }
  
    PAGE.btn = btn;
  
    btn.onclick = null;
  
    btn.addEventListener('click', () => {

      if (window.gtag) {
        gtag('event', 'load_more_clicked');
      }
    
      PAGE.limit += PAGE.increment;
      updatePagination();
    
      
      const firstNew = wrapper.querySelectorAll(
        '.product-card-container:not(.paginated-hidden):not(.hidden)'
      )[PAGE.limit - PAGE.increment];
  
      firstNew?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  
  
  /**
    * Core pagination function.
    *
    * Rules:
    *   - Only considers cards NOT hidden by search (.search-hidden)
    *   - Of those, shows the first PAGE.limit; hides the rest
    *   - Shows / hides the Load More button accordingly
    *   - Called by: initial load, Load More click, search filter, clear search
    */
   function updatePagination() {
     /* Cards the search engine has not hidden */
     const visible = PAGE.allCards.filter(c => !c.classList.contains('search-hidden'));
   
     visible.forEach((card, i) => {
       if (i < PAGE.limit) {
         card.classList.remove('paginated-hidden');
       } else {
         card.classList.add('paginated-hidden');
       }
     });
   
     /* Also ensure search-hidden cards are always fully hidden */
     PAGE.allCards.forEach(c => {
       if (c.classList.contains('search-hidden')) {
         c.classList.add('paginated-hidden');
       }
     });
   
     const btn = PAGE.btn;
     if (btn) {
       const hasMore = visible.length > PAGE.limit;
       btn.style.display = hasMore ? 'block' : 'none';
       btn.textContent   = hasMore
         ? `Load More  (${visible.length - PAGE.limit} remaining)`
         : 'Load More Products';
     }
   }
   
   /**
    * Called by the search engine (script.js performSearch) after
    * show/hide decisions have been applied to all cards.
    * Resets to first page so user sees top results.
    */
   function resetPaginationLimit() {
     PAGE.limit = PAGE.increment;
     updatePagination();
   }
   
   /* Expose to script.js (non-module) */
   window.updatePagination    = updatePagination;
   window.resetPaginationLimit = resetPaginationLimit;
   
   /* ================================================================
      CARD INIT — badges, per-card initialisation
      ================================================================ */
   function initAllCards(wrapper) {
     const allCards = Array.from(wrapper.querySelectorAll('.product-card-container'));
     PAGE.allCards  = allCards;
   
     allCards.forEach(card => {
       /* 1. Initialise interactivity (gallery, zoom, video, fullscreen, bg-blender) */
       if (!card.dataset.initialized && typeof initializeProductCard === 'function') {
         initializeProductCard(card);
         card.dataset.initialized = 'true';
       }
   
       /* 2. Time badge (guard: only add if not already present) */
       const mediaContainer = card.querySelector('.product-media-container');
       if (mediaContainer && !mediaContainer.querySelector('.badge-new')) {
         const badge = buildBadge(card.dataset.date);
         if (badge) mediaContainer.appendChild(badge);
       }
     });
   
     /* 3. Rebuild search index with all freshly-injected cards */
     if (typeof window.reinitSearch === 'function') {
       window.reinitSearch();
     }
   
     /* 4. Run pagination (AFTER reinitSearch so search-hidden state is correct) */
     updatePagination();
   }
   
   /* ================================================================
      MAIN LOADER
      ================================================================ */
   async function loadHomepageProducts() {
     const wrapper = document.querySelector('.product-cards-wrapper');
     if (!wrapper) {
       console.warn('[WSG] .product-cards-wrapper not found.');
       return;
     }
   
     /* Show loading placeholder */
     wrapper.innerHTML = `
       <p class="loading-msg"
          style="padding:60px;text-align:center;color:rgba(255,255,255,.4);
                 grid-column:1/-1;font-size:14px;">
         Loading products…
       </p>`;
   
     /* ── Fetch published products with images via join ── */
     const { data: products, error } = await supabase
       .from('products')
       .select(`
         id,
         custom_product_id,
         name,
         category,
         condition,
         price,
         quantity,
         brand,
         ram,
         processor,
         storage,
         screen_size,
         operating_system,
         supplier,
         video_url,
         keywords,
         whatsapp_link,
         specs,
         post_date,
         product_images (
           public_url,
           is_primary,
           sort_order
         )
       `)
       .eq('is_published', true)
       .order('post_date', { ascending: false });
   
     if (error) {
       console.error('[WSG] Supabase error:', error.message);
       wrapper.innerHTML = `
         <p style="text-align:center;color:#ff6b6b;padding:60px;grid-column:1/-1;">
           Failed to load products. <button onclick="loadHomepageProducts()"
             style="color:#FB8F0D;background:none;border:none;cursor:pointer;
                    text-decoration:underline;">Retry</button>
         </p>`;
       return;
     }
   
     if (!products?.length) {
       wrapper.innerHTML = `
         <p style="text-align:center;color:rgba(255,255,255,.4);padding:60px;
                   grid-column:1/-1;">
           No products available yet. Check back soon!
         </p>`;
       return;
     }
   
     /* ── Clear loader, inject cards ── */
     wrapper.innerHTML = '';
   
     products.forEach(p => {
       const card = buildProductCard(p, p.product_images || []);
       wrapper.appendChild(card);
     });
   
     /* ── Create / wire the Load More button ── */
     setupLoadMoreButton(wrapper);
   
     /* ── Init cards, search index, pagination ── */
     initAllCards(wrapper);

     setTimeout(() => {
       checkUrlForProductHighlight();
     }, 400);

     if (window.reinitSearch) {
       window.reinitSearch();
     }
}
   
   /* ── Expose for retry button and external calls ── */
   window.loadHomepageProducts = loadHomepageProducts;
   
   /* Modules are deferred — DOM is ready */
   loadHomepageProducts();
   

/* ================================================================
   DEEP-LINK / URL HIGHLIGHT SYSTEM
   Reads ?pid= from URL, finds the matching card, forces it visible,
   scrolls to it, and plays a highlight animation.
   ================================================================ */

   function checkUrlForProductHighlight() {
    const params = new URLSearchParams(window.location.search);
    const pid    = params.get('pid');
    if (!pid) return;
  
    /* Find card by DOM id or data-product-id attribute */
    const safeId = 'p-' + pid.replace(/[^a-zA-Z0-9_-]/g, '-');
    const card   = document.getElementById(safeId) ||
                   Array.from(document.querySelectorAll('[data-product-id]'))
                     .find(el => el.dataset.productId === pid);
  
    if (!card) {
      console.warn(`[WSG Deep-link] No card found for pid: "${pid}"`);
      return;
    }
  
    /* ── Force card visible regardless of pagination state ── */
    card.classList.remove('paginated-hidden', 'search-hidden', 'hidden');
  
    /* If the card is beyond the current pagination limit, extend it */
    if (PAGE.allCards.length) {
      const idx = PAGE.allCards.indexOf(card);
      if (idx >= 0 && idx >= PAGE.limit) {
        PAGE.limit = idx + 1;          /* expose just enough cards */
        updatePagination();
      }
    }
  
    /* ── Scroll + highlight after brief paint delay ── */
    requestAnimationFrame(() => {
      setTimeout(() => {
        /* Scroll navbar height into account */
        const navH   = document.querySelector('.nav-bar')?.offsetHeight || 72;
        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });  

        window.scrollBy({
          top: -navH - 20,
          behavior: "smooth"
        });
        
        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        
        setTimeout(() => {
          window.scrollBy({
            top: -navH - 20,
            behavior: "smooth"
          });
        }, 300);
        
        /* Trigger highlight */
        card.classList.add('card-highlighted');
  
        /* Show a subtle toast so user knows which product was linked */
        showDeepLinkToast(card);
  
        /* Remove highlight class after animation completes (5s) */
      }, 250);
    });
  }
  
  function showDeepLinkToast(card) {
    const name = card.dataset.name ||
                 card.querySelector('.product-name')?.textContent || 'Product';
    const toast = document.createElement('div');
    toast.className  = 'deeplink-toast';
    toast.innerHTML  = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="#25D366" stroke-width="2.5" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>Showing: <strong>${name}</strong></span>`;
    document.body.appendChild(toast);
  
    /* Animate in → hold → animate out */
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
      setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
      }, 3500);
    });
  }
  
  /* Run after cards are injected — called inside loadHomepageProducts() */
  /* Make sure this line is inside loadHomepageProducts() after initAllCards(): */
  /*   checkUrlForProductHighlight();                                           */
  