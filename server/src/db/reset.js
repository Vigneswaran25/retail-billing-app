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

async function reset() {
  const client = await pool.connect();
  try {
    console.log('⚠️  Resetting all data (tables will be truncated)...\n');
    await client.query('BEGIN');
    await client.query('TRUNCATE inventory_log, invoice_items, invoices, products, customers, categories, users RESTART IDENTITY CASCADE');
    
    // Re-insert admin user so login works after reset
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (username, password, role) 
      VALUES ('admin', $1, 'admin')
      ON CONFLICT (username) DO NOTHING;
    `, [defaultPassword]);

    await client.query('COMMIT');
    console.log('✅ All data cleared. Admin user restored. Run `npm run db:seed` to re-seed.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reset failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
