'use strict';

const router = require('express').Router();
const db = require('../db');

// ── POST /api/db/seed ─────────────────────────────────────────────────────────
router.post('/seed', async (req, res, next) => {
  try {
    const check = await db.query('SELECT COUNT(*) FROM products');
    if (parseInt(check.rows[0].count, 10) > 0) {
      return res.status(409).json({
        error: 'Database already has data. Use /api/db/reset first to clear it.'
      });
    }

    // Dynamically run the seed logic
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'retailpro',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const catData = [
        { name: 'Groceries', color: '#00b894' }, { name: 'Beverages', color: '#74b9ff' },
        { name: 'Snacks', color: '#fdcb6e' }, { name: 'Personal Care', color: '#e17055' },
        { name: 'Dairy', color: '#a29bfe' }, { name: 'Electronics', color: '#fd79a8' },
        { name: 'Household', color: '#55efc4' }, { name: 'Stationery', color: '#ffeaa7' },
      ];
      const catIds = [];
      for (const cat of catData) {
        const r = await client.query('INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING id', [cat.name, cat.color]);
        catIds.push(r.rows[0].id);
      }

      const productData = [
        { name: 'Basmati Rice 5kg', sku: 'GR001', catIdx: 0, price: 450, cost: 380, tax: 5, unit: 'bag', stock: 120, min: 20 },
        { name: 'Wheat Flour 10kg', sku: 'GR002', catIdx: 0, price: 380, cost: 310, tax: 5, unit: 'bag', stock: 80, min: 15 },
        { name: 'Sunflower Oil 1L', sku: 'GR003', catIdx: 0, price: 165, cost: 130, tax: 5, unit: 'bottle', stock: 200, min: 30 },
        { name: 'Sugar 1kg', sku: 'GR004', catIdx: 0, price: 48, cost: 38, tax: 5, unit: 'pack', stock: 150, min: 25 },
        { name: 'Coca Cola 500ml', sku: 'BV001', catIdx: 1, price: 40, cost: 30, tax: 12, unit: 'bottle', stock: 300, min: 50 },
        { name: 'Pepsi 2L', sku: 'BV002', catIdx: 1, price: 85, cost: 65, tax: 12, unit: 'bottle', stock: 100, min: 20 },
        { name: 'Green Tea Pack', sku: 'BV003', catIdx: 1, price: 220, cost: 160, tax: 12, unit: 'box', stock: 60, min: 10 },
        { name: 'Mango Juice 1L', sku: 'BV004', catIdx: 1, price: 95, cost: 70, tax: 12, unit: 'pack', stock: 150, min: 30 },
        { name: 'Potato Chips 150g', sku: 'SN001', catIdx: 2, price: 30, cost: 20, tax: 12, unit: 'pack', stock: 250, min: 40 },
        { name: 'Cookies Premium', sku: 'SN002', catIdx: 2, price: 55, cost: 38, tax: 12, unit: 'pack', stock: 180, min: 30 },
        { name: 'Mixed Nuts 200g', sku: 'SN003', catIdx: 2, price: 280, cost: 200, tax: 12, unit: 'pack', stock: 75, min: 15 },
        { name: 'Shampoo 400ml', sku: 'PC001', catIdx: 3, price: 280, cost: 200, tax: 18, unit: 'bottle', stock: 90, min: 15 },
        { name: 'Toothpaste 150g', sku: 'PC002', catIdx: 3, price: 95, cost: 65, tax: 18, unit: 'tube', stock: 200, min: 30 },
        { name: 'Hand Soap 250ml', sku: 'PC003', catIdx: 3, price: 65, cost: 42, tax: 18, unit: 'bottle', stock: 160, min: 25 },
        { name: 'Full Cream Milk 1L', sku: 'DR001', catIdx: 4, price: 65, cost: 52, tax: 5, unit: 'pack', stock: 100, min: 30 },
        { name: 'Butter 500g', sku: 'DR002', catIdx: 4, price: 260, cost: 210, tax: 5, unit: 'pack', stock: 50, min: 10 },
        { name: 'Paneer 200g', sku: 'DR003', catIdx: 4, price: 90, cost: 68, tax: 5, unit: 'pack', stock: 80, min: 15 },
        { name: 'USB Cable Type-C', sku: 'EL001', catIdx: 5, price: 199, cost: 120, tax: 18, unit: 'piece', stock: 50, min: 10 },
        { name: 'LED Bulb 9W', sku: 'EL002', catIdx: 5, price: 120, cost: 75, tax: 18, unit: 'piece', stock: 100, min: 20 },
        { name: 'Detergent Powder 1kg', sku: 'HH001', catIdx: 6, price: 180, cost: 130, tax: 18, unit: 'pack', stock: 110, min: 20 },
        { name: 'Floor Cleaner 1L', sku: 'HH002', catIdx: 6, price: 145, cost: 95, tax: 18, unit: 'bottle', stock: 90, min: 15 },
        { name: 'Notebook 200pg', sku: 'ST001', catIdx: 7, price: 60, cost: 35, tax: 12, unit: 'piece', stock: 200, min: 30 },
        { name: 'Ball Pen Pack of 10', sku: 'ST002', catIdx: 7, price: 80, cost: 45, tax: 12, unit: 'pack', stock: 150, min: 25 },
      ];

      const prodIds = [];
      for (const p of productData) {
        const r = await client.query(
          'INSERT INTO products (name, sku, category_id, price, cost_price, tax_rate, stock, min_stock, unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
          [p.name, p.sku, catIds[p.catIdx], p.price, p.cost, p.tax, p.stock, p.min, p.unit]
        );
        prodIds.push({ id: r.rows[0].id, ...p });
      }

      const custData = [
        { name: 'Rahul Sharma', email: 'rahul@email.com', phone: '9876543210', address: '45 MG Road', city: 'Mumbai', state: 'Maharashtra', zip: '400001', gst: '' },
        { name: 'Priya Patel', email: 'priya@email.com', phone: '9876543211', address: '12 Park Street', city: 'Delhi', state: 'Delhi', zip: '110001', gst: '' },
        { name: 'Amit Kumar', email: 'amit@email.com', phone: '9876543212', address: '78 Lake View', city: 'Bangalore', state: 'Karnataka', zip: '560001', gst: '29AABCU9603R1ZP' },
        { name: 'Sneha Reddy', email: 'sneha@email.com', phone: '9876543213', address: '23 Hill Road', city: 'Hyderabad', state: 'Telangana', zip: '500001', gst: '' },
        { name: 'Vikram Singh', email: 'vikram@email.com', phone: '9876543214', address: '56 Canal St', city: 'Chennai', state: 'Tamil Nadu', zip: '600001', gst: '33AADCV1234F1Z5' },
      ];
      const custIds = [];
      for (const c of custData) {
        const r = await client.query(
          'INSERT INTO customers (name, email, phone, address, city, state, zip, gst) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
          [c.name, c.email, c.phone, c.address, c.city, c.state, c.zip, c.gst]
        );
        custIds.push(r.rows[0].id);
      }

      await client.query('COMMIT');
      await pool.end();
      res.json({ message: 'Database seeded successfully', categories: catIds.length, products: prodIds.length, customers: custData.length });
    } catch (err) {
      await client.query('ROLLBACK');
      await pool.end();
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/db/reset ────────────────────────────────────────────────────────
router.post('/reset', async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE inventory_log, invoice_items, invoices, products, customers, categories RESTART IDENTITY CASCADE');
    // Reset settings to defaults
    await client.query("DELETE FROM settings WHERE key NOT IN ('storeName','storeAddress','storePhone','storeEmail','storeGST','currency','currencyCode','taxRates','paymentMethods')");
    await client.query('COMMIT');
    res.json({ message: 'All data reset. Run /api/db/seed to re-populate.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/db/export ────────────────────────────────────────────────────────
router.get('/export', async (req, res, next) => {
  try {
    const [categories, products, customers, invoices, invoiceItems, inventoryLog, settings] = await Promise.all([
      db.query('SELECT * FROM categories ORDER BY id'),
      db.query('SELECT * FROM products ORDER BY id'),
      db.query('SELECT * FROM customers ORDER BY id'),
      db.query('SELECT * FROM invoices ORDER BY id'),
      db.query('SELECT * FROM invoice_items ORDER BY id'),
      db.query('SELECT * FROM inventory_log ORDER BY id'),
      db.query('SELECT * FROM settings'),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      categories: categories.rows,
      products: products.rows,
      customers: customers.rows,
      invoices: invoices.rows,
      invoiceItems: invoiceItems.rows,
      inventoryLog: inventoryLog.rows,
      settings: Object.fromEntries(settings.rows.map(r => [r.key, r.value])),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="retailpro_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/db/import ───────────────────────────────────────────────────────
router.post('/import', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid backup data' });
    }

    await client.query('BEGIN');
    await client.query('TRUNCATE inventory_log, invoice_items, invoices, products, customers, categories RESTART IDENTITY CASCADE');

    // Import categories
    if (data.categories) {
      for (const c of data.categories) {
        await client.query(
          'INSERT INTO categories (id, name, color, created_at) VALUES ($1,$2,$3,$4)',
          [c.id, c.name, c.color || '#6c5ce7', c.created_at || new Date()]
        );
      }
      await client.query("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))");
    }

    // Import products
    if (data.products) {
      for (const p of data.products) {
        await client.query(
          'INSERT INTO products (id, name, sku, category_id, price, cost_price, tax_rate, stock, min_stock, unit, barcode, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
          [p.id, p.name, p.sku || null, p.category_id || null, p.price, p.cost_price || 0, p.tax_rate || 0, p.stock || 0, p.min_stock || 5, p.unit || 'piece', p.barcode || null, p.description || null, p.created_at || new Date()]
        );
      }
      await client.query("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))");
    }

    // Import customers
    if (data.customers) {
      for (const c of data.customers) {
        await client.query(
          'INSERT INTO customers (id, name, email, phone, address, city, state, zip, gst, total_purchases, total_amount, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
          [c.id, c.name, c.email || null, c.phone || null, c.address || null, c.city || null, c.state || null, c.zip || null, c.gst || null, c.total_purchases || 0, c.total_amount || 0, c.created_at || new Date()]
        );
      }
      await client.query("SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers))");
    }

    // Import invoices + items
    if (data.invoices) {
      for (const inv of data.invoices) {
        await client.query(
          'INSERT INTO invoices (id, invoice_number, customer_id, customer_name, subtotal, tax_amount, discount, discount_type, total, payment_method, payment_status, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
          [inv.id, inv.invoice_number, inv.customer_id || null, inv.customer_name || 'Walk-in', inv.subtotal, inv.tax_amount, inv.discount || 0, inv.discount_type || '%', inv.total, inv.payment_method, inv.payment_status, inv.notes || '', inv.created_at || new Date()]
        );
      }
      await client.query("SELECT setval('invoices_id_seq', (SELECT MAX(id) FROM invoices))");
    }

    if (data.invoiceItems) {
      for (const item of data.invoiceItems) {
        await client.query(
          'INSERT INTO invoice_items (id, invoice_id, product_id, name, price, qty, tax_rate, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [item.id, item.invoice_id, item.product_id || null, item.name, item.price, item.qty, item.tax_rate || 0, item.total]
        );
      }
      await client.query("SELECT setval('invoice_items_id_seq', (SELECT MAX(id) FROM invoice_items))");
    }

    if (data.settings && typeof data.settings === 'object') {
      for (const [key, value] of Object.entries(data.settings)) {
        await client.query(
          'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()',
          [key, JSON.stringify(value)]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Import completed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
