'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

const fmtProduct = (row) => ({
  id: row.id,
  name: row.name,
  sku: row.sku || '',
  category: row.category_id ? String(row.category_id) : '',
  categoryName: row.category_name || '',
  price: parseFloat(row.price),
  costPrice: parseFloat(row.cost_price),
  taxRate: parseFloat(row.tax_rate),
  stock: row.stock,
  minStock: row.min_stock,
  unit: row.unit,
});

const fmtLog = (row) => ({
  id: row.id,
  productId: row.product_id ? String(row.product_id) : '',
  productName: row.product_name,
  oldStock: row.old_stock,
  newStock: row.new_stock,
  type: row.type,
  qty: row.qty,
  reason: row.reason || '',
  createdAt: row.created_at,
});

// ── GET /api/inventory ────────────────────────────────────────────────────────
// Returns all products with stock info, optionally filtered
router.get('/', async (req, res, next) => {
  try {
    const { search, filter } = req.query;
    let sql = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }
    if (filter === 'low') {
      sql += ' AND p.stock > 0 AND p.stock <= p.min_stock';
    } else if (filter === 'out') {
      sql += ' AND p.stock <= 0';
    }

    sql += ' ORDER BY p.name ASC';
    const result = await db.query(sql, params);
    res.json(result.rows.map(fmtProduct));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/inventory/log ────────────────────────────────────────────────────
router.get('/log', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM inventory_log ORDER BY created_at DESC LIMIT 500'
    );
    res.json(result.rows.map(fmtLog));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/inventory/:productId/adjust ─────────────────────────────────────
router.post('/:productId/adjust',
  [
    body('type').isIn(['set', 'add', 'subtract']).withMessage('Type must be set, add, or subtract'),
    body('qty').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ],
  validate,
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const { productId } = req.params;
      const prodResult = await client.query('SELECT * FROM products WHERE id=$1', [productId]);
      if (!prodResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = prodResult.rows[0];
      const { type, qty, reason = '' } = req.body;
      let newStock = product.stock;

      if (type === 'set') {
        newStock = parseInt(qty, 10);
      } else if (type === 'add') {
        newStock = product.stock + parseInt(qty, 10);
      } else if (type === 'subtract') {
        newStock = Math.max(0, product.stock - parseInt(qty, 10));
      }

      // Update product stock
      await client.query('UPDATE products SET stock=$1 WHERE id=$2', [newStock, productId]);

      // Log the adjustment
      const logResult = await client.query(
        `INSERT INTO inventory_log (product_id, product_name, old_stock, new_stock, type, qty, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [productId, product.name, product.stock, newStock, type, qty, reason]
      );

      await client.query('COMMIT');

      res.json({
        product: { ...fmtProduct(product), stock: newStock },
        log: fmtLog(logResult.rows[0]),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
