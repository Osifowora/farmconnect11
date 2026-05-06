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

function renderThemeToggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return `<button class="btn-text theme-toggle" id="theme-toggle" title="Toggle dark mode">${isDark ? '☀️' : '🌙'}</button>`;
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
    if (!navArea) return;
    const isOnFarmerPage = window.location.pathname.includes('farmer.html');
    navArea.innerHTML = `
        ${isOnFarmerPage ? '' : '<a href="farmer.html" class="btn-text" style="text-decoration:none;">List Produce</a>'}
        <span class="nav-user">👋 ${escapeNavHtml(profile.name)}</span>
        <button class="btn-text nav-signout" id="nav-signout">Sign Out</button>
        ${renderThemeToggle()}
    `;
    document.getElementById('nav-signout').addEventListener('click', () => {
        window.fbAuth.signOut().then(() => window.location.href = 'index.html');
    });
    attachThemeToggle();
}

function renderSignedOutNav() {
    const navArea = document.getElementById('nav-auth-area');
    if (!navArea) return;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navArea.innerHTML = `
        <a href="auth.html?next=${encodeURIComponent(currentPage)}" class="btn-text" style="text-decoration:none;">Sign In</a>
        ${renderThemeToggle()}
    `;
    attachThemeToggle();
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
                const next = window.location.pathname.split('/').pop() || 'index.html';
                window.location.href = 'auth.html?next=' + encodeURIComponent(next);
                return;
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