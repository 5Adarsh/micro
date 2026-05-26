const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Review Store ───────────────────────────────────────────────
let reviews = [
  { id: 'r001', productId: 'p001', userId: 'u001', userName: 'Aarav Sharma',  rating: 5, title: 'Absolutely Amazing!',      body: 'Best headphones I\'ve ever used. Noise cancellation is incredible, perfect for travel.',  helpful: 12, createdAt: new Date('2024-05-05').toISOString() },
  { id: 'r002', productId: 'p001', userId: 'u002', userName: 'Priya Patel',   rating: 4, title: 'Great sound quality',       body: 'Really good audio, though the ear cups could be softer. Highly recommended!',            helpful: 8,  createdAt: new Date('2024-05-08').toISOString() },
  { id: 'r003', productId: 'p003', userId: 'u002', userName: 'Priya Patel',   rating: 5, title: 'Perfect yoga mat!',         body: 'Grippy, thick, and durable. The carry strap is a great addition.',                      helpful: 15, createdAt: new Date('2024-05-12').toISOString() },
  { id: 'r004', productId: 'p007', userId: 'u003', userName: 'Rohan Verma',   rating: 5, title: 'Best green tea ever',       body: 'Smooth, earthy flavor. You can really taste the quality. Will reorder.',                helpful: 20, createdAt: new Date('2024-05-20').toISOString() },
  { id: 'r005', productId: 'p002', userId: 'u001', userName: 'Aarav Sharma',  rating: 4, title: 'Solid gaming keyboard',     body: 'Tactile feedback is great. RGB looks stunning. A bit loud for office use though.',        helpful: 6,  createdAt: new Date('2024-05-15').toISOString() },
  { id: 'r006', productId: 'p009', userId: 'u003', userName: 'Rohan Verma',   rating: 4, title: 'Great portable speaker',   body: 'Sound is punchy and clear. Waterproofing works great at the beach.',                    helpful: 9,  createdAt: new Date('2024-05-17').toISOString() },
];

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'up', service: 'review-service', reviews: reviews.length }));

// ─── GET reviews (by product or all) ──────────────────────────────────────
app.get('/reviews', (req, res) => {
  const { productId, userId, minRating } = req.query;
  let result = [...reviews];
  if (productId)  result = result.filter(r => r.productId === productId);
  if (userId)     result = result.filter(r => r.userId === userId);
  if (minRating)  result = result.filter(r => r.rating >= Number(minRating));
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// ─── GET product rating summary ────────────────────────────────────────────
app.get('/reviews/product/:productId/summary', (req, res) => {
  const productReviews = reviews.filter(r => r.productId === req.params.productId);
  if (!productReviews.length) return res.json({ productId: req.params.productId, avg: 0, count: 0, distribution: {} });
  const avg = productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  productReviews.forEach(r => distribution[r.rating]++);
  res.json({ productId: req.params.productId, avg: Math.round(avg * 10) / 10, count: productReviews.length, distribution });
});

// ─── POST create review ────────────────────────────────────────────────────
app.post('/reviews', (req, res) => {
  const { productId, userId, userName, rating, title, body } = req.body;
  if (!productId || !userId || !rating) return res.status(400).json({ error: 'productId, userId, and rating are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  // Prevent duplicate reviews from same user for same product
  if (reviews.find(r => r.productId === productId && r.userId === userId)) {
    return res.status(409).json({ error: 'You have already reviewed this product' });
  }

  const review = {
    id: uuidv4(), productId, userId,
    userName: userName || 'Anonymous',
    rating: Number(rating), title: title || '',
    body: body || '', helpful: 0,
    createdAt: new Date().toISOString()
  };
  reviews.push(review);
  console.log(`[Review Service] ✅ Review added: ${rating}⭐ for product ${productId} by ${userId}`);
  res.status(201).json(review);
});

// ─── PATCH mark review as helpful ─────────────────────────────────────────
app.patch('/reviews/:id/helpful', (req, res) => {
  const review = reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.helpful += 1;
  res.json(review);
});

// ─── DELETE review ─────────────────────────────────────────────────────────
app.delete('/reviews/:id', (req, res) => {
  const idx = reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Review not found' });
  const removed = reviews.splice(idx, 1)[0];
  res.json({ message: 'Review deleted', review: removed });
});

// ─── GET overall stats ─────────────────────────────────────────────────────
app.get('/reviews/stats/summary', (req, res) => {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  res.json({ total: reviews.length, avgRating: Math.round(avg * 10) / 10 });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`⭐ Review Service running on port ${PORT}`));
