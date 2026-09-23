function getCart() {
    try {
        return JSON.parse(localStorage.getItem('farmconnect-cart') || '[]');
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('farmconnect-cart', JSON.stringify(cart));
    if (typeof window.updateCartBadge === 'function') {
        window.updateCartBadge();
    }
}

const checkoutItems = document.getElementById('checkout-items');
const checkoutTotal = document.getElementById('checkout-total');
const statusBox = document.getElementById('checkout-status');
const createCheckoutBtn = document.getElementById('create-checkout-session');

function showStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.style.display = 'block';
    statusBox.style.background = isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-sage-soft)';
    statusBox.style.color = isError ? '#991b1b' : 'var(--primary-forest)';
    statusBox.style.border = isError ? '1px solid #fecaca' : '1px solid var(--border-sage)';
}

function formatMoney(value) {
    return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function updateQuantity(productKey, delta) {
    const cart = getCart();
    const item = cart.find(i => i.productKey === productKey);
    if (!item) return;

    item.quantity = (Number(item.quantity) || 1) + delta;
    if (item.quantity <= 0) {
        const index = cart.indexOf(item);
        if (index > -1) cart.splice(index, 1);
    }

    saveCart(cart);
    renderOrderSummary();
}

function removeItem(productKey) {
    let cart = getCart();
    cart = cart.filter(i => i.productKey !== productKey);
    saveCart(cart);
    renderOrderSummary();
}

function clearEntireCart() {
    if (typeof window.showConfirmModal === 'function') {
        window.showConfirmModal({
            icon: '🗑️',
            title: 'Clear Entire Order?',
            message: 'Are you sure you want to remove all items from your order? This will reset your cart.',
            confirmText: 'Yes, Clear Cart',
            cancelText: 'Keep Items',
            isDestructive: true,
            onConfirm: () => {
                localStorage.removeItem('farmconnect-cart');
                if (typeof window.updateCartBadge === 'function') {
                    window.updateCartBadge();
                }
                renderOrderSummary();
            }
        });
    } else {
        localStorage.removeItem('farmconnect-cart');
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge();
        }
        renderOrderSummary();
    }
}

function renderOrderSummary() {
    if (!checkoutItems) return;

    const cart = getCart();

    if (!cart.length) {
        checkoutItems.innerHTML = `
            <div class="cart-empty-state">
                <span class="cart-empty-icon">🛒</span>
                <p class="cart-empty-title">Your order is empty</p>
                <p class="cart-empty-desc">You haven't added any fresh produce to your cart yet.</p>
                <a href="index.html#marketplace" class="btn-nav-primary" style="display:inline-flex; font-size:14px; padding:10px 20px;">
                    🌱 Browse Fresh Harvests
                </a>
            </div>
        `;
        if (checkoutTotal) checkoutTotal.textContent = '₦0';
        if (createCheckoutBtn) {
            createCheckoutBtn.disabled = true;
            createCheckoutBtn.style.opacity = '0.5';
            createCheckoutBtn.style.cursor = 'not-allowed';
        }
        const clearBtn = document.getElementById('btn-clear-cart');
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (createCheckoutBtn) {
        createCheckoutBtn.disabled = false;
        createCheckoutBtn.style.opacity = '1';
        createCheckoutBtn.style.cursor = 'pointer';
    }

    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    let total = 0;

    checkoutItems.innerHTML = cart.map(item => {
        const itemQty = Number(item.quantity) || 1;
        const itemUnitPrice = Number(item.unitPrice) || 0;
        const itemTotal = itemUnitPrice * itemQty;
        total += itemTotal;

        return `
            <div class="checkout-item" data-key="${item.productKey}">
                <img class="checkout-thumb" src="${item.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500'}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500'">
                <div class="checkout-meta">
                    <h4>${item.title}</h4>
                    <p>🧑🏾‍🌾 ${item.farmer} • 📍 ${item.location}</p>
                    <div class="cart-qty-controls">
                        <button type="button" class="btn-qty btn-qty-minus" data-key="${item.productKey}" aria-label="Decrease quantity">−</button>
                        <span class="cart-qty-num">${itemQty}</span>
                        <button type="button" class="btn-qty btn-qty-plus" data-key="${item.productKey}" aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <div class="checkout-item-right">
                    <div class="checkout-price">${formatMoney(itemTotal)}</div>
                    <button type="button" class="btn-remove-item" data-key="${item.productKey}" title="Remove item from order" aria-label="Remove item">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    if (checkoutTotal) checkoutTotal.textContent = formatMoney(total);

    // Attach item listeners
    checkoutItems.querySelectorAll('.btn-qty-plus').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(btn.dataset.key, 1));
    });

    checkoutItems.querySelectorAll('.btn-qty-minus').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(btn.dataset.key, -1));
    });

    checkoutItems.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', () => removeItem(btn.dataset.key));
    });
}

async function redirectToSecurePayment() {
    const cart = getCart();
    if (!cart.length) {
        showStatus('Your cart is empty. Add a product from the marketplace before checking out.', true);
        return;
    }

    const buyerName = document.getElementById('buyer-name')?.value?.trim();
    const buyerEmail = document.getElementById('buyer-email')?.value?.trim();
    const deliveryLocation = document.getElementById('delivery-location')?.value?.trim();

    if (!buyerName || !buyerEmail || !deliveryLocation) {
        showStatus('Please complete your buyer name, email, and delivery destination.', true);
        if (typeof window.showAlertModal === 'function') {
            window.showAlertModal({
                icon: '📋',
                title: 'Order Details Required',
                message: 'Please provide your Full Name, Email Address, and Delivery Destination before proceeding to payment.',
                buttonText: 'Complete Details'
            });
        }
        return;
    }

    const total = cart.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0);
    const apiBaseUrl = window.FARMCONNECT_API_URL || '';

    try {
        showStatus('Creating secure order and payment session...');

        const orderPayload = {
            buyerName,
            buyerEmail,
            deliveryLocation,
            items: cart,
            total,
            currency: 'NGN',
            status: 'pending_payment'
        };

        const orderResponse = await fetch(`${apiBaseUrl}/api/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        const orderData = await orderResponse.json();
        if (!orderResponse.ok || !orderData.ok) {
            throw new Error(orderData.error || 'Unable to create order');
        }

        const sessionResponse = await fetch(`${apiBaseUrl}/api/create-payment-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderData.order.id })
        });

        const sessionData = await sessionResponse.json();
        if (!sessionResponse.ok || !sessionData.ok) {
            throw new Error(sessionData.error || 'Unable to create payment session');
        }

        if (sessionData.checkoutUrl) {
            showStatus(`Payment session created successfully. Redirecting to checkout...`);
            setTimeout(() => {
                window.location.href = sessionData.checkoutUrl;
            }, 800);
            return;
        }

        showStatus(sessionData.message || 'Order created. Payment session is ready for backend integration.');
    } catch (error) {
        console.error('Payment flow error:', error);
        showStatus(`Checkout failed: ${error.message}`, true);
    }
}

window.addEventListener('authready', () => {
    const user = window.fbAuth?.currentUser;
    const profile = window.currentUserProfile;

    if (user && profile?.name) {
        const buyerNameInput = document.getElementById('buyer-name');
        if (buyerNameInput && !buyerNameInput.value) buyerNameInput.value = profile.name;
    }

    renderOrderSummary();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-checkout-session')?.addEventListener('click', redirectToSecurePayment);
    document.getElementById('btn-clear-cart')?.addEventListener('click', clearEntireCart);
    renderOrderSummary();
});

// Initial render
renderOrderSummary();
