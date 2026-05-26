const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Cart Store (keyed by userId) ──────────────────────────────
// carts = Map { userId → { items: [{ productId, name, price, image, quantity }] } }
const carts = new Map();

// Helper
const getCart = (userId) => {
  if (!carts.has(userId)) carts.set(userId, { userId, items: [], updatedAt: new Date().toISOString() });
  return carts.get(userId);
};

const cartSummary = (cart) => {
  const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  return { ...cart, total, itemCount: count };
};

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'up', service: 'cart-service', activeCarts: carts.size }));

// ─── GET cart for user ─────────────────────────────────────────────────────
app.get('/cart/:userId', (req, res) => {
  const cart = getCart(req.params.userId);
  res.json(cartSummary(cart));
});

// ─── POST add item to cart ────────────────────────────────────────────────
app.post('/cart/:userId/items', (req, res) => {
  const { productId, name, price, image, quantity = 1 } = req.body;
  if (!productId || !name || price === undefined) {
    return res.status(400).json({ error: 'productId, name, and price are required' });
  }

  const cart = getCart(req.params.userId);
  const existing = cart.items.find(i => i.productId === productId);

  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.items.push({ productId, name, price: Number(price), image: image || '📦', quantity: Number(quantity) });
  }
  cart.updatedAt = new Date().toISOString();
  console.log(`[Cart Service] ✅ Added ${name} × ${quantity} → User ${req.params.userId}`);
  res.status(200).json(cartSummary(cart));
});

// ─── PATCH update item quantity ────────────────────────────────────────────
app.patch('/cart/:userId/items/:productId', (req, res) => {
  const cart = getCart(req.params.userId);
  const item = cart.items.find(i => i.productId === req.params.productId);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });

  const { quantity } = req.body;
  if (Number(quantity) <= 0) {
    cart.items = cart.items.filter(i => i.productId !== req.params.productId);
  } else {
    item.quantity = Number(quantity);
  }
  cart.updatedAt = new Date().toISOString();
  res.json(cartSummary(cart));
});

// ─── DELETE remove item from cart ─────────────────────────────────────────
app.delete('/cart/:userId/items/:productId', (req, res) => {
  const cart = getCart(req.params.userId);
  const before = cart.items.length;
  cart.items = cart.items.filter(i => i.productId !== req.params.productId);
  if (cart.items.length === before) return res.status(404).json({ error: 'Item not found in cart' });
  cart.updatedAt = new Date().toISOString();
  res.json(cartSummary(cart));
});

// ─── DELETE clear cart ─────────────────────────────────────────────────────
app.delete('/cart/:userId', (req, res) => {
  const cart = getCart(req.params.userId);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  res.json({ message: 'Cart cleared', userId: req.params.userId });
});

// ─── GET all carts (admin) ─────────────────────────────────────────────────
app.get('/cart', (req, res) => {
  const all = Array.from(carts.values()).map(cartSummary);
  res.json(all);
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`🛒 Cart Service running on port ${PORT}`));
