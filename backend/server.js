const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const Stripe = require('stripe');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
if (!stripeSecretKey) {
  console.error('Error: STRIPE_SECRET_KEY is not set in backend/.env.');
  console.error('Copy backend/.env.example to backend/.env and add your Stripe test secret key.');
  process.exit(1);
}

const isStripeConfigured = !stripeSecretKey.includes('your_secret_key');
const mockCheckoutMode = !isStripeConfigured;
if (mockCheckoutMode) {
  console.warn('WARNING: Stripe secret key appears to be a placeholder. Using mock checkout mode instead.');
}

const app = express();
const PORT = process.env.BACKEND_PORT || 4242;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me-with-a-secret';
const stripe = new Stripe(stripeSecretKey);

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.replace('Bearer ', '');
  jwt.verify(token, JWT_SECRET, (error, payload) => {
    if (error) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const user = db.getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    next();
  });
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (db.getUserByEmail(email)) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = db.createUser({ name, email, password: hashedPassword, role: 'user' });
  const token = createToken(user);

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const token = createToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

app.get('/api/products', (req, res) => {
  res.json(db.getAllProducts());
});

app.get('/api/admin/products', authMiddleware, adminMiddleware, (req, res) => {
  res.json(db.getAllProducts());
});

app.get('/api/products/:id', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json(product);
});

app.post('/api/admin/products', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, price, currency, image } = req.body;
  if (!name || !price || !image) {
    return res.status(400).json({ error: 'Name, price, and image are required.' });
  }

  const product = db.createProduct({ name, description, price, currency: currency || 'usd', image });
  res.status(201).json(product);
});

app.put('/api/admin/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  const updates = req.body;
  const product = db.updateProduct(req.params.id, updates);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json(product);
});

app.delete('/api/admin/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  const deleted = db.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ success: true });
});

app.get('/api/orders/my', authMiddleware, (req, res) => {
  const orders = db.getOrdersByUser(req.user.id);
  res.json(orders);
});

app.get('/api/admin/orders', authMiddleware, adminMiddleware, (req, res) => {
  const orders = db.getAllOrders();
  res.json(orders);
});

async function createStripeSession({ line_items, customer_email }) {
  if (mockCheckoutMode) {
    const sessionId = `mock_${Date.now()}`;
    return {
      id: sessionId,
      url: `${FRONTEND_URL}/?success=true&session_id=${sessionId}`
    };
  }

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    customer_email,
    success_url: `${FRONTEND_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/?canceled=true`
  });
}

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const items = req.body.items || [];
    const email = req.body.email || req.user?.email;
    if (!items.length) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required to create a checkout session.' });
    }

    const sanitizedItems = items
      .map((item) => {
        const product = db.getProductById(item.id);
        if (!product) return null;
        return {
          productId: product.id,
          quantity: Math.max(1, item.quantity),
          price: product.price,
          product
        };
      })
      .filter(Boolean);

    if (!sanitizedItems.length) {
      return res.status(400).json({ error: 'No valid items in cart.' });
    }

    const line_items = sanitizedItems.map(({ product, quantity }) => ({
      price_data: {
        currency: product.currency,
        product_data: {
          name: product.name,
          description: product.description,
          images: [product.image]
        },
        unit_amount: product.price
      },
      quantity
    }));

    const session = await createStripeSession({
      line_items,
      customer_email: email
    });

    db.createOrder({
      userId: req.user?.id || null,
      email,
      sessionId: session.id,
      amountTotal: sanitizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      items: sanitizedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      status: mockCheckoutMode ? 'pending' : 'pending'
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: mockCheckoutMode ? 'Mock checkout failed' : 'Unable to create checkout session.' });
  }
});

app.get('/api/checkout-session', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session_id query parameter.' });
    }

    let session;
    if (sessionId.startsWith('mock_')) {
      session = { id: sessionId, payment_status: 'unpaid', mode: 'payment' };
    } else {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    }
    const order = db.getOrderBySessionId(sessionId);
    res.json({ session, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve checkout session.' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
