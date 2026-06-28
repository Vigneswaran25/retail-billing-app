'use strict';

const router = require('express').Router();
const db = require('../db');

// Default settings values
const DEFAULTS = {
  storeName: 'AYYANAR METAL',
  storeAddress: 'No 203, East Veli Street, Madurai-625 001',
  storePhone: '9843922866',
  storeEmail: '',
  storeGST: '33AXRPS4855R2Z9',
  currency: '₹',
  currencyCode: 'INR',
  taxRates: [{ name: 'GST 5%', rate: 5 }, { name: 'GST 12%', rate: 12 }, { name: 'GST 18%', rate: 18 }],
  paymentMethods: ['Cash', 'Card', 'UPI', 'Net Banking'],
};

// ── GET /api/settings ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT key, value FROM settings');
    const settings = { ...DEFAULTS };
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/settings ────────────────────────────────────────────────────────
router.put('/', async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      storeName, storeAddress, storePhone, storeEmail, storeGST,
      currency, currencyCode, taxRates, paymentMethods
    } = req.body;

    const entries = {
      storeName, storeAddress, storePhone, storeEmail,
      storeGST: storeGST || '',
      currency: currency || '₹',
      currencyCode: currencyCode || 'INR',
      taxRates: (taxRates || []).filter(t => t.name && t.rate > 0),
      paymentMethods: (paymentMethods || []).filter(m => m && m.trim()),
    };

    for (const [key, value] of Object.entries(entries)) {
      if (value !== undefined) {
        await client.query(
          `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=NOW()`,
          [key, JSON.stringify(value)]
        );
      }
    }

    await client.query('COMMIT');

    // Return the merged settings
    const result = await db.query('SELECT key, value FROM settings');
    const settings = { ...DEFAULTS };
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
