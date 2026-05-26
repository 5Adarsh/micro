const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Notification Store ────────────────────────────────────────
let notifications = [
  { id: 'n001', userId: 'u001', type: 'order',   title: 'Order Delivered! 🎉',       message: 'Your order ORD001 has been delivered successfully.',  read: true,  createdAt: new Date('2024-05-03').toISOString() },
  { id: 'n002', userId: 'u002', type: 'order',   title: 'Order Shipped 🚚',           message: 'Your order ORD002 is on its way! Track your package.', read: false, createdAt: new Date('2024-05-11').toISOString() },
  { id: 'n003', userId: 'u001', type: 'promo',   title: 'Flash Sale! ⚡ 30% off',     message: 'Electronics sale is LIVE for next 24 hours only.',     read: false, createdAt: new Date('2024-05-20').toISOString() },
  { id: 'n004', userId: 'u003', type: 'order',   title: 'Order Confirmed ✅',         message: 'Your order ORD003 has been confirmed and is processing.', read: false, createdAt: new Date('2024-05-18').toISOString() },
  { id: 'n005', userId: 'u002', type: 'review',  title: 'Review Appreciated 👍',     message: '12 people found your review of Yoga Mat helpful!',     read: false, createdAt: new Date('2024-05-13').toISOString() },
  { id: 'n006', userId: null,   type: 'system',  title: 'System Maintenance 🔧',     message: 'Scheduled maintenance on May 25 from 2-4 AM IST.',      read: false, createdAt: new Date('2024-05-22').toISOString() },
];

const TYPES = ['order', 'promo', 'review', 'system', 'cart', 'general'];

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'up', service: 'notification-service', notifications: notifications.length }));

// ─── GET notifications ─────────────────────────────────────────────────────
app.get('/notifications', (req, res) => {
  const { userId, type, unread } = req.query;
  let result = [...notifications];
  // Global (system) + user-specific
  if (userId) result = result.filter(n => n.userId === userId || n.userId === null);
  if (type)   result = result.filter(n => n.type === type);
  if (unread === 'true') result = result.filter(n => !n.read);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// ─── GET unread count ──────────────────────────────────────────────────────
app.get('/notifications/unread-count', (req, res) => {
  const { userId } = req.query;
  let result = notifications;
  if (userId) result = result.filter(n => n.userId === userId || n.userId === null);
  res.json({ count: result.filter(n => !n.read).length });
});

// ─── POST create notification ──────────────────────────────────────────────
app.post('/notifications', (req, res) => {
  const { userId, type, title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title and message are required' });

  const notification = {
    id: uuidv4(), userId: userId || null,
    type: TYPES.includes(type) ? type : 'general',
    title, message, read: false,
    createdAt: new Date().toISOString()
  };
  notifications.push(notification);
  console.log(`[Notification Service] 🔔 Created: [${notification.type}] ${title}`);
  res.status(201).json(notification);
});

// ─── PATCH mark as read ────────────────────────────────────────────────────
app.patch('/notifications/:id/read', (req, res) => {
  const n = notifications.find(n => n.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  n.read = true;
  res.json(n);
});

// ─── PATCH mark all as read for user ──────────────────────────────────────
app.patch('/notifications/read-all', (req, res) => {
  const { userId } = req.body;
  let updated = 0;
  notifications.forEach(n => {
    if (!n.read && (n.userId === userId || n.userId === null)) {
      n.read = true;
      updated++;
    }
  });
  res.json({ message: `Marked ${updated} notifications as read` });
});

// ─── DELETE notification ───────────────────────────────────────────────────
app.delete('/notifications/:id', (req, res) => {
  const idx = notifications.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
  notifications.splice(idx, 1);
  res.json({ message: 'Notification deleted' });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`🔔 Notification Service running on port ${PORT}`));
