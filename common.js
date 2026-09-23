(function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

const firebaseConfig = {
  apiKey: "AIzaSyDw84j4rQbBC2ycsyywtYykOXAVW6Ltg68",
  authDomain: "farmconnect-d91ed.firebaseapp.com",
  projectId: "farmconnect-d91ed",
  storageBucket: "farmconnect-d91ed.firebasestorage.app",
  messagingSenderId: "923903856948",
  appId: "1:923903856948:web:0cae9f751a9fc6ba001561"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

window.fbAuth = firebase.auth();
window.fbDb = firebase.firestore();
window.fbDb.settings({ experimentalForceLongPolling: true });
window.currentUserProfile = null;

function escapeNavHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCartItemCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('farmconnect-cart') || '[]');
        return cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    } catch (e) {
        return 0;
    }
}

function renderCartBadge() {
    const count = getCartItemCount();
    return `
        <a href="checkout.html" class="cart-badge-btn" id="nav-cart-btn" title="View Order & Checkout">
            🛒 Cart <span class="cart-count" id="nav-cart-count">${count}</span>
        </a>
    `;
}

function updateCartBadge() {
    const countEl = document.getElementById('nav-cart-count');
    if (countEl) {
        countEl.textContent = getCartItemCount();
    }
}
window.updateCartBadge = updateCartBadge;

/* ===== Centralized Custom Popups ===== */

function showAlertModal({ icon = '🌿', title = 'Notice', message = '', buttonText = 'Got it', onConfirm = null }) {
    const existing = document.getElementById('app-popup-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-popup-modal';
    overlay.className = 'app-popup-overlay';
    overlay.innerHTML = `
        <div class="app-popup-card" role="dialog" aria-modal="true">
            <div class="app-popup-icon">${icon}</div>
            <h3 class="app-popup-title">${escapeNavHtml(title)}</h3>
            <p class="app-popup-message">${escapeNavHtml(message)}</p>
            <div class="app-popup-actions">
                <button type="button" class="btn-popup-confirm" id="btn-popup-ok">${escapeNavHtml(buttonText)}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const closePopup = () => {
        overlay.remove();
        if (typeof onConfirm === 'function') onConfirm();
    };

    overlay.querySelector('#btn-popup-ok').addEventListener('click', closePopup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
    });
}
window.showAlertModal = showAlertModal;

function showConfirmModal({ icon = '🗑️', title = 'Confirm Action', message = '', confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm = null, onCancel = null }) {
    const existing = document.getElementById('app-popup-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-popup-modal';
    overlay.className = 'app-popup-overlay';
    overlay.innerHTML = `
        <div class="app-popup-card" role="dialog" aria-modal="true">
            <div class="app-popup-icon ${isDestructive ? 'destructive' : ''}">${icon}</div>
            <h3 class="app-popup-title">${escapeNavHtml(title)}</h3>
            <p class="app-popup-message">${escapeNavHtml(message)}</p>
            <div class="app-popup-actions">
                <button type="button" class="btn-popup-cancel" id="btn-popup-cancel">${escapeNavHtml(cancelText)}</button>
                <button type="button" class="btn-popup-confirm ${isDestructive ? 'destructive' : ''}" id="btn-popup-confirm">${escapeNavHtml(confirmText)}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-popup-cancel').addEventListener('click', () => {
        overlay.remove();
        if (typeof onCancel === 'function') onCancel();
    });

    overlay.querySelector('#btn-popup-confirm').addEventListener('click', () => {
        overlay.remove();
        if (typeof onConfirm === 'function') onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (typeof onCancel === 'function') onCancel();
        }
    });
}
window.showConfirmModal = showConfirmModal;

function renderThemeToggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return `<button class="theme-toggle" id="theme-toggle" title="Toggle rustic dark mode" aria-label="Toggle theme">${isDark ? '☀️' : '🌙'}</button>`;
}

function attachThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
}

function renderSignedInNav(profile) {
    const navArea = document.getElementById('nav-auth-area');
    if (navArea) {
        const isOnFarmerPage = window.location.pathname.includes('farmer.html');
        navArea.innerHTML = `
            ${renderCartBadge()}
            ${isOnFarmerPage ? '' : '<a href="farmer.html" class="btn-nav-primary">🌿 List Produce</a>'}
            <span class="nav-user">👋 ${escapeNavHtml(profile.name)}</span>
            <button class="btn-text nav-signout" id="nav-signout">Sign Out</button>
            ${renderThemeToggle()}
        `;
        document.getElementById('nav-signout')?.addEventListener('click', () => {
            window.fbAuth.signOut().then(() => window.location.href = 'index.html');
        });
        attachThemeToggle();
    }

    const mobileAuth = document.getElementById('nav-menu-auth-item');
    if (mobileAuth) {
        mobileAuth.innerHTML = `
            <div class="nav-mobile-user-card">
                <span class="nav-mobile-user-name">👋 ${escapeNavHtml(profile.name)}</span>
                <button type="button" class="btn-text nav-mobile-signout" id="nav-mobile-signout">Sign Out</button>
            </div>
        `;
        document.getElementById('nav-mobile-signout')?.addEventListener('click', () => {
            window.fbAuth.signOut().then(() => window.location.href = 'index.html');
        });
    }
}

function renderSignedOutNav() {
    const navArea = document.getElementById('nav-auth-area');
    if (navArea) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isOnFarmerPage = window.location.pathname.includes('farmer.html');
        navArea.innerHTML = `
            ${renderCartBadge()}
            ${isOnFarmerPage ? '' : '<a href="farmer.html" class="btn-nav-primary">🌿 List Produce</a>'}
            <a href="auth.html?next=${encodeURIComponent(currentPage)}" class="btn-nav-outline">Sign In</a>
            ${renderThemeToggle()}
        `;
        attachThemeToggle();
    }

    const mobileAuth = document.getElementById('nav-menu-auth-item');
    if (mobileAuth) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        mobileAuth.innerHTML = `<a href="auth.html?next=${encodeURIComponent(currentPage)}" class="nav-link"><span>👤</span> Sign In / Account</a>`;
    }
}

window.fbAuth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const profileDoc = await window.fbDb.collection('users').doc(user.uid).get();
            if (profileDoc.exists) {
                window.currentUserProfile = profileDoc.data();
                renderSignedInNav(window.currentUserProfile);
            } else {
                // Authenticated but no profile yet — finish setup at auth page
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                if (currentPage !== 'auth.html') {
                    window.location.href = 'auth.html?next=' + encodeURIComponent(currentPage);
                    return;
                }
            }
        } catch (err) {
            console.error('Profile fetch error', err);
            renderSignedOutNav();
        }
    } else {
        window.currentUserProfile = null;
        renderSignedOutNav();
    }
    window.dispatchEvent(new CustomEvent('authready', {
        detail: { user, profile: window.currentUserProfile }
    }));
});

/* ===== Mobile Navigation Drawer Logic ===== */
function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu') || document.querySelector('.nav-menu');
    if (!hamburgerBtn || !navMenu) return;

    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navMenu.classList.toggle('open');
        hamburgerBtn.classList.toggle('active', isOpen);
        hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            navMenu.classList.remove('open');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('open')) {
            navMenu.classList.remove('open');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navMenu.classList.contains('open')) {
            navMenu.classList.remove('open');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}