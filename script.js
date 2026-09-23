const gridContainer = document.getElementById('produce-grid');

let reviewsByFarmer = {};
let reviewedByMe = new Set();

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    if (price === null || price === undefined) return '';
    const num = parseInt(String(price).replace(/\D/g, ''), 10);
    if (isNaN(num)) return price;
    return num.toLocaleString('en-NG');
}

function getProductKey(item) {
    return [
        item.title || '',
        item.farmer || '',
        item.location || '',
        item.phone || '',
        item.quantity || '',
        String(item.price || '')
    ].join('|').toLowerCase().replace(/\s+/g, '-');
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('farmconnect-cart') || '[]');
    } catch (error) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('farmconnect-cart', JSON.stringify(cart));
    if (typeof window.updateCartBadge === 'function') {
        window.updateCartBadge();
    }
}

function addItemToCart(item) {
    const cart = getCart();
    const productKey = getProductKey(item);
    const existingItem = cart.find(entry => entry.productKey === productKey);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productKey,
            title: item.title,
            category: item.category,
            image: item.image,
            farmer: item.farmer,
            location: item.location,
            phone: item.phone,
            quantity: 1,
            unitPrice: parseInt(String(item.price).replace(/\D/g, ''), 10) || 0,
            createdAt: item.createdAt || new Date().toISOString()
        });
    }

    saveCart(cart);
    return cart;
}

function renderRatingHTML(farmerId) {
    const data = reviewsByFarmer[farmerId];
    if (!data || data.count === 0) {
        return `<span class="no-rating">☆ No reviews yet</span>`;
    }
    const avg = (data.sum / data.count).toFixed(1);
    const label = data.count === 1 ? 'review' : 'reviews';
    return `<span class="stars">★</span> <span class="rating-text">${avg} (${data.count} ${label})</span>`;
}

function rerenderRatings() {
    document.querySelectorAll('.rating-display').forEach(el => {
        el.innerHTML = renderRatingHTML(el.dataset.farmerId);
    });
}

function rebuildReviewedByMe() {
    reviewedByMe = new Set();
    const myUid = window.fbAuth?.currentUser?.uid;
    if (!myUid) return;
    Object.entries(reviewsByFarmer).forEach(([farmerId, data]) => {
        if (data.reviews.some(r => r.buyerUid === myUid)) {
            reviewedByMe.add(farmerId);
        }
    });
}

function formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function drawCard(item) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.createdAt = item.createdAt?.toMillis?.() || 0;
    card.dataset.priceNum = parseInt(String(item.price).replace(/\D/g, ''), 10) || 0;

    const phoneNumber = item.phone || "2349025013517";
    const message = encodeURIComponent(`Hello ${item.farmer || 'Farmer'}, I am interested in buying ${item.title} (${item.quantity}) listed on FarmConnect.`);
    const whatsappLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    const productKey = getProductKey(item);

    card.innerHTML = `
        <div class="img-container skeleton">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" class="card-img" onload="this.parentElement.classList.remove('skeleton')"
                 onerror="this.src='https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500'">
        </div>
        <div class="card-content">
            <div class="card-top-row">
                <span class="tag">${escapeHtml(item.category)}</span>
                <span class="location-chip">📍 ${escapeHtml(item.location)}</span>
            </div>
            <h3 class="title">${escapeHtml(item.title)}</h3>
            <div class="price">₦${formatPrice(item.price)}</div>
            <div class="details">
                <p>📦 <strong>Unit:</strong> ${escapeHtml(item.quantity)}</p>
                <p>🧑🏾‍🌾 <strong>Farmer:</strong> ${escapeHtml(item.farmer)}</p>
                ${item.createdAt ? `<p style="font-size:12px; color:var(--text-light); margin-top:4px;">🕐 Listed ${formatDate(item.createdAt)}</p>` : ''}
            </div>
            <div class="rating-display" data-farmer-id="${escapeHtml(item.phone)}" data-farmer-name="${escapeHtml(item.farmer)}">
                ${renderRatingHTML(item.phone)}
            </div>
            <div class="card-actions">
                <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="btn-buy">
                    <span>💬</span> WhatsApp Farmer
                </a>
                <button type="button" class="btn-add-cart" data-key="${escapeHtml(productKey)}">
                    <span>🛒</span> Add to Order
                </button>
            </div>
        </div>
    `;

    card.querySelector('.rating-display').addEventListener('click', () => {
        openReviewModal(item.phone, item.farmer);
    });

    const addCartBtn = card.querySelector('.btn-add-cart');
    if (addCartBtn) {
        addCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addItemToCart(item);
            addCartBtn.innerHTML = '<span>✓</span> Added to Cart!';
            addCartBtn.style.background = 'var(--primary-forest)';
            addCartBtn.style.color = '#ffffff';
            setTimeout(() => {
                addCartBtn.innerHTML = '<span>🛒</span> Add to Order';
                addCartBtn.style.background = '';
                addCartBtn.style.color = '';
            }, 1800);
        });
    }

    gridContainer.appendChild(card);
}

