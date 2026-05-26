const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Store ────────────────────────────────────────────────────────
let users = [
  { id: 'u001', name: 'Aarav Sharma', email: 'aarav@example.com', phone: '+91-9876543210', role: 'customer', createdAt: new Date('2024-01-10').toISOString() },
  { id: 'u002', name: 'Priya Patel',  email: 'priya@example.com', phone: '+91-9123456789', role: 'customer', createdAt: new Date('2024-02-15').toISOString() },
  { id: 'u003', name: 'Rohan Verma',  email: 'rohan@example.com', phone: '+91-9988776655', role: 'customer', createdAt: new Date('2024-03-20').toISOString() },
  { id: 'u004', name: 'Sneha Iyer',   email: 'sneha@example.com', phone: '+91-9001234567', role: 'admin',    createdAt: new Date('2024-01-01').toISOString() },
];

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'up', service: 'user-service', users: users.length }));

// ─── GET all users ─────────────────────────────────────────────────────────
app.get('/users', (req, res) => {
  const { search } = req.query;
  let result = [...users];
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }
  res.json(result);
});

// ─── GET single user ───────────────────────────────────────────────────────
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─── POST create user ──────────────────────────────────────────────────────
app.post('/users', (req, res) => {
  const { name, email, phone, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already exists' });

  const user = { id: uuidv4(), name, email, phone: phone || '', role: role || 'customer', createdAt: new Date().toISOString() };
  users.push(user);
  console.log(`[User Service] ✅ User created: ${user.name} (${user.id})`);
  res.status(201).json(user);
});

// ─── PUT update user ───────────────────────────────────────────────────────
app.put('/users/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  users[idx] = { ...users[idx], ...req.body, id: users[idx].id };
  res.json(users[idx]);
});

// ─── DELETE user ───────────────────────────────────────────────────────────
app.delete('/users/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const removed = users.splice(idx, 1)[0];
  res.json({ message: 'User deleted', user: removed });
});

// ─── GET stats ─────────────────────────────────────────────────────────────
app.get('/users/stats/summary', (req, res) => {
  res.json({
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    customers: users.filter(u => u.role === 'customer').length,
  });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`👤 User Service running on port ${PORT}`));
