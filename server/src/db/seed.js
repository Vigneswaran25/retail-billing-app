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

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database with sample data...\n');

    await client.query('BEGIN');

    // Check if already seeded
    const check = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(check.rows[0].count, 10) > 0) {
      console.log('⚠️  Database already has products. Skipping seed to avoid duplicates.');
      console.log('   Run `npm run db:reset` first if you want to re-seed.\n');
      await client.query('ROLLBACK');
      return;
    }

    // ── Categories ───────────────────────────────────────────────────────────
    const catData = [
      { name: 'Groceries', color: '#00b894' },
      { name: 'Beverages', color: '#74b9ff' },
      { name: 'Snacks', color: '#fdcb6e' },
      { name: 'Personal Care', color: '#e17055' },
      { name: 'Dairy', color: '#a29bfe' },
      { name: 'Electronics', color: '#fd79a8' },
      { name: 'Household', color: '#55efc4' },
      { name: 'Stationery', color: '#ffeaa7' },
    ];

    const catIds = [];
    for (const cat of catData) {
      const r = await client.query(
        'INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING id',
        [cat.name, cat.color]
      );
      catIds.push(r.rows[0].id);
    }
    console.log(`  ✅ Inserted ${catIds.length} categories`);

    // ── Products ─────────────────────────────────────────────────────────────
    const productData = [
      { name: 'Basmati Rice 5kg',    sku: 'GR001', catIdx: 0, price: 450, cost: 380, tax: 5,  unit: 'bag',    stock: 120, min: 20 },
      { name: 'Wheat Flour 10kg',    sku: 'GR002', catIdx: 0, price: 380, cost: 310, tax: 5,  unit: 'bag',    stock: 80,  min: 15 },
      { name: 'Sunflower Oil 1L',    sku: 'GR003', catIdx: 0, price: 165, cost: 130, tax: 5,  unit: 'bottle', stock: 200, min: 30 },
      { name: 'Sugar 1kg',           sku: 'GR004', catIdx: 0, price: 48,  cost: 38,  tax: 5,  unit: 'pack',   stock: 150, min: 25 },
      { name: 'Coca Cola 500ml',     sku: 'BV001', catIdx: 1, price: 40,  cost: 30,  tax: 12, unit: 'bottle', stock: 300, min: 50 },
      { name: 'Pepsi 2L',            sku: 'BV002', catIdx: 1, price: 85,  cost: 65,  tax: 12, unit: 'bottle', stock: 100, min: 20 },
      { name: 'Green Tea Pack',      sku: 'BV003', catIdx: 1, price: 220, cost: 160, tax: 12, unit: 'box',    stock: 60,  min: 10 },
      { name: 'Mango Juice 1L',      sku: 'BV004', catIdx: 1, price: 95,  cost: 70,  tax: 12, unit: 'pack',   stock: 150, min: 30 },
      { name: 'Potato Chips 150g',   sku: 'SN001', catIdx: 2, price: 30,  cost: 20,  tax: 12, unit: 'pack',   stock: 250, min: 40 },
      { name: 'Cookies Premium',     sku: 'SN002', catIdx: 2, price: 55,  cost: 38,  tax: 12, unit: 'pack',   stock: 180, min: 30 },
      { name: 'Mixed Nuts 200g',     sku: 'SN003', catIdx: 2, price: 280, cost: 200, tax: 12, unit: 'pack',   stock: 75,  min: 15 },
      { name: 'Shampoo 400ml',       sku: 'PC001', catIdx: 3, price: 280, cost: 200, tax: 18, unit: 'bottle', stock: 90,  min: 15 },
      { name: 'Toothpaste 150g',     sku: 'PC002', catIdx: 3, price: 95,  cost: 65,  tax: 18, unit: 'tube',   stock: 200, min: 30 },
      { name: 'Hand Soap 250ml',     sku: 'PC003', catIdx: 3, price: 65,  cost: 42,  tax: 18, unit: 'bottle', stock: 160, min: 25 },
      { name: 'Full Cream Milk 1L',  sku: 'DR001', catIdx: 4, price: 65,  cost: 52,  tax: 5,  unit: 'pack',   stock: 100, min: 30 },
      { name: 'Butter 500g',         sku: 'DR002', catIdx: 4, price: 260, cost: 210, tax: 5,  unit: 'pack',   stock: 50,  min: 10 },
      { name: 'Paneer 200g',         sku: 'DR003', catIdx: 4, price: 90,  cost: 68,  tax: 5,  unit: 'pack',   stock: 80,  min: 15 },
      { name: 'USB Cable Type-C',    sku: 'EL001', catIdx: 5, price: 199, cost: 120, tax: 18, unit: 'piece',  stock: 50,  min: 10 },
      { name: 'LED Bulb 9W',         sku: 'EL002', catIdx: 5, price: 120, cost: 75,  tax: 18, unit: 'piece',  stock: 100, min: 20 },
      { name: 'Detergent Powder 1kg',sku: 'HH001', catIdx: 6, price: 180, cost: 130, tax: 18, unit: 'pack',   stock: 110, min: 20 },
      { name: 'Floor Cleaner 1L',    sku: 'HH002', catIdx: 6, price: 145, cost: 95,  tax: 18, unit: 'bottle', stock: 90,  min: 15 },
      { name: 'Notebook 200pg',      sku: 'ST001', catIdx: 7, price: 60,  cost: 35,  tax: 12, unit: 'piece',  stock: 200, min: 30 },
      { name: 'Ball Pen Pack of 10', sku: 'ST002', catIdx: 7, price: 80,  cost: 45,  tax: 12, unit: 'pack',   stock: 150, min: 25 },
    ];

    const prodIds = [];
    for (const p of productData) {
      const r = await client.query(
        `INSERT INTO products (name, sku, category_id, price, cost_price, tax_rate, stock, min_stock, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [p.name, p.sku, catIds[p.catIdx], p.price, p.cost, p.tax, p.stock, p.min, p.unit]
      );
      prodIds.push({ id: r.rows[0].id, ...p });
    }
    console.log(`  ✅ Inserted ${prodIds.length} products`);

    // ── Customers ────────────────────────────────────────────────────────────
    const custData = [
      { name: 'Rahul Sharma',  email: 'rahul@email.com',  phone: '9876543210', address: '45 MG Road',    city: 'Mumbai',    state: 'Maharashtra', zip: '400001', gst: '' },
      { name: 'Priya Patel',   email: 'priya@email.com',  phone: '9876543211', address: '12 Park Street', city: 'Delhi',     state: 'Delhi',       zip: '110001', gst: '' },
      { name: 'Amit Kumar',    email: 'amit@email.com',   phone: '9876543212', address: '78 Lake View',   city: 'Bangalore', state: 'Karnataka',   zip: '560001', gst: '29AABCU9603R1ZP' },
      { name: 'Sneha Reddy',   email: 'sneha@email.com',  phone: '9876543213', address: '23 Hill Road',   city: 'Hyderabad', state: 'Telangana',   zip: '500001', gst: '' },
      { name: 'Vikram Singh',  email: 'vikram@email.com', phone: '9876543214', address: '56 Canal St',    city: 'Chennai',   state: 'Tamil Nadu',  zip: '600001', gst: '33AADCV1234F1Z5' },
    ];

    const custIds = [];
    for (const c of custData) {
      const r = await client.query(
        `INSERT INTO customers (name, email, phone, address, city, state, zip, gst)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [c.name, c.email, c.phone, c.address, c.city, c.state, c.zip, c.gst]
      );
      custIds.push(r.rows[0].id);
    }
    console.log(`  ✅ Inserted ${custData.length} customers`);

    // ── Sample Invoices (last 7 days) ─────────────────────────────────────────
    const methods = ['Cash', 'Card', 'UPI'];
    let invoiceCount = 0;

    // Get current invoice count for numbering
    const invCountRow = await client.query('SELECT COUNT(*) FROM invoices');
    let invSeq = parseInt(invCountRow.rows[0].count, 10);

    for (let d = 6; d >= 0; d--) {
      const numInv = 2 + Math.floor(Math.random() * 4);
      for (let n = 0; n < numInv; n++) {
        const itemCount = 1 + Math.floor(Math.random() * 4);
        const selectedProds = [];
        const usedIndexes = new Set();
        for (let ii = 0; ii < itemCount; ii++) {
          let pi;
          do { pi = Math.floor(Math.random() * prodIds.length); } while (usedIndexes.has(pi));
          usedIndexes.add(pi);
          const pr = prodIds[pi];
          const qty = 1 + Math.floor(Math.random() * 3);
          selectedProds.push({ productId: pr.id, name: pr.name, price: pr.price, qty, taxRate: pr.tax, total: pr.price * qty });
        }

        const subtotal = selectedProds.reduce((s, i) => s + i.total, 0);
        const taxAmount = selectedProds.reduce((s, i) => s + (i.total * i.taxRate / 100), 0);
        const total = Math.round((subtotal + taxAmount) * 100) / 100;
        const cust = custIds[Math.floor(Math.random() * custIds.length)];
        const custRow = await client.query('SELECT name FROM customers WHERE id=$1', [cust]);

        const dt = new Date();
        dt.setDate(dt.getDate() - d);
        dt.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

        invSeq++;
        const invNumber = 'INV-' + String(invSeq + 1000).padStart(5, '0');
        const status = Math.random() > 0.15 ? 'paid' : 'pending';
        const method = methods[Math.floor(Math.random() * methods.length)];

        const invRow = await client.query(
          `INSERT INTO invoices (invoice_number, customer_id, customer_name, subtotal, tax_amount, discount, discount_type, total, payment_method, payment_status, notes, created_at)
           VALUES ($1,$2,$3,$4,$5,0,'%',$6,$7,$8,'',$9) RETURNING id`,
          [invNumber, cust, custRow.rows[0].name, Math.round(subtotal * 100) / 100, Math.round(taxAmount * 100) / 100, total, method, status, dt.toISOString()]
        );
        const invId = invRow.rows[0].id;

        for (const item of selectedProds) {
          await client.query(
            `INSERT INTO invoice_items (invoice_id, product_id, name, price, qty, tax_rate, total)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [invId, item.productId, item.name, item.price, item.qty, item.taxRate, Math.round(item.total * 100) / 100]
          );
        }

        // Update customer totals (only for paid)
        if (status === 'paid') {
          await client.query(
            `UPDATE customers SET total_purchases = total_purchases + 1, total_amount = total_amount + $1 WHERE id = $2`,
            [total, cust]
          );
        }

        invoiceCount++;
      }
    }
    console.log(`  ✅ Inserted ${invoiceCount} sample invoices`);

    await client.query('COMMIT');
    console.log('\n✅ Database seeded successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