// Wait for firebase to be ready, then attach listeners
function initListeners() {
    if (!window.fbDb || !gridContainer) return;

    window.fbDb.collection("produce").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        gridContainer.innerHTML = '';
        if (snapshot.empty) {
            gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px dashed var(--border-warm);">
                <p style="font-size:18px; font-weight:600; color:var(--text-heading); margin-bottom:8px;">Waiting for fresh harvests...</p>
                <p style="font-size:14px; color:var(--text-muted);">Are you a local farmer? Be the first to list your produce!</p>
                <a href="farmer.html" class="btn-nav-primary" style="margin-top:16px; display:inline-flex;">List Your Produce</a>
            </div>`;
            return;
        }
        snapshot.forEach((doc) => drawCard(doc.data()));
        applySort();
    }, (error) => {
        console.error("Listener Error:", error);
    });

    window.fbDb.collection("reviews").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        reviewsByFarmer = {};
        snapshot.forEach((doc) => {
            const r = doc.data();
            if (!r.farmerId) return;
            if (!reviewsByFarmer[r.farmerId]) {
                reviewsByFarmer[r.farmerId] = { sum: 0, count: 0, reviews: [] };
            }
            reviewsByFarmer[r.farmerId].sum += r.rating;
            reviewsByFarmer[r.farmerId].count += 1;
            reviewsByFarmer[r.farmerId].reviews.push({ ...r, id: doc.id });
        });
        rebuildReviewedByMe();
        rerenderRatings();
        const modal = document.getElementById('review-modal');
        if (modal && modal.style.display === 'flex' && modal.dataset.openFor) {
            openReviewModal(modal.dataset.openFor, modal.dataset.openForName);
        }
    }, (err) => console.error("Reviews error:", err));
}

initListeners();

window.addEventListener('authready', () => {
    rebuildReviewedByMe();
    rerenderRatings();
});

// ===== Review modal =====
function openReviewModal(farmerId, farmerName) {
    let modal = document.getElementById('review-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'review-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    modal.dataset.openFor = farmerId;
    modal.dataset.openForName = farmerName;

    const data = reviewsByFarmer[farmerId];
    const avg = data && data.count > 0 ? (data.sum / data.count).toFixed(1) : '—';
    const count = data ? data.count : 0;
    const reviews = data ? data.reviews : [];

    const user = window.fbAuth?.currentUser;
    const profile = window.currentUserProfile;
    const alreadyReviewed = reviewedByMe.has(farmerId);

    let actionHTML = '';
    if (!user || !profile) {
        actionHTML = `
            <div class="review-locked" style="background:var(--bg-sage-soft); border-radius:var(--radius-md); padding:16px; text-align:center; border:1px solid var(--border-sage);">
                <p style="margin-bottom:12px; font-weight:600; color:var(--text-heading);">Sign in to leave a verified review</p>
                <a href="auth.html?next=index.html" class="btn-submit-review" style="display:inline-block; text-decoration:none; padding:10px 24px;">Sign In</a>
            </div>`;
    } else if (alreadyReviewed) {
        actionHTML = `<p class="review-locked" style="background:var(--bg-sage-soft); border-radius:var(--radius-md); padding:14px; text-align:center; font-weight:600; color:var(--primary-olive);">You have already reviewed this farmer. Thank you for building trust!</p>`;
    } else {
        actionHTML = `
            <form class="review-form" id="review-form" style="margin-top:20px; padding-top:18px; border-top:1px solid var(--border-subtle);">
                <h4 style="margin-bottom:12px; font-size:16px; color:var(--text-heading);">Leave a review as ${escapeHtml(profile.name)}</h4>
                <div class="star-input" data-rating="0">
                    ${[1,2,3,4,5].map(n => `<span class="star-clickable" data-value="${n}">☆</span>`).join('')}
                </div>
                <textarea id="review-comment" placeholder="Share your experience (produce freshness, delivery speed, packaging)..." rows="3"></textarea>
                <button type="submit" class="btn-submit-review">Submit Review</button>
            </form>`;
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Reviews for ${escapeHtml(farmerName)}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="rating-summary">
                    <div class="rating-big">★ ${avg}</div>
                    <div class="rating-count">${count} ${count === 1 ? 'verified review' : 'verified reviews'}</div>
                </div>
                <div class="reviews-list">
                    ${reviews.length === 0
                        ? '<p class="no-reviews" style="text-align:center; color:var(--text-muted); font-style:italic; padding:20px;">No reviews yet. Be the first to review this farmer!</p>'
                        : reviews.map(r => `
                            <div class="review-item">
                                <div class="review-header">
                                    <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                                    <span class="review-author">${escapeHtml(r.buyerName)}</span>
                                </div>
                                ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ''}
                                <span class="review-date">${formatDate(r.createdAt)}</span>
                            </div>
                        `).join('')}
                </div>
                ${actionHTML}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    const starInput = modal.querySelector('.star-input');
    if (starInput) {
        const stars = starInput.querySelectorAll('.star-clickable');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.dataset.value);
                starInput.dataset.rating = value;
                stars.forEach((s, i) => {
                    s.textContent = i < value ? '★' : '☆';
                });
            });
        });
    }

    const form = modal.querySelector('#review-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitReview(farmerId, farmerName);
        });
    }
}

function closeModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.style.display = 'none';
}

function submitReview(farmerId, farmerName) {
    const user = window.fbAuth?.currentUser;
    const profile = window.currentUserProfile;
    if (!user || !profile) {
        if (typeof window.showAlertModal === 'function') {
            window.showAlertModal({
                icon: '🔒',
                title: 'Sign In Required',
                message: 'Please sign in to leave a verified review for this farmer.',
                buttonText: 'Sign In',
                onConfirm: () => { window.location.href = 'auth.html?next=index.html'; }
            });
        }
        return;
    }

    const ratingEl = document.querySelector('.star-input');
    const rating = parseInt(ratingEl.dataset.rating);
    const comment = document.getElementById('review-comment').value.trim();

    if (!rating || rating < 1) {
        if (typeof window.showAlertModal === 'function') {
            window.showAlertModal({
                icon: '⭐',
                title: 'Rating Required',
                message: 'Please select a star rating between 1 and 5 stars.',
                buttonText: 'Select Rating'
            });
        }
        return;
    }

    const submitBtn = document.querySelector('.btn-submit-review');
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting Review...";

    window.fbDb.collection("reviews").add({
        farmerId,
        farmerName,
        rating,
        buyerName: profile.name,
        buyerUid: user.uid,
        comment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // success - snapshot updates modal
    }).catch(err => {
        console.error('Review error:', err);
        if (typeof window.showAlertModal === 'function') {
            window.showAlertModal({
                icon: '⚠️',
                title: 'Submission Error',
                message: 'Could not submit your review. Please check your connection and try again.',
                buttonText: 'Close'
            });
        }
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Review";
    });
}

// ===== Search & filters =====
const searchInput = document.getElementById('search-bar');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.card').forEach(card => {
            const title = (card.querySelector('.title')?.innerText || '').toLowerCase();
            const details = (card.querySelector('.details')?.innerText || '').toLowerCase();
            const location = (card.querySelector('.location-chip')?.innerText || '').toLowerCase();
            card.style.display = (title.includes(term) || details.includes(term) || location.includes(term)) ? "flex" : "none";
        });
    });
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelector('.tab.active')?.classList.remove('active');
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        document.querySelectorAll('.card').forEach(card => {
            const category = card.querySelector('.tag')?.innerText;
            card.style.display = (filter === "all" || category === filter) ? "flex" : "none";
        });
    });
});

function applySort() {
    const sortSelect = document.getElementById('sort-select');
    if (!sortSelect || !gridContainer) return;
    const sortBy = sortSelect.value;
    const cards = Array.from(gridContainer.querySelectorAll('.card'));
    cards.sort((a, b) => {
        if (sortBy === 'price-asc') return (Number(a.dataset.priceNum) || 0) - (Number(b.dataset.priceNum) || 0);
        if (sortBy === 'price-desc') return (Number(b.dataset.priceNum) || 0) - (Number(a.dataset.priceNum) || 0);
        return (Number(b.dataset.createdAt) || 0) - (Number(a.dataset.createdAt) || 0);
    });
    cards.forEach(card => gridContainer.appendChild(card));
}

const sortSelectEl = document.getElementById('sort-select');
if (sortSelectEl) {
    sortSelectEl.addEventListener('change', applySort);
}