'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'retailpro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const settings = {
  storeName: 'AYYANAR METAL',
  storeAddress: 'No 203, East Veli Street, Madurai-625 001',
  storePhone: '9843922866',
  storeEmail: '',
  storeGST: '33AXRPS4855R2Z9',
};

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,
        [key, JSON.stringify(value)]
      );
      console.log(`  ✅ Updated: ${key} = ${value}`);
    }
    await client.query('COMMIT');
    console.log('\n✅ Store settings updated successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
