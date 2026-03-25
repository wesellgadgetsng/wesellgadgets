// ==========================================
// SMART RESIZE HANDLING
// ==========================================
let resizeTimer;

window.addEventListener("resize", () => {
  document.body.classList.add("is-resizing");

  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.body.classList.remove("is-resizing");
  }, 150);
});

// ==========================================
// Hamburger
// ==========================================
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");

if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navLinks.classList.toggle("active");
    });
}

/* ================================================================
   WHATSAPP ORDER SYSTEM
   ================================================================ */

   const WA_NUMBER = '+2347039661343';   // ← your WhatsApp number

   /**
    * Build the canonical product page URL for a given product ID.
    * Works on both GitHub Pages and custom domain.
    */
   function buildProductUrl(pid) {
    return `${window.location.origin}/?pid=${encodeURIComponent(pid)}`;
  }
     
   /**
    * Extract all product info from a card element.
    * Reads data-* attributes first (reliable for dynamic cards),
    * falls back to visible text for static cards.
    */
   function extractCardData(card) {
     const txt = sel => card.querySelector(sel)?.textContent?.trim() || '';
     const dt  = key => card.dataset[key] || '';
   
     return {
       name:      dt('name')      || txt('.product-name'),
       brand:     dt('brand')     || txt('.brand.keyword'),
       category:  dt('category')  || txt('.product.keyword'),
       price:     dt('price')     || '',
       condition: txt('.condition.keyword'),
       quantity:  txt('.quantity.keyword'),
       specs:     txt('[data-specs-text]'),
       ram:       txt('.ram.keyword'),
       processor: txt('.core.keyword'),
       storage:   txt('.storage.keyword'),
       os:        txt('.os.keyword'),
       screen:    txt('.screen.keyword'),
       supplier:  txt('.supplier.keyword'),
       pid:       dt('productId') || txt('.pid.keyword'),
     };
   }
   
   /**
    * Format price as ₦ XXX,XXX
    */
   function formatPriceNGN(rawPrice) {
     const n = parseFloat(String(rawPrice).replace(/[^\d.]/g, ''));
     if (!n && n !== 0) return 'Contact for price';
     return '₦' + n.toLocaleString('en-NG');
   }
   
   /**
    * Build the full pre-filled WhatsApp message for a product card.
    * Returns { message: string, url: string, waHref: string }
    */
   function buildWhatsAppPayload(card) {
     const d   = extractCardData(card);
     const pid = d.pid;
     const url = pid ? buildProductUrl(pid) : window.location.href;
   
     /* ── Spec lines (only include fields that have data) ── */
     const specItems = [
       d.ram       && `• RAM: ${d.ram}`,
       d.storage   && `• Storage: ${d.storage}`,
       d.processor && `• Processor: ${d.processor}`,
       d.os        && `• OS: ${d.os}`,
       d.screen    && `• Screen: ${d.screen}`,
     ].filter(Boolean);
   
     /* ── Free-text specs block (from admin's specs field) ── */
     const specsBlock = d.specs && !specItems.length
       ? `📋 *Details:*\n${d.specs}`
       : specItems.length
         ? `📋 *Specifications:*\n${specItems.join('\n')}`
         : '';
   
     /* ── Condition badge ── */
     const condLine = d.condition ? `📦 *Condition:* ${d.condition}` : '';
   
     /* ── Assemble message (WhatsApp bold = *text*) ── */
     const lines = [
       `🛒 *Order Enquiry — WeSellGadgetsNG*`,
       ``,
       `━━━━━━━━━━━━━━━━━━━━━`,
       `📱 *${d.name}*`,
       d.brand   ? `🏷️  *Brand:* ${d.brand}`     : null,
       condLine  || null,
       d.quantity ? `📦 *Stock:* ${d.quantity}`   : null,
       ``,
       `💰 *Price: ${formatPriceNGN(d.price)}*`,
       `━━━━━━━━━━━━━━━━━━━━━`,
       specsBlock || null,
       specsBlock ? `` : null,          /* blank line after specs block */
       pid ? `🔢 *Product ID:* ${pid}` : null,
       ``,
       `🔗 *View this product on our store:*`,
       url,
       ``,
       `━━━━━━━━━━━━━━━━━━━━━`,
       `_Hi! I'm interested in ordering the product above._`,
       `_Please confirm availability and delivery options._`,
     ]
     .filter(line => line !== null)    /* remove nulls (missing fields) */
     .join('\n');
   
     const waHref = `https://wa.me/${WA_NUMBER.replace(/[^0-9]/g, '')}` +
                    `?text=${encodeURIComponent(lines)}`;
   
     return { message: lines, url, waHref };
   }
   
   /**
    * Open WhatsApp with the pre-filled message for a card.
    * Called by initializeProductCard's Order Now click handler.
    */
   function openWhatsApp(card) {
     const { waHref } = buildWhatsAppPayload(card);
     window.open(waHref, '_blank', 'noopener,noreferrer');
   }
   
   /**
    * Copy the product's shareable link to clipboard.
    * Shows a brief visual confirmation on the button.
    */
   async function copyProductLink(card, btn) {
     const d   = extractCardData(card);
     const url = d.pid ? buildProductUrl(d.pid) : window.location.href;
   
     try {
       await navigator.clipboard.writeText(url);
       showCopyFeedback(btn, '✓ Copied!');
     } catch {
       /* Fallback for older browsers / non-HTTPS */
       const ta = document.createElement('textarea');
       ta.value = url;
       ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
       document.body.appendChild(ta);
       ta.select();
       document.execCommand('copy');
       ta.remove();
       showCopyFeedback(btn, '✓ Copied!');
     }
   }
   
   function showCopyFeedback(btn, msg) {
     if (!btn) return;
     const orig = btn.innerHTML;
     btn.innerHTML  = msg;
     btn.classList.add('copy-success');
     btn.disabled   = true;
     setTimeout(() => {
       btn.innerHTML  = orig;
       btn.classList.remove('copy-success');
       btn.disabled   = false;
     }, 2000);
   }
   


