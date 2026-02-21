// ==========================================
// Hamburger
// ==========================================
const hamburger = document.querySelector(".hamburger");
            const navLinks = document.querySelector(".nav-links");

            hamburger.addEventListener("click", () => {
                // Toggle the .active class on the hamburger (for animation)
                hamburger.classList.toggle("active");
                // Toggle the .active class on the links (to show/hide)
                navLinks.classList.toggle("active");
            });



// ==========================================
// INITIALIZE ALL PRODUCT CARDS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.product-card-container');
    
    cards.forEach(card => {
        initializeProductCard(card);
    });
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
// MASONRY INITIALIZATION (Global Scope)
// ==========================================

let masonryInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.product-cards-wrapper');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.product-card-container'));
    

// --- DYNAMIC PERIOD BADGE LOGIC ---
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

    // --- REVERSE ORDER ---
    cards.reverse().forEach(card => grid.appendChild(card));

    // --- INITIALIZE MASONRY ---
    masonryInstance = new Masonry(grid, {
        itemSelector: '.product-card-container',
        columnWidth: '.product-card-container',
        percentPosition: true,
        gutter: 16,
        horizontalOrder: true,
        transitionDuration: 0
    });
    

    // Layout refresh
    imagesLoaded(grid).on('always', () => masonryInstance.layout());

    // Card functionality
    cards.forEach(card => {
        if (typeof initializeProductCard === 'function') initializeProductCard(card);
    });

    // Debounced Resize
    window.addEventListener('resize', debounce(() => {
        if (masonryInstance) masonryInstance.layout();
    }, 150));
});

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

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
            masonryInstance.options.itemSelector = '.product-card-container:not(.hidden)';
            masonryInstance.appended(card);
            masonryInstance.layout();
        });
    });
}, {
    rootMargin: '500px'
});


