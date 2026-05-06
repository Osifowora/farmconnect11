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
    const message = encodeURIComponent(`Hello, I'm interested in the ${item.title} listed on FarmConnect.`);
    const whatsappLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    card.innerHTML = `
        <div class="img-container skeleton">
            <img src="${item.image}" alt="${item.title}" class="card-img" onload="this.parentElement.classList.remove('skeleton')"
                 onerror="this.src='https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500'">
        </div>
        <div class="card-content">
            <span class="tag">${item.category}</span>
            <h3 class="title">${item.title}</h3>
            <div class="price">₦${formatPrice(item.price)}</div>
            <div class="details">
    <p>📦 ${item.quantity}</p>
    <p>📍 ${item.location}</p>
    <p>🧑🏾‍🌾 ${item.farmer}</p>
    ${item.createdAt ? `<p style="color:#9ca3af;font-size:13px;">🕐 Listed ${formatDate(item.createdAt)}</p>` : ''}
</div>
            <div class="rating-display" data-farmer-id="${escapeHtml(item.phone)}" data-farmer-name="${escapeHtml(item.farmer)}">
                ${renderRatingHTML(item.phone)}
            </div>
            <a href="${whatsappLink}" target="_blank" class="btn-buy">Contact via WhatsApp</a>
        </div>
    `;

    card.querySelector('.rating-display').addEventListener('click', () => {
        openReviewModal(item.phone, item.farmer);
    });

    gridContainer.appendChild(card);
}

// Wait for firebase to be ready, then attach listeners
function initListeners() {
    window.fbDb.collection("produce").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        gridContainer.innerHTML = '';
        if (snapshot.empty) {
            gridContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px;">Waiting for new harvests...</p>`;
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
            <div class="review-locked">
                <p style="margin-bottom:12px;">Sign in to leave a review</p>
                <a href="auth.html?next=index.html" class="btn-submit-review" style="display:inline-block;text-decoration:none;">Sign In</a>
            </div>`;
    } else if (alreadyReviewed) {
        actionHTML = `<p class="review-locked">You've already reviewed this farmer. Thanks!</p>`;
    } else {
        actionHTML = `
            <form class="review-form" id="review-form">
                <h4>Leave a review as ${escapeHtml(profile.name)}</h4>
                <div class="star-input" data-rating="0">
                    ${[1,2,3,4,5].map(n => `<span class="star-clickable" data-value="${n}">☆</span>`).join('')}
                </div>
                <textarea id="review-comment" placeholder="Share your experience (optional)" rows="3"></textarea>
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
                    <div class="rating-count">${count} ${count === 1 ? 'review' : 'reviews'}</div>
                </div>
                <div class="reviews-list">
                    ${reviews.length === 0
                        ? '<p class="no-reviews">Be the first to leave a review.</p>'
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
    const user = window.fbAuth.currentUser;
    const profile = window.currentUserProfile;
    if (!user || !profile) {
        alert('Please sign in to leave a review.');
        return;
    }

    const ratingEl = document.querySelector('.star-input');
    const rating = parseInt(ratingEl.dataset.rating);
    const comment = document.getElementById('review-comment').value.trim();

    if (!rating || rating < 1) {
        alert('Please select a star rating.');
        return;
    }

    const submitBtn = document.querySelector('.btn-submit-review');
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    window.fbDb.collection("reviews").add({
        farmerId,
        farmerName,
        rating,
        buyerName: profile.name,
        buyerUid: user.uid,
        comment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
        console.error('Review error:', err);
        alert('Could not submit review. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Review";
    });
    // Snapshot listener will refresh modal
}

// ===== Search & filters =====
document.getElementById('search-bar').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const title = card.querySelector('.title').innerText.toLowerCase();
        const details = card.querySelector('.details').innerText.toLowerCase();
        card.style.display = (title.includes(term) || details.includes(term)) ? "block" : "none";
    });
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelector('.tab.active').classList.remove('active');
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        document.querySelectorAll('.card').forEach(card => {
            const category = card.querySelector('.tag').innerText;
            card.style.display = (filter === "all" || category === filter) ? "block" : "none";
        });
    });
});

function applySort() {
    const sortBy = document.getElementById('sort-select').value;
    const cards = Array.from(gridContainer.querySelectorAll('.card'));
    cards.sort((a, b) => {
        if (sortBy === 'price-asc') return a.dataset.priceNum - b.dataset.priceNum;
        if (sortBy === 'price-desc') return b.dataset.priceNum - a.dataset.priceNum;
        return b.dataset.createdAt - a.dataset.createdAt;
    });
    cards.forEach(card => gridContainer.appendChild(card));
}

document.getElementById('sort-select').addEventListener('change', applySort);