// ==========================================
// PRODUCT CARD INITIALIZATION
// ==========================================
function initializeProductCard(card) {
    const wrapper = card.querySelector('[data-gallery]');
    const container = card.querySelector('.product-media-container');
    const pagination = card.querySelector('[data-pagination]');
    const fullscreenBtn = card.querySelector('[data-fullscreen-toggle]');
    
    // State for this specific card
    let zoomState = {
        active: false,
        image: null,
        scale: 1,
        translateX: 0,
        translateY: 0,
        startX: 0,
        startY: 0,
        startTranslateX: 0,
        startTranslateY: 0,
        isPanning: false,
        isPinching: false,
        isMouseDown: false
    };

    let tapState = {
        lastTime: 0,
        lastX: 0,
        lastY: 0,
        lastTarget: null
    };

    let touchStartData = {
        time: 0,
        x: 0,
        y: 0,
        moved: false,
        startDist: 0,
        lastDist: 0
    };


    // ==========================================
    // PAGINATION
    // ==========================================
    const images = wrapper.querySelectorAll('.product-media');
    const numImages = images.length;

    for (let i = 0; i < numImages; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.dataset.index = i;
        dot.addEventListener('click', () => {
            wrapper.scrollTo({ left: i * wrapper.clientWidth, behavior: 'smooth' });
        });
        pagination.appendChild(dot);
    }

    function updateActiveDot() {
        if (zoomState.active) return;
        const index = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
        pagination.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    let ticking = false;

    wrapper.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveDot();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    
    updateActiveDot();

    // ==========================================
    // FULLSCREEN
    // ==========================================
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
            fullscreenBtn.classList.add('fullscreen');
        } else {
            document.exitFullscreen();
            fullscreenBtn.classList.remove('fullscreen');
        }
    });

    document.addEventListener('fullscreenchange', () => {
        document.querySelectorAll('.is-zoomed').forEach(img => {
            img.style.transform = img.style.transform;
        });
    });
    
    // ==========================================
    // VIDEO CONTROLS
    // ==========================================
    const video = card.querySelector('[data-video]');
    const playBtn = card.querySelector('[data-play-toggle]');
    const timeDisplay = card.querySelector('[data-time-display]');
    const videoControls = card.querySelector('[data-video-controls]');
    const videoContainer = card.querySelector('.video-container');

    if (video && playBtn) {
        const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        const pauseIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

        function togglePlay(e) {
            if (e) e.stopPropagation();
            if (video.paused || video.ended) {
                video.play();
            } else {
                video.pause();
            }
        }

        function updatePlayButton() {
            if (video.paused) {
                playBtn.innerHTML = playIcon;
                videoContainer.classList.add('paused');
            } else {
                playBtn.innerHTML = pauseIcon;
                videoContainer.classList.remove('paused');
            }
        }

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }

        function updateProgress() {
            const current = formatTime(video.currentTime);
            const total = formatTime(video.duration || 0);
            timeDisplay.textContent = `${current} / ${total}`;
        }

        playBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);
        video.addEventListener('play', updatePlayButton);
        video.addEventListener('pause', updatePlayButton);
        video.addEventListener('timeupdate', updateProgress);

        videoControls.addEventListener('mousedown', (e) => e.stopPropagation());
        videoControls.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    // ── Order Now button ──────────────────────────────────────────
    const orderBtn = card.querySelector('.order-now-btn, [data-action="order"]');
    if (orderBtn) {
        orderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openWhatsApp(card);
        });
    }

    // ── Share / Copy-link button ──────────────────────────────────
    const shareBtn = card.querySelector('.share-link-btn, [data-action="share"]');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            copyProductLink(card, shareBtn);
        });
    }

}

