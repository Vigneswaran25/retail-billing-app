'use strict';

/**
 * Auto Setup — runs on every server start.
 * 1. Creates the database if it doesn't exist
 * 2. Creates all tables (CREATE TABLE IF NOT EXISTS — safe to re-run)
 * 3. Inserts default settings & admin user (ON CONFLICT DO NOTHING — safe to re-run)
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function autoSetup() {
  const dbName = process.env.DB_NAME || 'ayyanar_billing';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

  // ── Step 1: Connect to 'postgres' system DB to create our DB if missing ──────
  const sysPool = new Pool({ host: dbHost, port: dbPort, database: 'postgres', user: dbUser, password: dbPassword });
  try {
    const exists = await sysPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (exists.rows.length === 0) {
      await sysPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`  ✅ Database '${dbName}' created.`);
    } else {
      console.log(`  ✅ Database '${dbName}' already exists.`);
    }
  } finally {
    await sysPool.end();
  }

  // ── Step 2: Connect to our database and run migrations ───────────────────────
  const pool = new Pool({ host: dbHost, port: dbPort, database: dbName, user: dbUser, password: dbPassword });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Tables
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6c5ce7', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      price NUMERIC(12,2) NOT NULL DEFAULT 0, cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5, unit TEXT NOT NULL DEFAULT 'piece',
      barcode TEXT, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT,
      address TEXT, city TEXT, state TEXT, zip TEXT, gst TEXT,
      total_purchases INTEGER NOT NULL DEFAULT 0,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY, invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount NUMERIC(12,2) NOT NULL DEFAULT 0, discount_type TEXT NOT NULL DEFAULT '%',
      total NUMERIC(12,2) NOT NULL DEFAULT 0, payment_method TEXT NOT NULL DEFAULT 'Cash',
      payment_status TEXT NOT NULL DEFAULT 'paid'
        CHECK (payment_status IN ('paid','pending','cancelled')),
      notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      name TEXT NOT NULL, price NUMERIC(12,2) NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 1, tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS inventory_log (
      id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL, old_stock INTEGER NOT NULL DEFAULT 0,
      new_stock INTEGER NOT NULL DEFAULT 0, type TEXT NOT NULL DEFAULT 'set',
      qty INTEGER NOT NULL DEFAULT 0, reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Default settings
    const defaultSettings = [
      ['storeName', '"AYYANAR METAL"'],
      ['storeAddress', '"No 203, East Veli Street, Madurai-625 001"'],
      ['storePhone', '"9843922866"'],
      ['storeEmail', '""'],
      ['storeGST', '"33AXRPS4855R2Z9"'],
      ['currency', '"₹"'],
      ['currencyCode', '"INR"'],
      ['taxRates', JSON.stringify([{ name: 'GST 5%', rate: 5 }, { name: 'GST 12%', rate: 12 }, { name: 'GST 18%', rate: 18 }])],
      ['paymentMethods', JSON.stringify(['Cash', 'Card', 'UPI', 'Net Banking'])],
    ];
    for (const [key, value] of defaultSettings) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }

    // Default admin user
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (username, password, role) VALUES ('admin', $1, 'admin') ON CONFLICT (username) DO NOTHING`,
      [hash]
    );

    await client.query('COMMIT');
    console.log('  ✅ Database setup complete.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Database setup failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = autoSetup;