// ==========================================
// ADVANCED PRODUCT SEARCH WITH SUGGESTIONS
// ==========================================
(function initProductSearch() {
    const searchInput = document.getElementById('product-search');
    const searchClear = document.getElementById('search-clear');
    const searchResultsCount = document.getElementById('search-results-count');
    const searchSuggestions = document.getElementById('search-suggestions');
    const noResults = document.getElementById('no-results');
    const searchQueryDisplay = document.getElementById('search-query-display');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const productCards = document.querySelectorAll('.product-card-container');

    if (!searchInput || productCards.length === 0) return;

    let searchTimeout;
    let currentSuggestionIndex = -1;

    // ==========================================
    // EXTRACT STRUCTURED DATA FROM CARDS
    // ==========================================
    const cardData = Array.from(productCards).map(card => {
        // Extract from classList (category keywords)
        const classList = Array.from(card.classList);
        
        // Extract visible content
        const name = card.querySelector('.product-name')?.textContent?.trim() || '';
        const condition = card.querySelector('.condition')?.textContent?.trim() || '';
        const specs = card.querySelector('.specs')?.textContent?.trim() || '';
        const price = card.querySelector('.price')?.textContent?.trim() || '';
        
        // Extract hidden keywords
        const ram = card.querySelector('.ram.keyword')?.textContent?.trim() || '';
        const storage = card.querySelector('.storage.keyword')?.textContent?.trim() || '';
        const brand = card.querySelector('.brand.keyword')?.textContent?.trim() || '';
        const processor = card.querySelector('.core.keyword, .processor.keyword')?.textContent?.trim() || '';
        const screen = card.querySelector('.screen.keyword')?.textContent?.trim() || '';
        const os = card.querySelector('.os.keyword')?.textContent?.trim() || '';
        const productType = card.querySelector('.product.keyword')?.textContent?.trim() || '';
        
        // Determine category from classList
        let category = '';
        if (classList.includes('laptop') || classList.includes('laptops')) category = 'laptop';
        else if (classList.includes('phone') || classList.includes('phones')) category = 'phone';
        else if (classList.includes('tablet') || classList.includes('tablets')) category = 'tablet';
        else if (classList.includes('watch') || classList.includes('watches')) category = 'watch';
        
        return {
            element: card,
            category: category,
            name: name.toLowerCase(),
            brand: brand.toLowerCase(),
            condition: condition.toLowerCase(),
            specs: specs.toLowerCase(),
            price: price,
            ram: ram,
            storage: storage,
            processor: processor.toLowerCase(),
            screen: screen,
            os: os.toLowerCase(),
            productType: productType.toLowerCase(),
            // Combined search text
            searchText: `${name} ${brand} ${condition} ${specs} ${ram} ${storage} ${processor} ${screen} ${os} ${productType} ${category}`.toLowerCase()
        };
    });

    // ==========================================
    // KEYWORD EXTRACTION & MATCHING
    // ==========================================
    const keywordPatterns = {
        categories: ['laptop', 'laptops', 'phone', 'phones', 'tablet', 'tablets', 'watch', 'watches'],
        brands: ['apple', 'dell', 'samsung', 'hp', 'lenovo', 'asus', 'acer', 'microsoft', 'huawei'],
        ram: ['4gb', '8gb', '16gb', '32gb', '64gb', '4 gb', '8 gb', '16 gb', '32 gb', '64 gb'],
        storage: ['128gb', '256gb', '512gb', '1tb', '2tb', '128 gb', '256 gb', '512 gb'],
        processor: ['i3', 'i5', 'i7', 'i9', 'm1', 'm2', 'm3', 'm4', 'ryzen', 'intel', 'amd'],
        condition: ['new', 'used', 'refurbished', 'open box', 'brand new'],
        os: ['windows', 'mac', 'macos', 'ios', 'android', 'linux']
    };

    function extractKeywords(query) {
        const lowerQuery = query.toLowerCase();
        const words = lowerQuery.split(/\s+/);
        const extracted = {
            categories: [],
            brands: [],
            ram: [],
            storage: [],
            processor: [],
            condition: [],
            os: [],
            raw: words
        };

        for (const [type, patterns] of Object.entries(keywordPatterns)) {
            for (const pattern of patterns) {
                if (lowerQuery.includes(pattern)) {
                    if (!extracted[type].includes(pattern)) {
                        extracted[type].push(pattern);
                    }
                }
            }
        }

        return extracted;
    }

    // ==========================================
    // INTELLIGENT SEARCH FUNCTION 
    // ==========================================
    function performSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        if (searchTerm === '') {
            cardData.forEach(({ element }) => {
                element.classList.remove('hidden');
            });

            updateResultsCount(cardData.length);
            hideNoResults();
            hideSuggestions();
            relayoutMasonry();
            return;
        }

        const keywords = extractKeywords(searchTerm);
        let visibleCount = 0;

        cardData.forEach(({ element, category = '', brand = '', searchText = '', ram = '', storage = '', processor = '', condition = '', os = '' }) => {

            let matches = 0;
            let totalCriteria = 0;
            let shouldShow = false;

            category = category.toLowerCase();
            brand = brand.toLowerCase();
            searchText = searchText.toLowerCase();
            ram = ram.toLowerCase();
            storage = storage.toLowerCase();
            processor = processor.toLowerCase();
            condition = condition.toLowerCase();
            os = os.toLowerCase();

            // Category
            if (keywords.categories.length > 0) {
                totalCriteria++;
                if (keywords.categories.some(cat => category.includes(cat) || searchText.includes(cat))) {
                    matches++;
                }
            }

            // Brand
            if (keywords.brands.length > 0) {
                totalCriteria++;
                if (keywords.brands.some(b => brand.includes(b) || searchText.includes(b))) {
                    matches++;
                }
            }

            // RAM
            if (keywords.ram.length > 0) {
                totalCriteria++;
                if (keywords.ram.some(r => searchText.includes(r))) {
                    matches++;
                }
            }

            // Storage
            if (keywords.storage.length > 0) {
                totalCriteria++;
                if (keywords.storage.some(s => searchText.includes(s))) {
                    matches++;
                }
            }

            // Processor
            if (keywords.processor.length > 0) {
                totalCriteria++;
                if (keywords.processor.some(p => searchText.includes(p))) {
                    matches++;
                }
            }

            // Condition
            if (keywords.condition.length > 0) {
                totalCriteria++;
                if (keywords.condition.some(c => searchText.includes(c))) {
                    matches++;
                }
            }

            // OS
            if (keywords.os.length > 0) {
                totalCriteria++;
                if (keywords.os.some(o => searchText.includes(o))) {
                    matches++;
                }
            }

            // ===== STRICT MATCH LOGIC =====

            // 1️⃣ Exact product name match
            if (searchText === searchTerm) {
                shouldShow = true;
            }

            // 2️⃣ Structured keywords → require ALL match
            else if (totalCriteria > 0) {
                if (matches === totalCriteria) {
                    shouldShow = true;
                }
            }

            // 3️⃣ No structured keywords → require ALL words
            else {
                const words = searchTerm.split(/\s+/);
                const allWordsMatch = words.every(word => searchText.includes(word));
                if (allWordsMatch) {
                    shouldShow = true;
                }
            }

            // Apply visibility
            if (shouldShow) {
                element.classList.remove('hidden');
                visibleCount++;
            } else {
                element.classList.add('hidden');
            }
        });

        updateResultsCount(visibleCount, searchTerm);

        if (visibleCount === 0) {
            showNoResults(query);
        } else {
            hideNoResults();
        }

        relayoutMasonry();
    }

    // ==========================================
    // MASONRY SAFE RELAYOUT 
    // ==========================================
    function relayoutMasonry() {
        if (!masonryInstance) return;

        masonryInstance.reloadItems();
        masonryInstance.layout();
    }

    // ==========================================
    // AUTO-SUGGESTIONS
    // ==========================================
    function generateSuggestions(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            hideSuggestions();
            return;
        }

        const keywords = extractKeywords(searchTerm);
        const suggestions = [];
        const seen = new Set();

        // Suggest categories
        keywordPatterns.categories.forEach(cat => {
            if (cat.includes(searchTerm) && !seen.has(cat)) {
                const count = cardData.filter(item => item.category === cat.replace('s', '')).length;
                if (count > 0) {
                    suggestions.push({
                        type: 'category',
                        text: cat.charAt(0).toUpperCase() + cat.slice(1),
                        count: count,
                        query: cat
                    });
                    seen.add(cat);
                }
            }
        });

        // Suggest brands
        keywordPatterns.brands.forEach(brand => {
            if (brand.includes(searchTerm) && !seen.has(brand)) {
                const count = cardData.filter(item => item.brand.includes(brand)).length;
                if (count > 0) {
                    suggestions.push({
                        type: 'brand',
                        text: brand.charAt(0).toUpperCase() + brand.slice(1),
                        count: count,
                        query: brand
                    });
                    seen.add(brand);
                }
            }
        });

        // Suggest combinations (brand + category)
        if (keywords.brands.length > 0 || keywords.categories.length > 0) {
            cardData.forEach(item => {
                const combo = `${item.brand} ${item.category}`;
                if (combo.includes(searchTerm) && !seen.has(combo) && item.brand && item.category) {
                    const comboText = `${item.brand.charAt(0).toUpperCase() + item.brand.slice(1)} ${item.category}s`;
                    const count = cardData.filter(c => c.brand === item.brand && c.category === item.category).length;
                    if (count > 0) {
                        suggestions.push({
                            type: 'combo',
                            text: comboText,
                            count: count,
                            query: combo
                        });
                        seen.add(combo);
                    }
                }
            });
        }

        // Suggest specific products
        cardData.forEach(item => {
            if (item.name.includes(searchTerm) && !seen.has(item.name)) {
                suggestions.push({
                    type: 'product',
                    text: item.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    count: 1,
                    query: item.name
                });
                seen.add(item.name);
            }
        });

        displaySuggestions(suggestions.slice(0, 8)); // Limit to 8 suggestions
    }

    function displaySuggestions(suggestions) {
        if (suggestions.length === 0) {
            hideSuggestions();
            return;
        }

        const icons = {
            category: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
            brand: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
            combo: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m6-12l-6 3m6 6l-6-3m-6 3l6-3m-6-6l6 3"></path></svg>',
            product: '<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>'
        };

        let html = '';
        let lastType = '';

        suggestions.forEach((sug, index) => {
            if (sug.type !== lastType) {
                const categoryName = sug.type === 'combo' ? 'Popular Searches' : sug.type + 's';
                html += `<div class="suggestion-category">${categoryName}</div>`;
                lastType = sug.type;
            }

            const highlightedText = highlightMatch(sug.text, searchInput.value);
            html += `
                <div class="suggestion-item" data-query="${sug.query}" data-index="${index}">
                    ${icons[sug.type]}
                    <span class="suggestion-text">${highlightedText}</span>
                    <span class="suggestion-count">${sug.count}</span>
                </div>
            `;
        });

        searchSuggestions.innerHTML = html;
        searchSuggestions.style.display = 'block';
        currentSuggestionIndex = -1;

        // Add click listeners
        searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.dataset.query;
                performSearch(item.dataset.query);
                hideSuggestions();
            });
        });
    }

    function highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    function hideSuggestions() {
        searchSuggestions.style.display = 'none';
        currentSuggestionIndex = -1;
    }

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    function updateResultsCount(count, query = '') {
        if (query === '') {
            searchResultsCount.textContent = '';
            searchResultsCount.classList.remove('visible');
        } else {
            const productText = count === 1 ? 'product' : 'products';
            searchResultsCount.textContent = `Found ${count} ${productText} matching "${query}"`;
            searchResultsCount.classList.add('visible');
        }
    }

    function showNoResults(query) {
        searchQueryDisplay.textContent = query;
        noResults.style.display = 'block';
    }

    function hideNoResults() {
        noResults.style.display = 'none';
    }

    function relayoutMasonry() {
        if (masonryInstance) {
            masonryInstance.options.itemSelector = '.product-card-container:not(.hidden)';
            masonryInstance.reloadItems();
            setTimeout(() => {
                masonryInstance.layout();
            }, 50);
        }
    }

    function clearSearch() {
        searchInput.value = '';
        searchClear.style.display = 'none';
        hideSuggestions();
        performSearch('');
        searchInput.focus();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        searchClear.style.display = value ? 'flex' : 'none';

        clearTimeout(searchTimeout);
        
        // Show suggestions immediately
        generateSuggestions(value);
        
        // Debounce actual search
        searchTimeout = setTimeout(() => {
            performSearch(value);
        }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestions.length - 1);
            updateSuggestionHighlight(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
            updateSuggestionHighlight(suggestions);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSuggestionIndex >= 0 && suggestions[currentSuggestionIndex]) {
                suggestions[currentSuggestionIndex].click();
            } else {
                clearTimeout(searchTimeout);
                performSearch(searchInput.value);
                hideSuggestions();
            }
        } else if (e.key === 'Escape') {
            if (searchSuggestions.style.display === 'block') {
                hideSuggestions();
            } else {
                clearSearch();
            }
        }
    });

    function updateSuggestionHighlight(suggestions) {
        suggestions.forEach((sug, index) => {
            if (index === currentSuggestionIndex) {
                sug.style.background = 'linear-gradient(90deg, rgba(251, 143, 13, 0.15), rgba(251, 143, 13, 0.05))';
                sug.style.paddingLeft = '24px';
            } else {
                sug.style.background = '';
                sug.style.paddingLeft = '20px';
            }
        });
    }

    searchClear.addEventListener('click', clearSearch);
    clearSearchBtn.addEventListener('click', clearSearch);

    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            hideSuggestions();
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length >= 2) {
            generateSuggestions(searchInput.value);
        }
    });
})();