/* ================================================================
   PRICE FILTER — state lives here, updated by calibratePriceFilter
   ================================================================ */
   const PF = {
    min:        0,
    max:        Infinity,
    absMin:     0,
    absMax:     0,
    active:     false,    // true only when user has narrowed range
    ready:      false,    // true once calibrated from real data
    inputMin:   null,
    inputMax:   null,
    fillEl:     null,
    minLabel:   null,
    maxLabel:   null,
    resetBtn:   null,
    filterEl:   null,
  };
  
  /* Expose so homepage-products.js can read PF.min / PF.max */
  window.priceFilter = PF;
  
  /* ── Calibrate once products are loaded ── */
  window.calibratePriceFilter = function (prices) {
    const valid = prices.filter(p => typeof p === 'number' && p > 0).sort((a, b) => a - b);
    if (!valid.length) return;
  
    PF.absMin = valid[0];
    PF.absMax = valid[valid.length - 1];
    PF.min    = PF.absMin;
    PF.max    = PF.absMax;
    PF.ready  = true;
  
    /* Smart step: ~100 stops across the range, snaps to ₦1,000 */
    const rawStep = Math.ceil((PF.absMax - PF.absMin) / 100);
    const step    = Math.ceil(rawStep / 1000) * 1000 || 1000;
  
    [PF.inputMin, PF.inputMax].forEach((inp, i) => {
      if (!inp) return;
      inp.min   = PF.absMin;
      inp.max   = PF.absMax;
      inp.value = i === 0 ? PF.absMin : PF.absMax;
      inp.step  = step;
    });
  
    _updatePriceDisplay();
    _updateFill();
  
    if (PF.filterEl) {
      PF.filterEl.style.display = 'block';
      /* Animate in */
      requestAnimationFrame(() => PF.filterEl.classList.add('pf-visible'));
    }
  };
  
  /* ── Internal helpers ── */
  function _updatePriceDisplay() {
    const fmt = n => '₦' + Math.round(n).toLocaleString('en-NG');
    if (PF.minLabel) PF.minLabel.textContent = fmt(PF.min);
    if (PF.maxLabel) PF.maxLabel.textContent = fmt(PF.max);
  
    PF.active = (PF.min > PF.absMin) || (PF.max < PF.absMax);
    if (PF.resetBtn) PF.resetBtn.style.display = PF.active ? 'inline-flex' : 'none';
  
    /* Highlight the value labels when filter is active */
    [PF.minLabel, PF.maxLabel].forEach(el => {
      if (!el) return;
      el.classList.toggle('price-val--active', PF.active);
    });
  }
  
  function _updateFill() {
    if (!PF.fillEl) return;
  
    const range = PF.absMax - PF.absMin;
    if (range === 0) {
      PF.fillEl.style.cssText = 'left:0%;width:100%';
      return;
    }
  
    const l = ((PF.min - PF.absMin) / range) * 100;
    const r = ((PF.max - PF.absMin) / range) * 100;
  
    /* Apple-style smooth animation */
    PF.fillEl.style.transition = 'left .18s cubic-bezier(.4,0,.2,1), width .18s cubic-bezier(.4,0,.2,1)';
  
    PF.fillEl.style.left  = l + '%';
    PF.fillEl.style.width = (r - l) + '%';
  }

  /* ── Init (wires DOM elements once they exist) ── */
  function initPriceFilter() {
    PF.filterEl  = document.getElementById('price-filter');
    PF.inputMin  = document.getElementById('price-range-min');
    PF.inputMax  = document.getElementById('price-range-max');
    PF.fillEl    = document.getElementById('price-track-fill');
    PF.minLabel  = document.getElementById('price-min-display');
    PF.maxLabel  = document.getElementById('price-max-display');
    PF.resetBtn  = document.getElementById('price-reset');

    /* ── Tap anywhere on track to move slider (desktop + mobile) ── */
    const track = document.querySelector('.price-slider-wrap');
    
    if (track) {
    track.addEventListener('pointerdown', (e) => {
        const rect = track.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;

        const value = PF.absMin + pct * (PF.absMax - PF.absMin);

        /* move nearest handle */
        const distMin = Math.abs(value - PF.min);
        const distMax = Math.abs(value - PF.max);

        if (distMin < distMax) {
        PF.min = Math.min(value, PF.max);
        PF.inputMin.value = PF.min;
        } else {
        PF.max = Math.max(value, PF.min);
        PF.inputMax.value = PF.max;
        }

        _updatePriceDisplay();
        _updateFill();
        _applyPriceFilter();
    });
    }
  
    if (!PF.inputMin || !PF.inputMax) return;
  
    /* Debounce so rapid dragging doesn't thrash the search */
    let pfTimer;
    const debouncedApply = () => {
      clearTimeout(pfTimer);
      pfTimer = setTimeout(_applyPriceFilter, 80);
    };
  
    PF.inputMin.addEventListener('input', () => {
      /* Prevent min crossing max */
      if (+PF.inputMin.value > +PF.inputMax.value) {
        PF.inputMin.value = PF.inputMax.value;
      }
      PF.min = +PF.inputMin.value;
      _updatePriceDisplay();
      _updateFill();
      debouncedApply();
    });

    PF.inputMin.addEventListener('change', () => {
        PF.min = +PF.inputMin.value;
        _updatePriceDisplay();
        _updateFill();
        _applyPriceFilter();
      });

  
    PF.inputMax.addEventListener('input', () => {
      /* Prevent max crossing min */
      if (+PF.inputMax.value < +PF.inputMin.value) {
        PF.inputMax.value = PF.inputMin.value;
      }
      PF.max = +PF.inputMax.value;
      _updatePriceDisplay();
      _updateFill();
      debouncedApply();
    });

    PF.inputMax.addEventListener('change', () => {
        PF.max = +PF.inputMax.value;
        _updatePriceDisplay();
        _updateFill();
        _applyPriceFilter();
      });
  
    if (PF.resetBtn) {
      PF.resetBtn.addEventListener('click', () => {
        PF.min = PF.absMin;
        PF.max = PF.absMax;
        PF.inputMin.value = PF.absMin;
        PF.inputMax.value = PF.absMax;
        _updatePriceDisplay();
        _updateFill();
        _applyPriceFilter();
      });
    }
  }
  
  function _applyPriceFilter() {
    /* Call into search IIFE via exposed window.performSearch */
    const q = document.getElementById('product-search')?.value || '';
    if (typeof window.performSearch === 'function') {
      window.performSearch(q, true);
    }
  }
  


