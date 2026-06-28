'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const categoriesRouter = require('./src/routes/categories');
const productsRouter = require('./src/routes/products');
const customersRouter = require('./src/routes/customers');
const invoicesRouter = require('./src/routes/invoices');
const inventoryRouter = require('./src/routes/inventory');
const settingsRouter = require('./src/routes/settings');
const reportsRouter = require('./src/routes/reports');
const dashboardRouter = require('./src/routes/dashboard');
const dbAdminRouter = require('./src/routes/dbAdmin');
const errorHandler = require('./src/middleware/errorHandler');
const autoSetup = require('./src/db/autoSetup');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
}
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'RetailPro API' });
});

const authRouter = require('./src/routes/auth');
const authenticate = require('./src/middleware/auth');

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// Protect all other API routes
app.use('/api', authenticate);

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/db', dbAdminRouter);

// ── Serve React Build in Production ─────────────────────────────────────────
const publicPath = path.join(process.cwd(), 'public');
if (isProd) {
  app.use(express.static(publicPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // ── 404 Handler (dev only) ─────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server (after DB auto-setup) ──────────────────────────────────────
console.log('\n🔄 Checking database...');
autoSetup()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 AYYANAR METAL Billing running → http://localhost:${PORT}`);
      console.log(`📊 Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database    : ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`\n  Open your browser at: http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('\n❌ Failed to start — database error:');
    console.error('   ' + err.message);
    console.error('\n  Check your .env file — make sure DB_PASSWORD is correct and PostgreSQL is running.\n');
    process.exit(1);
  });

module.exports = app;

