function formatPhoneForWhatsApp(rawPhone) {
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '234' + cleaned.substring(1);
    }
    return cleaned;
}

// Auth gate + prefill
window.addEventListener('authready', (e) => {
    const user = e.detail.user;
    const profile = e.detail.profile;

    if (!user) {
        window.location.href = 'auth.html?next=farmer.html';
        return;
    }

    // Prefill from profile
    if (profile?.name) document.getElementById('farmer').value = profile.name;
    const profilePhone = profile?.phone || user.phoneNumber;
    if (profilePhone) {
        document.getElementById('phone').value = profilePhone.replace(/^\+/, '');
    }
});

document.getElementById('upload-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const user = window.fbAuth.currentUser;
    if (!user) {
        if (typeof window.showAlertModal === 'function') {
            window.showAlertModal({
                icon: '🔒',
                title: 'Sign In Required',
                message: 'Please sign in or register to list your produce harvests.',
                buttonText: 'Sign In',
                onConfirm: () => { window.location.href = 'auth.html?next=farmer.html'; }
            });
        } else {
            window.location.href = 'auth.html?next=farmer.html';
        }
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "Connecting... ⏳";
    submitBtn.disabled = true;

    const rawPhone = document.getElementById('phone').value;
    const formattedPhone = formatPhoneForWhatsApp(rawPhone);

    if (formattedPhone.length < 11) {
        if (typeof window.showAlertModal === 'function') {
            window.showAlertModal({
                icon: '📱',
                title: 'Invalid Phone Number',
                message: 'Please enter a valid Nigerian WhatsApp phone number (e.g. 08012345678) so buyers can reach you directly.',
                buttonText: 'Check Number'
            });
        }
        submitBtn.disabled = false;
        submitBtn.innerText = "🌱 Publish Harvest Listing";
        return;
    }

    const newItem = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        price: document.getElementById('price').value,
        quantity: document.getElementById('quantity').value,
        farmer: document.getElementById('farmer').value,
        location: document.getElementById('location').value,
        phone: formattedPhone,
        image: document.getElementById('image').value || "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800",
        farmerUid: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    window.fbDb.collection("produce").add(newItem)
        .then(() => {
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("Error: ", error);
            submitBtn.disabled = false;
            submitBtn.innerText = "List Produce";
        });
});