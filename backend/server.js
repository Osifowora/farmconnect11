import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const orders = new Map();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

function sanitizeOrderPayload(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const total = Number(payload.total || 0);

  return {
    buyerName: String(payload.buyerName || '').trim(),
    buyerEmail: String(payload.buyerEmail || '').trim(),
    deliveryLocation: String(payload.deliveryLocation || '').trim(),
    items,
    total,
    currency: String(payload.currency || 'NGN').toUpperCase(),
    status: String(payload.status || 'pending_payment'),
  };
}

function validateOrderPayload(payload) {
  if (!payload.buyerName || !payload.buyerEmail || !payload.deliveryLocation) {
    return 'Buyer name, email, and delivery location are required.';
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return 'At least one order item is required.';
  }

  const total = Number(payload.total || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return 'Order total must be greater than zero.';
  }

  const invalidItem = payload.items.some((item) => {
    const unitPrice = Number(item.unitPrice || 0);
    const quantity = Number(item.quantity || 0);
    return !item.title || !item.farmer || !item.location || unitPrice <= 0 || quantity <= 0;
  });

  if (invalidItem) {
    return 'Each order item must include a valid title, seller, location, unit price, and quantity.';
  }

  return null;
}

function buildOrderRecord(payload) {
  const orderId = `fc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const order = {
    id: orderId,
    buyerName: payload.buyerName,
    buyerEmail: payload.buyerEmail,
    deliveryLocation: payload.deliveryLocation,
    items: payload.items,
    total: Number(payload.total),
    currency: payload.currency,
    status: payload.status,
    paymentStatus: 'not_started',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.set(orderId, order);
  return order;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'farmconnect-backend', status: 'running' });
});

app.post('/api/create-order', (req, res) => {
  const payload = sanitizeOrderPayload(req.body);
  const validationError = validateOrderPayload(payload);

  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  const order = buildOrderRecord(payload);
  return res.status(201).json({ ok: true, order });
});

app.post('/api/create-payment-session', async (req, res) => {
  const { orderId } = req.body || {};
  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({ ok: false, error: 'Order not found. Create an order before requesting a payment session.' });
  }

  if (!stripe) {
    const demoSessionId = `demo_${order.id}`;
    order.paymentStatus = 'demo_mode';
    order.status = 'awaiting_backend_payment';
    order.updatedAt = new Date().toISOString();

    return res.json({
      ok: true,
      mode: 'demo',
      message: 'Stripe is not configured yet. Backend session creation is ready and protected behind the API layer.',
      orderId: order.id,
      sessionId: demoSessionId,
      checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:8000'}/checkout.html?orderId=${order.id}`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:8000'}/checkout.html?status=success&orderId=${order.id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:8000'}/checkout.html?status=cancelled&orderId=${order.id}`,
      line_items: order.items.map((item) => ({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: item.title,
            description: `${item.farmer} • ${item.location}`,
          },
          unit_amount: Math.round(Number(item.unitPrice || 0) * 100),
        },
        quantity: Number(item.quantity || 1),
      })),
      metadata: {
        orderId: order.id,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
      },
      customer_email: order.buyerEmail,
      payment_method_types: ['card'],
    });

    order.paymentSessionId = session.id;
    order.paymentStatus = 'session_created';
    order.status = 'paid_pending_confirmation';
    order.updatedAt = new Date().toISOString();

    return res.json({
      ok: true,
      mode: 'live',
      orderId: order.id,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Unable to create checkout session.',
      details: error.message,
    });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  const { orderId, sessionId } = req.body || {};
  const order = orders.get(orderId);

  if (!order) {
    return res.status(404).json({ ok: false, error: 'Order not found.' });
  }

  if (!stripe) {
    order.paymentStatus = 'demo_verified';
    order.status = 'payment_verified_demo';
    order.updatedAt = new Date().toISOString();
    return res.json({ ok: true, order, message: 'Demo verification complete; connect Stripe for real payment verification.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    order.paymentStatus = session.payment_status === 'paid' ? 'paid' : 'pending';
    order.status = session.payment_status === 'paid' ? 'payment_verified' : 'pending_payment';
    order.updatedAt = new Date().toISOString();

    return res.json({ ok: true, order, paymentStatus: session.payment_status || 'unknown' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Unable to verify payment session.', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`FarmConnect backend running on http://localhost:${port}`);
});
