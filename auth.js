const firebaseConfig = {
  apiKey: "AIzaSyDw84j4rQbBC2ycsyywtYykOXAVW6Ltg68",
  authDomain: "farmconnect-d91ed.firebaseapp.com",
  projectId: "farmconnect-d91ed",
  storageBucket: "farmconnect-d91ed.firebasestorage.app",
  messagingSenderId: "923903856948",
  appId: "1:923903856948:web:0cae9f751a9fc6ba001561"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const nextUrl = urlParams.get('next') || 'index.html';

let recaptchaVerifier;
let confirmationResult;
let isSignUpMode = false;
let handlingAuthChange = false;

function formatPhoneE164(raw) {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    return '+' + cleaned;
}

function showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

function showFlow(flowId) {
    document.querySelectorAll('.auth-flow').forEach(f => f.style.display = 'none');
    document.getElementById(flowId).style.display = 'block';
}

// Auth state — handle returning users and phone-verified users without profiles
auth.onAuthStateChanged(async (user) => {
    if (!user || handlingAuthChange) return;
    handlingAuthChange = true;
    try {
        const profile = await db.collection('users').doc(user.uid).get();
        if (profile.exists) {
            window.location.href = nextUrl;
        } else {
            // Phone signup — needs a name before continuing
            showFlow('name-flow');
        }
    } catch (err) {
        console.error(err);
    } finally {
        handlingAuthChange = false;
    }
});

// Method tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelector('.auth-tab.active').classList.remove('active');
        tab.classList.add('active');
        const method = tab.dataset.method;
        if (method === 'phone') {
            showFlow('phone-flow');
            document.getElementById('phone-step-1').style.display = 'block';
            document.getElementById('phone-step-2').style.display = 'none';
        } else {
            showFlow('email-flow');
        }
    });
});

// ===== Phone =====
document.getElementById('send-code-btn').addEventListener('click', async () => {
    const rawPhone = document.getElementById('phone-input').value.trim();
    if (!rawPhone) return showError('Please enter your phone number.');

    const phoneE164 = formatPhoneE164(rawPhone);
    if (phoneE164.length < 12) return showError('Phone number looks too short.');

    const btn = document.getElementById('send-code-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        if (!recaptchaVerifier) {
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { size: 'invisible' });
        }
        confirmationResult = await auth.signInWithPhoneNumber(phoneE164, recaptchaVerifier);
        document.getElementById('phone-display').textContent = phoneE164;
        document.getElementById('phone-step-1').style.display = 'none';
        document.getElementById('phone-step-2').style.display = 'block';
    } catch (err) {
        console.error(err);
        showError(err.message || 'Could not send code.');
        if (recaptchaVerifier) {
            try { recaptchaVerifier.clear(); } catch (_) {}
            recaptchaVerifier = null;
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Verification Code';
    }
});

document.getElementById('change-phone').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('phone-step-1').style.display = 'block';
    document.getElementById('phone-step-2').style.display = 'none';
});

document.getElementById('verify-code-btn').addEventListener('click', async () => {
    const code = document.getElementById('code-input').value.trim();
    if (!code) return showError('Please enter the code.');

    const btn = document.getElementById('verify-code-btn');
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        await confirmationResult.confirm(code);
        // onAuthStateChanged handles next step
    } catch (err) {
        showError('Invalid code. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Verify & Sign In';
    }
});

// ===== Email =====
document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    document.getElementById('email-name-group').style.display = isSignUpMode ? 'block' : 'none';
    document.getElementById('email-submit-btn').textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    document.getElementById('auth-toggle-text').textContent = isSignUpMode ? 'Already have an account?' : 'New here?';
    document.getElementById('auth-toggle-link').textContent = isSignUpMode ? 'Sign in instead' : 'Create an account';
});

document.getElementById('forgot-password-link').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-input').value.trim();
    if (!email) return showError('Enter your email above first, then click forgot password.');
    try {
        await auth.sendPasswordResetEmail(email);
        showError('Reset link sent — check your email.');
    } catch (err) {
        showError(err.message || 'Could not send reset email.');
    }
});

document.getElementById('email-submit-btn').addEventListener('click', async () => {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    const name = document.getElementById('email-name').value.trim();

    if (!email || !password) return showError('Email and password required.');
    if (isSignUpMode && !name) return showError('Please enter your name.');
    if (isSignUpMode && password.length < 6) return showError('Password must be at least 6 characters.');

    const btn = document.getElementById('email-submit-btn');
    btn.disabled = true;
    btn.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...';

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(cred.user.uid).set({
                name,
                email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            window.location.href = nextUrl;
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged handles redirect
        }
    } catch (err) {
        showError(err.message || 'Authentication failed.');
        btn.disabled = false;
        btn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    }
});

// ===== Name prompt (after phone signup) =====
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const name = document.getElementById('profile-name').value.trim();
    if (!name) return showError('Please enter a name.');

    const user = auth.currentUser;
    if (!user) return showError('Session expired. Please sign in again.');

    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        await db.collection('users').doc(user.uid).set({
            name,
            phone: user.phoneNumber || null,
            email: user.email || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window.location.href = nextUrl;
    } catch (err) {
        showError('Could not save profile. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Continue';
    }
});