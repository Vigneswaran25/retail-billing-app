'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'retailpro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migration...\n');

    await client.query('BEGIN');

    // ── Users ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        username   TEXT UNIQUE NOT NULL,
        password   TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: users');

    // ── Categories ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        color      TEXT NOT NULL DEFAULT '#6c5ce7',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: categories');

    // ── Products ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        sku         TEXT UNIQUE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        price       NUMERIC(12,2) NOT NULL DEFAULT 0,
        cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax_rate    NUMERIC(5,2)  NOT NULL DEFAULT 0,
        stock       INTEGER       NOT NULL DEFAULT 0,
        min_stock   INTEGER       NOT NULL DEFAULT 5,
        unit        TEXT          NOT NULL DEFAULT 'piece',
        barcode     TEXT,
        description TEXT,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: products');

    // ── Customers ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id               SERIAL PRIMARY KEY,
        name             TEXT NOT NULL,
        email            TEXT,
        phone            TEXT,
        address          TEXT,
        city             TEXT,
        state            TEXT,
        zip              TEXT,
        gst              TEXT,
        total_purchases  INTEGER      NOT NULL DEFAULT 0,
        total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: customers');

    // ── Invoices ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id              SERIAL PRIMARY KEY,
        invoice_number  TEXT UNIQUE NOT NULL,
        customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customer_name   TEXT NOT NULL DEFAULT 'Walk-in Customer',
        subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
        discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
        discount_type   TEXT NOT NULL DEFAULT '%',
        total           NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_method  TEXT NOT NULL DEFAULT 'Cash',
        payment_status  TEXT NOT NULL DEFAULT 'paid'
          CHECK (payment_status IN ('paid','pending','cancelled')),
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: invoices');

    // ── Invoice Items ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id          SERIAL PRIMARY KEY,
        invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
        name        TEXT NOT NULL,
        price       NUMERIC(12,2) NOT NULL DEFAULT 0,
        qty         INTEGER NOT NULL DEFAULT 1,
        tax_rate    NUMERIC(5,2)  NOT NULL DEFAULT 0,
        total       NUMERIC(12,2) NOT NULL DEFAULT 0
      );
    `);
    console.log('  ✅ Table: invoice_items');

    // ── Inventory Log ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_log (
        id           SERIAL PRIMARY KEY,
        product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        old_stock    INTEGER NOT NULL DEFAULT 0,
        new_stock    INTEGER NOT NULL DEFAULT 0,
        type         TEXT NOT NULL DEFAULT 'set',
        qty          INTEGER NOT NULL DEFAULT 0,
        reason       TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: inventory_log');

    // ── Settings ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅ Table: settings');

    // ── Indexes ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_log_product ON inventory_log(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_log_created ON inventory_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    console.log('  ✅ Indexes created');

    // ── Default Settings ────────────────────────────────────────────────────
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
      await client.query(`
        INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
        ON CONFLICT (key) DO NOTHING;
      `, [key, value]);
    }
    console.log('  ✅ Default settings inserted');

    // ── Default Admin User ──────────────────────────────────────────────────
    // Password is 'admin123'
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (username, password, role) 
      VALUES ('admin', $1, 'admin')
      ON CONFLICT (username) DO NOTHING;
    `, [defaultPassword]);
    console.log('  ✅ Default admin user inserted');

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