// ==========================================
// PROFESSIONAL ECOMMERCE SEARCH ENGINE (V7)
// ==========================================
(function initProductSearch() {
    const searchInput = document.getElementById('product-search');
    const searchClear = document.getElementById('search-clear');
    const searchResultsCount = document.getElementById('search-results-count');
    const searchSuggestions = document.getElementById('search-suggestions');
    const noResults = document.getElementById('no-results');
    const searchQueryDisplay = document.getElementById('search-query-display');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (!searchInput) return;

    let searchTimeout;

    let products = [];

    const icons = {
        category: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
        brand: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
        product: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
        search: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
    };

    function stemWord(word) {
        if (!word || word.length < 3) return word;
        return word.toLowerCase()
            .replace(/ies$/, 'y')
            .replace(/es$/, '')
            .replace(/s$/, '');
    }


    

    // ==============================
    // CORE SEARCH LOGIC
    // ==============================
    function performSearch(query, hideSuggestionsFlag = false) {
        const searchTerm = query.toLowerCase().trim();
        const searchWords = searchTerm.split(/\s+/).filter(Boolean);
    
        if (searchTerm === '') {
            /* If price filter is active, still filter by price on empty text query */
            const pf = window.priceFilter;
            if (pf?.active) {
                products.forEach(product => {
                    const inRange = product.priceValue >= pf.min && product.priceValue <= pf.max;
                    product.element.classList.toggle('hidden',        !inRange);
                    product.element.classList.toggle('search-hidden', !inRange);
                });
                const count = products.filter(p => !p.element.classList.contains('search-hidden')).length;
                updateResultsCount(count, `₦${Math.round(pf.min).toLocaleString()} – ₦${Math.round(pf.max).toLocaleString()}`);
                if (typeof window.resetPaginationLimit === 'function') window.resetPaginationLimit();
                return;
            }
            products.forEach(p => {
                p.element.classList.remove('hidden', 'search-hidden');
            });
            updateResultsCount(0, '');
            hideNoResults();
            if (typeof window.resetPaginationLimit === 'function') window.resetPaginationLimit();
            return;
        }
            
        let visibleCount = 0;
        products.forEach(product => {
            /* ── Price gate ── */
            const pf = window.priceFilter;
            const inPriceRange = !pf?.active ||
            (product.priceValue >= pf.min && product.priceValue <= pf.max);

            /* ── Text gate ── */
            const inTextSearch = !searchWords.length || searchWords.every(word => {
                const stemmedSearch = stemWord(word);
                return product.tokens.some(token =>
                    token.includes(word) || token.includes(stemmedSearch)
                );
            });

            const isMatch = inPriceRange && inTextSearch;
    
            if (isMatch) {
                product.element.classList.remove('hidden');
                product.element.classList.remove('search-hidden'); 
                visibleCount++;
            } else {
                product.element.classList.add('hidden');
                product.element.classList.add('search-hidden');  
            }
        });
    
        // ↓ ADD: reset to page 1 of results after every search
        if (typeof window.resetPaginationLimit === 'function') {
            window.resetPaginationLimit();
        }
    
        updateResultsCount(visibleCount, searchTerm);
        if (visibleCount === 0) {
            showNoResults(searchTerm);
        } else {
            hideNoResults();
        }
    
        if (hideSuggestionsFlag) hideSuggestions();
    }
    
    // ==============================
    // SUGGESTIONS (MAX 10 ITEMS)
    // ==============================
    function generateSuggestions(query) {
        const val = query.toLowerCase().trim();
        const stemmedVal = stemWord(val);
        if (val.length < 1) { hideSuggestions(); return; }

        const catSuggestions = [];
        const brandSuggestions = [];
        const prodSuggestions = [];
        const seenBrands = new Set();
        const seenProds = new Set();
        
        const MAX_TOTAL = 10;

        // 1. Find Categories
        const cats = ['Laptops', 'Phones', 'Tablets', 'Watches'];
        cats.forEach(c => {
            const singular = stemWord(c);
            if (c.toLowerCase().includes(val) || singular.includes(stemmedVal)) {
                const count = products.filter(p => p.mainCategory === singular).length;
                if (count > 0) catSuggestions.push({ type: 'category', text: c, query: c, count });
            }
        });

        // 2. Find Brands
        products.forEach(p => {
            if (p.brand && (p.brand.includes(val) || stemWord(p.brand).includes(stemmedVal)) && !seenBrands.has(p.brand)) {
                const count = products.filter(x => x.brand === p.brand).length;
                brandSuggestions.push({ type: 'brand', text: p.brand.toUpperCase(), query: p.brand, count });
                seenBrands.add(p.brand);
            }
        });

        // 3. Find Products
        products.forEach(p => {
            if ((p.name.includes(val) || stemWord(p.name).includes(stemmedVal)) && !seenProds.has(p.name)) {
                prodSuggestions.push({ type: 'product', text: p.name, query: p.name, count: 1 });
                seenProds.add(p.name);
            }
        });

        // ==============================
        // ENFORCE LIMIT: 10 total
        // ==============================
        const finalCats = catSuggestions.slice(0, MAX_TOTAL);
        const remainingAfterCats = MAX_TOTAL - finalCats.length;
        
        const finalBrands = brandSuggestions.slice(0, remainingAfterCats);
        const remainingAfterBrands = MAX_TOTAL - (finalCats.length + finalBrands.length);
        
        const finalProds = prodSuggestions.slice(0, remainingAfterBrands);

        displaySuggestions(val, finalCats, finalBrands, finalProds);
    }

    function displaySuggestions(currentInput, cats, brands, prods) {
        let html = `
            <div class="suggestion-item search-finalize-btn" data-query="${currentInput}">
                ${icons.search}
                <span class="suggestion-text">Search for "<strong>${currentInput}</strong>"</span>
            </div>
        `;

        if (cats.length) {
            html += `<div class="suggestion-category">Categories</div>`;
            cats.forEach(s => html += renderSuggestionItem(s));
        }
        if (brands.length) {
            html += `<div class="suggestion-category">Brands</div>`;
            brands.forEach(s => html += renderSuggestionItem(s));
        }
        if (prods.length) {
            html += `<div class="suggestion-category">Products</div>`;
            prods.forEach(s => html += renderSuggestionItem(s));
        }

        searchSuggestions.innerHTML = html;
        searchSuggestions.style.display = 'block';

        searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.onclick = () => {
                searchInput.value = item.dataset.query;
                performSearch(item.dataset.query, true);
            };
        });
    }

    function renderSuggestionItem(sug) {
        return `
            <div class="suggestion-item" data-query="${sug.query}">
                ${icons[sug.type]}
                <span class="suggestion-text">${sug.text}</span>
                <span class="suggestion-count">${sug.count}</span>
            </div>
        `;
    }

    // ==============================
    // UTILITIES & EVENTS
    // ==============================

    function updateResultsCount(count, query) {
        if (!query) { searchResultsCount.classList.remove('visible'); return; }
        searchResultsCount.innerHTML = `Found <strong>${count}</strong> items for "<strong>${query}</strong>"`;
        searchResultsCount.classList.add('visible');
    }

    function showNoResults(q) { searchQueryDisplay.textContent = q; noResults.style.display = 'block'; }
    function hideNoResults() { noResults.style.display = 'none'; }
    function hideSuggestions() { searchSuggestions.style.display = 'none'; }

    searchInput.addEventListener('input', e => {
        const val = e.target.value;
        searchClear.style.display = val ? 'flex' : 'none';
        generateSuggestions(val);
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(val, false), 400);
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchInput.value, true);
        }
        if (e.key === 'Escape') hideSuggestions();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        performSearch('', true);
    });

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            hideNoResults();
            performSearch('', true);
        });


}

      // ── Expose re-indexer for dynamic card loading ──────────

      window.reinitSearch = function () {
        const liveCards = Array.from(
            document.querySelectorAll('.product-card-container')
        );
        products.length = 0;
    
        liveCards.forEach(card => {
            /* Read from data-* first (most reliable for dynamic cards),
               fall back to text content for static cards */
            const name     = (card.dataset.name     || card.querySelector('.product-name')?.textContent  || '').trim().toLowerCase();
            const brand    = (card.dataset.brand    || card.querySelector('.brand.keyword')?.textContent || '').trim().toLowerCase();
            const category = (card.dataset.category || '').trim().toLowerCase();
            const price    = (card.dataset.price    || '').trim();
    
            /* Spec fields from hidden keyword elements */
            const ram      = card.querySelector('.ram.keyword')?.textContent?.trim().toLowerCase()     || '';
            const core     = card.querySelector('.core.keyword')?.textContent?.trim().toLowerCase()    || '';
            const storage  = card.querySelector('.storage.keyword')?.textContent?.trim().toLowerCase() || '';
            const os       = card.querySelector('.os.keyword')?.textContent?.trim().toLowerCase()      || '';
            const screen   = card.querySelector('.screen.keyword')?.textContent?.trim().toLowerCase()  || '';
            const supplier = card.querySelector('.supplier.keyword')?.textContent?.trim().toLowerCase()|| '';
            const pid      = card.querySelector('.pid.keyword')?.textContent?.trim().toLowerCase()     || '';
    
            /* Category variants (singular + plural) */
            const categories = [];
            const catVariants = {
                laptop:  ['laptop','laptops'],
                phone:   ['phone','phones'],
                tablet:  ['tablet','tablets'],
                watch:   ['watch','watches'],
                console: ['console','consoles'],
            };
            Object.entries(catVariants).forEach(([key, vals]) => {
                if (card.classList.contains(key) || card.classList.contains(key+'s') ||
                    category.includes(key)) {
                    categories.push(...vals);
                }
            });
    
            /* Build full text token pool */
            const textContent = card.innerText.toLowerCase();
            const rawTokens   = `${name} ${brand} ${categories.join(' ')} ${ram} ${core} ${storage} ${os} ${screen} ${supplier} ${pid} ${price} ${textContent}`
                .split(/\s+/)
                .filter(t => t.length >= 2);
    
            const stemmedTokens = rawTokens.map(t => stemWord(t));
            const allTokens     = [...new Set([...rawTokens, ...stemmedTokens])];
    
            products.push({
                element:      card,
                name,
                brand,
                mainCategory: categories[0] || category,
                tokens:       allTokens,
                fullText:     textContent,
                priceValue:   parseFloat(card.dataset.price || '0'),
                
            });
        });
    
        console.log(`[WSG Search] Re-indexed ${products.length} cards.`);
    
        /* After re-indexing, update pagination counts */
        if (typeof window.updatePagination === 'function') {
            window.updatePagination();
        }
    };
    
  // ────────────────────────────────────────────────────────


    
    document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) hideSuggestions();
    });

    window.performSearch = performSearch;

})();


    // ==========================================
    // SHOW MORE/LESS
    // ==========================================

