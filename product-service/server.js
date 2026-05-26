const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-Memory Product Store ─────────────────────────────────────────────
let products = [
  { id: 'p001', name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', price: 4999, stock: 25, brand: 'SoundWave', rating: 4.5, image: '🎧', description: 'Premium audio experience with 30hr battery life and active noise cancellation.' },
  { id: 'p002', name: 'Mechanical Gaming Keyboard',           category: 'Electronics', price: 3499, stock: 15, brand: 'TechGear',  rating: 4.3, image: '⌨️', description: 'RGB backlit mechanical keyboard with Cherry MX switches.' },
  { id: 'p003', name: 'Yoga Mat — Anti-Slip Premium',         category: 'Sports',      price: 899,  stock: 50, brand: 'FitLife',   rating: 4.7, image: '🧘', description: '6mm thick eco-friendly yoga mat with carry strap.' },
  { id: 'p004', name: 'Stainless Steel Water Bottle',         category: 'Sports',      price: 599,  stock: 100,brand: 'HydroMax',  rating: 4.6, image: '💧', description: '1L double-walled insulated bottle, keeps cold 24h / hot 12h.' },
  { id: 'p005', name: 'Backpack — 40L Travel',                category: 'Travel',      price: 2199, stock: 30, brand: 'WanderPro', rating: 4.4, image: '🎒', description: 'Waterproof 40L backpack with USB charging port and laptop compartment.' },
  { id: 'p006', name: 'Smart LED Desk Lamp',                  category: 'Home',        price: 1299, stock: 40, brand: 'LumiHome',  rating: 4.2, image: '💡', description: 'Touch-sensitive lamp with 5 brightness levels and USB charging port.' },
  { id: 'p007', name: 'Organic Green Tea (100g)',             category: 'Food',        price: 349,  stock: 200,brand: 'TeaLeaf',   rating: 4.8, image: '🍵', description: 'Hand-picked Darjeeling green tea. Rich antioxidants, earthy flavor.' },
  { id: 'p008', name: 'Running Shoes — Lightweight',          category: 'Sports',      price: 3999, stock: 20, brand: 'StridePro', rating: 4.5, image: '👟', description: 'Ultra-light breathable running shoes with gel cushioning.' },
  { id: 'p009', name: 'Bluetooth Speaker — Waterproof',       category: 'Electronics', price: 1899, stock: 35, brand: 'BoomBox',   rating: 4.4, image: '🔊', description: 'IPX7 waterproof portable speaker, 12h playtime, 360° sound.' },
  { id: 'p010', name: 'Scented Soy Candle Set',               category: 'Home',        price: 799,  stock: 60, brand: 'CozyHome',  rating: 4.6, image: '🕯️', description: 'Set of 3 hand-poured soy wax candles: Lavender, Vanilla, Sandalwood.' },
];

const CATEGORIES = ['Electronics', 'Sports', 'Travel', 'Home', 'Food', 'Fashion', 'Books'];

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'up', service: 'product-service', products: products.length }));

// ─── GET all products ─────────────────────────────────────────────────────
app.get('/products', (req, res) => {
  const { search, category, minPrice, maxPrice, inStock, sortBy } = req.query;
  let result = [...products];

  if (search) {
    const s = search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
  }
  if (category)  result = result.filter(p => p.category === category);
  if (minPrice)  result = result.filter(p => p.price >= Number(minPrice));
  if (maxPrice)  result = result.filter(p => p.price <= Number(maxPrice));
  if (inStock === 'true') result = result.filter(p => p.stock > 0);

  if (sortBy === 'price_asc')   result.sort((a, b) => a.price - b.price);
  if (sortBy === 'price_desc')  result.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating')      result.sort((a, b) => b.rating - a.rating);
  if (sortBy === 'name')        result.sort((a, b) => a.name.localeCompare(b.name));

  res.json(result);
});

// ─── GET categories ────────────────────────────────────────────────────────
app.get('/products/categories', (req, res) => {
  const cats = [...new Set(products.map(p => p.category))];
  res.json(cats);
});

// ─── GET stats ─────────────────────────────────────────────────────────────
app.get('/products/stats/summary', (req, res) => {
  res.json({
    total: products.length,
    totalStock: products.reduce((s, p) => s + p.stock, 0),
    avgPrice: Math.round(products.reduce((s, p) => s + p.price, 0) / products.length),
    categories: [...new Set(products.map(p => p.category))].length,
    outOfStock: products.filter(p => p.stock === 0).length,
  });
});

// ─── GET single product ────────────────────────────────────────────────────
app.get('/products/:id', (req, res) => {
  const p = products.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// ─── POST create product ───────────────────────────────────────────────────
app.post('/products', (req, res) => {
  const { name, category, price, stock, brand, image, description } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });

  const product = {
    id: uuidv4(), name, category: category || 'General',
    price: Number(price), stock: Number(stock) || 0,
    brand: brand || 'Generic', rating: 0,
    image: image || '📦', description: description || '',
    createdAt: new Date().toISOString()
  };
  products.push(product);
  console.log(`[Product Service] ✅ Product added: ${product.name}`);
  res.status(201).json(product);
});

// ─── PUT update product ────────────────────────────────────────────────────
app.put('/products/:id', (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products[idx] = { ...products[idx], ...req.body, id: products[idx].id };
  res.json(products[idx]);
});

// ─── PATCH reduce stock ────────────────────────────────────────────────────
app.patch('/products/:id/stock', (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const { quantity } = req.body;
  if (products[idx].stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });
  products[idx].stock -= Number(quantity);
  res.json({ id: products[idx].id, stock: products[idx].stock });
});

// ─── DELETE product ────────────────────────────────────────────────────────
app.delete('/products/:id', (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const removed = products.splice(idx, 1)[0];
  res.json({ message: 'Product deleted', product: removed });
});

const PORT = 3002;
app.listen(PORT, () => console.log(`🛍️  Product Service running on port ${PORT}`));
