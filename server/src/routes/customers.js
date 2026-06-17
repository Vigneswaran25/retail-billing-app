'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

const fmt = (row) => row ? {
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  address: row.address || '',
  city: row.city || '',
  state: row.state || '',
  zip: row.zip || '',
  gst: row.gst || '',
  totalPurchases: row.total_purchases,
  totalAmount: parseFloat(row.total_amount),
  createdAt: row.created_at,
} : null;

// ── GET /api/customers ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    sql += ' ORDER BY name ASC';
    const result = await db.query(sql, params);
    res.json(result.rows.map(fmt));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customers/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(fmt(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/customers ──────────────────────────────────────────────────────
router.post('/',
  [body('name').trim().notEmpty().withMessage('Customer name is required')],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, phone, address, city, state, zip, gst } = req.body;
      const result = await db.query(
        `INSERT INTO customers (name, email, phone, address, city, state, zip, gst)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [name, email || null, phone || null, address || null, city || null, state || null, zip || null, gst || null]
      );
      res.status(201).json(fmt(result.rows[0]));
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/customers/:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const c = existing.rows[0];

    const {
      name = c.name, email = c.email, phone = c.phone,
      address = c.address, city = c.city, state = c.state,
      zip = c.zip, gst = c.gst
    } = req.body;

    const result = await db.query(
      `UPDATE customers SET name=$1, email=$2, phone=$3, address=$4, city=$5, state=$6, zip=$7, gst=$8
       WHERE id=$9 RETURNING *`,
      [name, email || null, phone || null, address || null, city || null, state || null, zip || null, gst || null, req.params.id]
    );
    res.json(fmt(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/customers/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM customers WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
