const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const SERVICES = {
  users:    { port: 3001, name: 'User Service' },
  products: { port: 3002, name: 'Product Service' },
  orders:   { port: 3003, name: 'Order Service' },
  cart:     { port: 3004, name: 'Cart Service' },
};

// ── CORS — must run before proxy middleware so OPTIONS preflight is handled ──
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const http = require('http');
  const checks = await Promise.all(
    Object.entries(SERVICES).map(([key, svc]) =>
      new Promise(resolve => {
        const r = http.get(`http://localhost:${svc.port}/health`, resp => {
          resolve({ service: key, name: svc.name, port: svc.port, status: resp.statusCode === 200 ? 'up' : 'degraded' });
        }).on('error', () => resolve({ service: key, name: svc.name, port: svc.port, status: 'down' }));
        r.setTimeout(1000, () => { r.destroy(); resolve({ service: key, name: svc.name, port: svc.port, status: 'down' }); });
      })
    )
  );
  res.json({ gateway: 'up', timestamp: new Date().toISOString(), services: checks });
});

// ── Proxy config: inject CORS headers into every proxied response ─────────
const makeProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  logLevel: 'silent',
  on: {
    proxyRes: (proxyRes) => {
      proxyRes.headers['access-control-allow-origin']  = '*';
      proxyRes.headers['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
      proxyRes.headers['access-control-allow-headers'] = 'Content-Type,Authorization';
    },
  },
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/users',    makeProxy('http://localhost:3001'));
app.use('/products', makeProxy('http://localhost:3002'));
app.use('/orders',   makeProxy('http://localhost:3003'));
app.use('/cart',     makeProxy('http://localhost:3004'));

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway running at http://localhost:${PORT}`);
  console.log('📡 Routing:');
  Object.entries(SERVICES).forEach(([key, svc]) => {
    console.log(`   /${key.padEnd(10)} → http://localhost:${svc.port}  (${svc.name})`);
  });
  console.log(`\n🔍 Health Check: http://localhost:${PORT}/health\n`);
});
