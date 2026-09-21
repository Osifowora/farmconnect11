const urlParams = new URLSearchParams(window.location.search);
const productKey = urlParams.get('product');
const cart = JSON.parse(localStorage.getItem('farmconnect-cart') || '[]');
const selectedProducts = productKey ? cart.filter(item => item.productKey === productKey) : cart;

const checkoutItems = document.getElementById('checkout-items');
const checkoutTotal = document.getElementById('checkout-total');
const statusBox = document.getElementById('checkout-status');

function showStatus(message, isError = false) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.style.display = 'block';
    statusBox.style.background = isError ? 'rgba(239,68,68,0.08)' : '#ecfdf5';
    statusBox.style.color = isError ? '#991b1b' : '#065f46';
}

function formatMoney(value) {
    return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function renderOrderSummary() {
    if (!checkoutItems) return;

    if (!selectedProducts.length) {
        checkoutItems.innerHTML = '<p style="padding: 24px 0; color: #6b7280;">No items in your order yet.</p>';
        checkoutTotal.textContent = '₦0';
        return;
    }

    let total = 0;

    checkoutItems.innerHTML = selectedProducts.map(item => {
        const itemTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
        total += itemTotal;
        return `
            <div class="checkout-item">
                <img class="checkout-thumb" src="${item.image || 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500'}" alt="${item.title}">
                <div class="checkout-meta">
                    <h4>${item.title}</h4>
                    <p>${item.farmer} • ${item.location}</p>
                    <p>Qty: ${item.quantity}</p>
                </div>
                <div class="checkout-price">${formatMoney(itemTotal)}</div>
            </div>
        `;
    }).join('');

    checkoutTotal.textContent = formatMoney(total);
}

async function redirectToSecurePayment() {
    const buyerName = document.getElementById('buyer-name')?.value?.trim();
    const buyerEmail = document.getElementById('buyer-email')?.value?.trim();
    const deliveryLocation = document.getElementById('delivery-location')?.value?.trim();

    if (!buyerName || !buyerEmail || !deliveryLocation) {
        showStatus('Please complete your buyer details before creating a payment session.', true);
        return;
    }

    if (!selectedProducts.length) {
        showStatus('Your cart is empty. Add a product before checkout.', true);
        return;
    }

    const total = selectedProducts.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0);
    const apiBaseUrl = window.FARMCONNECT_API_URL || '';

    try {
        showStatus('Creating secure order and payment session...');

        const orderPayload = {
            buyerName,
            buyerEmail,
            deliveryLocation,
            items: selectedProducts,
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

document.getElementById('create-checkout-session')?.addEventListener('click', redirectToSecurePayment);
renderOrderSummary();
