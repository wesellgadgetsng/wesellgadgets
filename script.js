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
// INITIALIZE ALL PRODUCT CARDS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.product-card-container');
    
});

// ==========================================
// PRODUCT CARD INITIALIZATION
// ==========================================
function initializeProductCard(card) {
    const wrapper = card.querySelector('[data-gallery]');
    const container = card.querySelector('.product-media-container');
    const pagination = card.querySelector('[data-pagination]');
    const fullscreenBtn = card.querySelector('[data-fullscreen-toggle]');
    const showMoreBtn = card.querySelector('[data-show-more-toggle]');
    const specsText = card.querySelector('[data-specs-text]');
    
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
    // ZOOM FUNCTIONS
    // ==========================================
    function updateTransform() {
        if (!zoomState.active || !zoomState.image) return;
        
        const img = zoomState.image;
        const viewW = container.clientWidth;
        const viewH = container.clientHeight;
        const imgW = img.naturalWidth * zoomState.scale;
        const imgH = img.naturalHeight * zoomState.scale;
        
        const minX = Math.min(0, viewW - imgW);
        const maxX = 0;
        const minY = Math.min(0, viewH - imgH);
        const maxY = 0;
        
        zoomState.translateX = Math.max(minX, Math.min(zoomState.translateX, maxX));
        zoomState.translateY = Math.max(minY, Math.min(zoomState.translateY, maxY));
        
        img.style.transform = `translate(${zoomState.translateX}px, ${zoomState.translateY}px)`;
    }

    function zoomIn(targetImg, focusX = null, focusY = null) {
        if (zoomState.active && zoomState.image === targetImg) return;
        
        if (zoomState.active && zoomState.image !== targetImg) {
            zoomOut();
        }
        
        const viewW = container.clientWidth;
        const viewH = container.clientHeight;
        const naturalW = targetImg.naturalWidth;
        const naturalH = targetImg.naturalHeight;
        
        if (naturalW === 0 || naturalH === 0) return;
        
        zoomState.active = true;
        zoomState.image = targetImg;
        zoomState.scale = 2.5;
        
        const zoomedW = naturalW * zoomState.scale;
        const zoomedH = naturalH * zoomState.scale;
        
        targetImg.style.width = `${zoomedW}px`;
        targetImg.style.height = `${zoomedH}px`;
        targetImg.classList.add('is-zoomed');
        
        if (focusX !== null && focusY !== null) {
            const rect = container.getBoundingClientRect();
            const relativeX = focusX - rect.left;
            const relativeY = focusY - rect.top;
            
            zoomState.translateX = relativeX - (relativeX / viewW) * zoomedW;
            zoomState.translateY = relativeY - (relativeY / viewH) * zoomedH;
        } else {
            zoomState.translateX = (viewW - zoomedW) / 2;
            zoomState.translateY = (viewH - zoomedH) / 2;
        }
        
        wrapper.classList.add('zoom-active');
        container.classList.add('zoom-active');
        
        updateTransform();
    }

    function zoomOut() {
        if (!zoomState.active || !zoomState.image) return;
        
        const img = zoomState.image;
        
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.transform = 'none';
        img.classList.remove('is-zoomed', 'dragging');
        
        wrapper.classList.remove('zoom-active');
        container.classList.remove('zoom-active');
        
        zoomState.active = false;
        zoomState.image = null;
        zoomState.scale = 1;
        zoomState.translateX = 0;
        zoomState.translateY = 0;
    }

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchMidpoint(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    // ==========================================
    // MOUSE EVENTS
    // ==========================================
    wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        
        if (zoomState.active && e.target === zoomState.image) {
            zoomState.isPanning = true;
            zoomState.startX = e.clientX;
            zoomState.startY = e.clientY;
            zoomState.startTranslateX = zoomState.translateX;
            zoomState.startTranslateY = zoomState.translateY;
            zoomState.image.classList.add('dragging');
            e.preventDefault();
        } else if (!zoomState.active) {
            zoomState.isMouseDown = true;
            zoomState.startX = e.clientX;
            zoomState.scrollLeft = wrapper.scrollLeft;
            wrapper.classList.add('no-snap');
        }
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (zoomState.isPanning) {
            const deltaX = e.clientX - zoomState.startX;
            const deltaY = e.clientY - zoomState.startY;
            zoomState.translateX = zoomState.startTranslateX + deltaX;
            zoomState.translateY = zoomState.startTranslateY + deltaY;
            updateTransform();
            e.preventDefault();
        } else if (zoomState.isMouseDown && !zoomState.active) {
            const deltaX = e.clientX - zoomState.startX;
            wrapper.scrollLeft = zoomState.scrollLeft - deltaX;
        }
    });

    wrapper.addEventListener('mouseup', () => {
        zoomState.isPanning = false;
        zoomState.isMouseDown = false;
        wrapper.classList.remove('no-snap');
        if (zoomState.image) zoomState.image.classList.remove('dragging');
    });

    wrapper.addEventListener('mouseleave', () => {
        zoomState.isPanning = false;
        zoomState.isMouseDown = false;
        wrapper.classList.remove('no-snap');
        if (zoomState.image) zoomState.image.classList.remove('dragging');
    });

    wrapper.addEventListener('dblclick', (e) => {
        if (e.target.tagName !== 'IMG') return;
        
        if (zoomState.active && zoomState.image === e.target) {
            zoomOut();
        } else {
            zoomIn(e.target, e.clientX, e.clientY);
        }
    });

    // ==========================================
    // TOUCH EVENTS
    // ==========================================
    wrapper.addEventListener('touchstart', (e) => {
        touchStartData.moved = false;
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            touchStartData.time = Date.now();
            touchStartData.x = touch.clientX;
            touchStartData.y = touch.clientY;
            
            if (zoomState.active && e.target === zoomState.image) {
                zoomState.isPanning = true;
                zoomState.startX = touch.clientX;
                zoomState.startY = touch.clientY;
                zoomState.startTranslateX = zoomState.translateX;
                zoomState.startTranslateY = zoomState.translateY;
                e.preventDefault();
            }
        } else if (e.touches.length === 2) {
            zoomState.isPinching = true;
            wrapper.classList.add('no-snap');
            
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            touchStartData.startDist = dist;
            touchStartData.lastDist = dist;
            
            if (!zoomState.active) {
                const target = e.touches[0].target;
                if (target.tagName === 'IMG') {
                    const midpoint = getTouchMidpoint(e.touches[0], e.touches[1]);
                    zoomIn(target, midpoint.x, midpoint.y);
                }
            }
            
            e.preventDefault();
        }
    }, { passive: false });

    wrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && zoomState.isPanning) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - zoomState.startX;
            const deltaY = touch.clientY - zoomState.startY;
            
            zoomState.translateX = zoomState.startTranslateX + deltaX;
            zoomState.translateY = zoomState.startTranslateY + deltaY;
            updateTransform();
            
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                touchStartData.moved = true;
            }
            e.preventDefault();
        } else if (e.touches.length === 2 && zoomState.isPinching && zoomState.active) {
            const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
            const scaleFactor = currentDist / touchStartData.lastDist;
            const oldScale = zoomState.scale;
            
            zoomState.scale = Math.max(1, Math.min(5, oldScale * scaleFactor));
            
            const img = zoomState.image;
            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;
            const newW = naturalW * zoomState.scale;
            const newH = naturalH * zoomState.scale;
            
            img.style.width = `${newW}px`;
            img.style.height = `${newH}px`;
            
            const midpoint = getTouchMidpoint(e.touches[0], e.touches[1]);
            const rect = container.getBoundingClientRect();
            const focusX = midpoint.x - rect.left;
            const focusY = midpoint.y - rect.top;
            
            zoomState.translateX = focusX - (focusX - zoomState.translateX) * (zoomState.scale / oldScale);
            zoomState.translateY = focusY - (focusY - zoomState.translateY) * (zoomState.scale / oldScale);
            
            updateTransform();
            touchStartData.lastDist = currentDist;
            e.preventDefault();
        }
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
        zoomState.isPanning = false;
        wrapper.classList.remove('no-snap');
        if (zoomState.image) zoomState.image.classList.remove('dragging');
        
        if (zoomState.isPinching && zoomState.scale < 1.1) {
            zoomOut();
        }
        zoomState.isPinching = false;
        
        if (e.touches.length === 0 && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const now = Date.now();
            const deltaTime = now - touchStartData.time;
            const deltaX = Math.abs(touch.clientX - touchStartData.x);
            const deltaY = Math.abs(touch.clientY - touchStartData.y);
            
            if (deltaTime < 300 && deltaX < 10 && deltaY < 10 && !touchStartData.moved) {
                const target = touch.target;
                const tapX = (touchStartData.x + touch.clientX) / 2;
                const tapY = (touchStartData.y + touch.clientY) / 2;
                
                if (now - tapState.lastTime < 300 && 
                    Math.abs(tapX - tapState.lastX) < 30 && 
                    Math.abs(tapY - tapState.lastY) < 30 &&
                    target === tapState.lastTarget) {
                    
                    if (target.tagName === 'IMG') {
                        if (zoomState.active && zoomState.image === target) {
                            zoomOut();
                        } else {
                            zoomIn(target, tapX, tapY);
                        }
                    }
                    
                    tapState.lastTime = 0;
                } else {
                    tapState.lastTime = now;
                    tapState.lastX = tapX;
                    tapState.lastY = tapY;
                    tapState.lastTarget = target;
                }
            }
        }
    }, { passive: false });

    wrapper.addEventListener('contextmenu', (e) => {
        if (zoomState.active) e.preventDefault();
    });

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

    wrapper.addEventListener('scroll', updateActiveDot);
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
        if (zoomState.active) {
            updateTransform();
        }
    });

    // ==========================================
    // SHOW MORE/LESS
    // ==========================================
    showMoreBtn.addEventListener('click', () => {
        specsText.classList.toggle('expanded');
        showMoreBtn.textContent =
            specsText.classList.contains('expanded') ? 'Show less' : 'Show more';

    // Force layout after DOM update
    requestAnimationFrame(() => {
        masonryInstance.layout();
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
// MASONRY + LOAD MORE LOGIC
// ==========================================
let masonryInstance = null;
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
    cards.reverse().forEach(card => {
        grid.appendChild(card);
        card.classList.add('paginated-hidden'); // Hide all by default
    });

    cards.forEach(card => {
        initializeProductCard(card);
    });


    // --- INITIALIZE MASONRY ---
    masonryInstance = new Masonry(grid, {
        itemSelector: '.product-card-container:not(.paginated-hidden):not(.hidden)',
        columnWidth: '.product-card-container',
        percentPosition: true,
        gutter: 16,
        horizontalOrder: true,
        transitionDuration: 0
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

        if (masonryInstance) {
            masonryInstance.reloadItems();
            masonryInstance.layout();
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
    imagesLoaded(grid).on('always', () => masonryInstance.layout());
});


// ==========================================
// Product card Lazy loading
// ==========================================
const cardObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(async entry => {
        if (!entry.isIntersecting) return;

        const card = entry.target;
        observer.unobserve(card);

        // Fetch product HTML
        const res = await fetch(`/product/${card.dataset.productId}.html`);
        card.innerHTML = await res.text();

        imagesLoaded(card, () => {
            masonryInstance.appended(card);
            masonryInstance.reloadItems();
            masonryInstance.layout();

        });
    });
}, {
    rootMargin: '500px'
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
    const productCards = document.querySelectorAll('.product-card-container');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (!searchInput || productCards.length === 0) return;

    let searchTimeout;

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
    // BUILD SEARCH INDEX
    // ==============================
    const products = Array.from(productCards).map(card => {
        const name = card.querySelector('.product-name')?.textContent?.trim().toLowerCase() || '';
        const brand = card.querySelector('.brand.keyword')?.textContent?.trim().toLowerCase() || '';
        
        const categories = [];
        if (card.classList.contains('laptop') || card.classList.contains('laptops')) categories.push('laptop', 'laptops');
        if (card.classList.contains('phone') || card.classList.contains('phones')) categories.push('phone', 'phones');
        if (card.classList.contains('tablet') || card.classList.contains('tablets')) categories.push('tablet', 'tablets');
        if (card.classList.contains('watch') || card.classList.contains('watches')) categories.push('watch', 'watches');

        const textContent = card.innerText.toLowerCase();
        const rawTokens = `${name} ${brand} ${categories.join(' ')} ${textContent}`.split(/\s+/).filter(Boolean);
        const stemmedTokens = rawTokens.map(t => stemWord(t));
        const allTokens = [...new Set([...rawTokens, ...stemmedTokens])];

        return {
            element: card,
            name,
            brand,
            mainCategory: categories[0] || '',
            tokens: allTokens,
            fullText: textContent
        };
    });

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
            relayoutMasonry();
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
        visibleCount === 0 ? showNoResults(searchTerm) : hideNoResults();
        if (hideSuggestionsFlag) hideSuggestions();
        relayoutMasonry();
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
    function relayoutMasonry() {
        if (!masonryInstance) return;
    
        masonryInstance.reloadItems();
        masonryInstance.layout();
    
        setTimeout(() => {
            masonryInstance.layout();
        }, 100);
    }
    
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
    
    document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) hideSuggestions();
    });
})();