const modal = document.getElementById("spec-modal");
const modalOverlay = document.querySelector(".spec-modal-overlay");
const modalClose = document.querySelector(".spec-modal-close");
const modalTitle = document.getElementById("modal-product-name");
const modalSpecs = document.getElementById("modal-specs-text");

document.addEventListener("click", function(e) {
    const btn = e.target.closest("[data-show-more-toggle]");
    if (!btn) return;

    const card = btn.closest(".product-card-container");
    const title = card.querySelector(".product-name").textContent;
    const specs = card.querySelector("[data-specs-text]").textContent;

    modalTitle.textContent = title;
    modalSpecs.textContent = specs;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
});

function closeModal() {
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// expose to modules
window.initializeProductCard = initializeProductCard;

// ==========================================
// GOOGLE ANALYTICS TRACKING (Track product clicks (interactions))
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initPriceFilter();

    /* Fix: null-guard GA search tracking */
    const gaSearchInput = document.querySelector('#product-search');
    if (gaSearchInput && typeof gtag !== 'undefined') {
        gaSearchInput.addEventListener('change', e => {
            gtag('event', 'search', { search_term: e.target.value });
        });
    }

    /* Fix: GA product click tracking — event delegation */
    document.addEventListener('click', e => {
        const card = e.target.closest('.product-card-container');
        if (card && typeof gtag !== 'undefined') {
            gtag('event', 'product_click', {
                product_name: card.dataset.name,
                product_id: card.dataset.productId,
            });
        }
    });
});