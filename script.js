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

// --- NEW: DYNAMIC BADGE LOGIC ---
const now = new Date();
const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

cards.forEach(card => {
    const postDateStr = card.getAttribute('data-date');
    if (postDateStr) {
        const postDate = new Date(postDateStr);
        const timeDiff = now - postDate;

        if (timeDiff > 0 && timeDiff < thirtyDaysInMs) {
            const mediaContainer = card.querySelector('.product-media-container');
            if (mediaContainer && !mediaContainer.querySelector('.badge-new')) {
                
                let badgeText = '';
                const diffMins = Math.floor(timeDiff / (1000 * 60));
                const diffHours = Math.floor(timeDiff / (1000 * 60 * 60));
                const diffDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                // Formatting Logic:
                if (diffMins < 60) {
                    badgeText = `${diffMins}M`; // Minutes (e.g., 24M)
                } else if (diffHours < 72) {
                    badgeText = `${diffHours}H`; // Hours up to 72 (e.g., 1H)
                } else {
                    badgeText = `${diffDays}D`; // Days after 72 hours (e.g., 4D)
                }

                const badge = document.createElement('div');
                badge.className = 'badge-new';
                badge.innerText = badgeText;
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
            masonryInstance.appended(card);
            masonryInstance.layout();
        });
    });
}, {
    rootMargin: '500px'
});
