const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Order Store ───────────────────────────────────────────────
let orders = [
  {
    id: 'ord001', userId: 'u001', userName: 'Aarav Sharma',
    items: [{ productId: 'p001', name: 'Wireless Noise-Cancelling Headphones', price: 4999, quantity: 1, image: '🎧' }],
    total: 4999, status: 'delivered',
    address: '12 MG Road, Bengaluru, Karnataka', createdAt: new Date('2024-05-01').toISOString()
  },
  {
    id: 'ord002', userId: 'u002', userName: 'Priya Patel',
    items: [
      { productId: 'p003', name: 'Yoga Mat — Anti-Slip Premium', price: 899, quantity: 2, image: '🧘' },
      { productId: 'p004', name: 'Stainless Steel Water Bottle',  price: 599, quantity: 1, image: '💧' },
    ],
    total: 2397, status: 'shipped',
    address: '45 Linking Road, Mumbai, Maharashtra', createdAt: new Date('2024-05-10').toISOString()
  },
  {
    id: 'ord003', userId: 'u003', userName: 'Rohan Verma',
    items: [{ productId: 'p007', name: 'Organic Green Tea (100g)', price: 349, quantity: 3, image: '🍵' }],
    total: 1047, status: 'processing',
    address: '8 Connaught Place, New Delhi', createdAt: new Date('2024-05-18').toISOString()
  },
];

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'up', service: 'order-service', orders: orders.length }));

// ─── GET all orders ────────────────────────────────────────────────────────
app.get('/orders', (req, res) => {
  const { userId, status } = req.query;
  let result = [...orders];
  if (userId) result = result.filter(o => o.userId === userId);
  if (status) result = result.filter(o => o.status === status);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// ─── GET stats ─────────────────────────────────────────────────────────────
app.get('/orders/stats/summary', (req, res) => {
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  res.json({
    total: orders.length,
    revenue,
    byStatus: STATUS_FLOW.reduce((acc, s) => {
      acc[s] = orders.filter(o => o.status === s).length;
      return acc;
    }, {}),
  });
});

// ─── GET single order ──────────────────────────────────────────────────────
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ─── POST create order ─────────────────────────────────────────────────────
app.post('/orders', (req, res) => {
  const { userId, userName, items, address } = req.body;
  if (!userId || !items || !items.length) return res.status(400).json({ error: 'userId and items are required' });

  const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
  const order = {
    id: uuidv4(), userId, userName: userName || 'Guest',
    items, total, status: 'confirmed',
    address: address || 'Not provided',
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  console.log(`[Order Service] ✅ Order created: ${order.id} | Total: ₹${total} | User: ${userId}`);
  res.status(201).json(order);
});

// ─── PATCH update order status ─────────────────────────────────────────────
app.patch('/orders/:id/status', (req, res) => {
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  const { status } = req.body;
  if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: 'Invalid status', valid: STATUS_FLOW });
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  res.json(orders[idx]);
});

// ─── DELETE cancel order ───────────────────────────────────────────────────
app.delete('/orders/:id', (req, res) => {
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  orders[idx].status = 'cancelled';
  res.json({ message: 'Order cancelled', order: orders[idx] });
});

const PORT = 3003;
app.listen(PORT, () => console.log(`📦 Order Service running on port ${PORT}`));
