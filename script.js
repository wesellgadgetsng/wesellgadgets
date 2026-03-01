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
    // BACKGROUND BLENDER
    // ==========================================
    const firstImg = container.querySelector('.product-media-image');
    if (firstImg) {
        const applyBackground = () => {
            container.style.backgroundImage = `url(${firstImg.src})`;
        };

        if (firstImg.complete && firstImg.naturalWidth) {
            applyBackground();
        } else {
            firstImg.onload = applyBackground;
        }
    }

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
}


// ==========================================
// LOAD MORE + BADGE LOGIC
// ==========================================
let currentLimit = 20; // Initial number of cards to show
const increment = 20;  // How many to show on "Load More" click

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.product-cards-wrapper');
    const loadMoreBtn = document.getElementById('load-more-btn'); // Ensure this ID exists in your HTML
    if (!grid) return;

    let cards = Array.from(grid.querySelectorAll('.product-card-container'));

    // --- DYNAMIC PERIOD BADGE LOGIC (Shortened for brevity) ---
    const now = new Date();
    const seventyTwoHoursInMs = 72 * 60 * 60 * 1000; // Threshold for pulse animation
    
    cards.forEach(card => {
        const postDateStr = card.getAttribute('data-date');
        if (postDateStr) {
            const postDate = new Date(postDateStr);
            const timeDiff = now - postDate;
    
            if (timeDiff > 0) {
                const mediaContainer = card.querySelector('.product-media-container');
                if (mediaContainer && !mediaContainer.querySelector('.badge-new')) {
                    
                    let badgeText = '';
                    const sec = 1000;
                    const min = sec * 60;
                    const hr = min * 60;
                    const day = hr * 24;
                    const wk = day * 7;
                    const mnth = day * 30.44;
                    const yr = day * 365.25;
    
                    // Determine Badge Text
                    if (timeDiff >= yr) badgeText = `${Math.floor(timeDiff / yr)}Y`;
                    else if (timeDiff >= mnth) badgeText = `${Math.floor(timeDiff / mnth)}MN`;
                    else if (timeDiff >= wk) badgeText = `${Math.floor(timeDiff / wk)}W`;
                    else if (timeDiff >= day) badgeText = `${Math.floor(timeDiff / day)}D`;
                    else if (timeDiff >= hr) badgeText = `${Math.floor(timeDiff / hr)}H`;
                    else if (timeDiff >= min) badgeText = `${Math.floor(timeDiff / min)}M`;
                    else badgeText = `${Math.floor(timeDiff / sec)}S`;
    
                    const badge = document.createElement('div');
                    badge.className = 'badge-new';
                    badge.innerText = badgeText;
    
                    // Only add pulse if item is less than 72 hours old
                    if (timeDiff < seventyTwoHoursInMs) {
                        badge.classList.add('pulse');
                    }
    
                    mediaContainer.appendChild(badge);
                }
            }
        }
    });
    
    // --- REVERSE ORDER & PREPARE FOR PAGINATION ---
    cards.sort((a, b) => {
        return new Date(b.dataset.date) - new Date(a.dataset.date);
    }).forEach(card => {
        grid.appendChild(card);
        card.classList.add('paginated-hidden');
    });

    cards.forEach(card => {
        if (!card.dataset.initialized) {
          initializeProductCard(card);
          card.dataset.initialized = 'true';
        }
      });

    // --- PAGINATION FUNCTION ---
    window.updatePagination = function() {
        // Find cards that aren't hidden by SEARCH
        const searchableCards = cards.filter(card => !card.classList.contains('hidden'));
        
        searchableCards.forEach((card, index) => {
            if (index < currentLimit) {
                card.classList.remove('paginated-hidden');
            } else {
                card.classList.add('paginated-hidden');
            }
        });

        // Toggle "Load More" Button Visibility
        if (loadMoreBtn) {
            if (searchableCards.length > currentLimit) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }

    };

    // --- BUTTON CLICK EVENT ---
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentLimit += increment;
            updatePagination();
        });
    }

    // Run pagination on start
    updatePagination();
});


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
            products.forEach(p => p.element.classList.remove('hidden'));
            updateResultsCount(0, '');
            hideNoResults();
            return;
        }

        let visibleCount = 0;
        products.forEach(product => {
            const isMatch = searchWords.every(word => {
                const stemmedSearch = stemWord(word);
                return product.tokens.some(token => token.includes(word) || token.includes(stemmedSearch));
            });

            if (isMatch) {
                product.element.classList.remove('hidden');
                visibleCount++;
            } else {
                product.element.classList.add('hidden');
            }
        });

        currentLimit = 20; 

        if (typeof updatePagination === 'function') {
            updatePagination();
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
        const liveCards = Array.from(document.querySelectorAll('.product-card-container'));
        products.length = 0;

        liveCards.forEach(card => {
            const name = card.querySelector('.product-name')?.textContent?.trim().toLowerCase() || '';
            const brand = card.querySelector('.brand.keyword')?.textContent?.trim().toLowerCase() || '';

            const categories = [];
            if (card.classList.contains('laptop') || card.classList.contains('laptops')) categories.push('laptop','laptops');
            if (card.classList.contains('phone') || card.classList.contains('phones')) categories.push('phone','phones');
            if (card.classList.contains('tablet') || card.classList.contains('tablets')) categories.push('tablet','tablets');
            if (card.classList.contains('watch') || card.classList.contains('watches')) categories.push('watch','watches');

            const textContent = card.innerText.toLowerCase();
            const rawTokens = `${name} ${brand} ${categories.join(' ')} ${textContent}`
            .split(/\s+/)
            .filter(Boolean);

            const stemmedTokens = rawTokens.map(t => stemWord(t));
            const allTokens = [...new Set([...rawTokens, ...stemmedTokens])];

            products.push({
            element: card,
            name,
            brand,
            mainCategory: categories[0] || '',
            tokens: allTokens,
            fullText: textContent
            });
        });
        };

  // ────────────────────────────────────────────────────────


    
    document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) hideSuggestions();
    });
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