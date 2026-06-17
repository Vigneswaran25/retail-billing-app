'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

// Helper: format product row to camelCase for client compatibility
const fmt = (row) => row ? {
  id: row.id,
  name: row.name,
  sku: row.sku || '',
  category: row.category_id ? String(row.category_id) : '',
  categoryId: row.category_id,
  categoryName: row.category_name || '',
  price: parseFloat(row.price),
  costPrice: parseFloat(row.cost_price),
  taxRate: parseFloat(row.tax_rate),
  stock: row.stock,
  minStock: row.min_stock,
  unit: row.unit,
  barcode: row.barcode || '',
  description: row.description || '',
  createdAt: row.created_at,
} : null;

const productQuery = `
  SELECT p.*, c.name AS category_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
`;

// ── GET /api/products ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, category, inStock } = req.query;
    let sql = productQuery + ' WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      sql += ` AND p.category_id = $${params.length}`;
    }
    if (inStock === 'true') {
      sql += ' AND p.stock > 0';
    }

    sql += ' ORDER BY p.name ASC';
    const result = await db.query(sql, params);
    res.json(result.rows.map(fmt));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(productQuery + ' WHERE p.id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(fmt(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('stock').optional().isInt({ min: 0 }),
  body('minStock').optional().isInt({ min: 0 }),
];

// ── POST /api/products ───────────────────────────────────────────────────────
router.post('/', productValidation, validate, async (req, res, next) => {
  try {
    const {
      name, sku, category, price, costPrice = 0, taxRate = 0,
      stock = 0, minStock = 5, unit = 'piece', barcode, description
    } = req.body;

    const categoryId = category ? parseInt(category, 10) : null;
    const result = await db.query(
      `INSERT INTO products (name, sku, category_id, price, cost_price, tax_rate, stock, min_stock, unit, barcode, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, sku || null, categoryId, price, costPrice, taxRate, stock, minStock, unit, barcode || null, description || null]
    );
    const product = await db.query(productQuery + ' WHERE p.id = $1', [result.rows[0].id]);
    res.status(201).json(fmt(product.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/products/bulk ──────────────────────────────────────────────────
router.post('/bulk', async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'products array is required' });
    }

    // Get category name → id map
    const catResult = await db.query('SELECT id, name FROM categories');
    const catMap = {};
    catResult.rows.forEach(c => { catMap[c.name.toLowerCase()] = c.id; });

    let added = 0, skipped = 0;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const p of products) {
        if (!p.name || !p.price || isNaN(parseFloat(p.price))) { skipped++; continue; }
        const catId = catMap[(p.category || '').toLowerCase()] || null;
        await client.query(
          `INSERT INTO products (name, sku, category_id, price, cost_price, tax_rate, stock, min_stock, unit, barcode, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (sku) DO NOTHING`,
          [
            p.name, p.sku || null, catId,
            parseFloat(p.price), parseFloat(p.costPrice || p.costprice || 0) || 0,
            parseFloat(p.taxRate || p.taxrate || 0) || 0,
            parseInt(p.stock || 0, 10) || 0,
            parseInt(p.minStock || p.minstock || 5, 10) || 5,
            p.unit || 'piece', p.barcode || null, p.description || null
          ]
        );
        added++;
      }
      await client.query('COMMIT');
      res.json({ message: `Imported ${added} products. ${skipped} skipped.`, added, skipped });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/products/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });

    const p = existing.rows[0];
    const {
      name = p.name, sku = p.sku, category, price = p.price, costPrice = p.cost_price,
      taxRate = p.tax_rate, stock = p.stock, minStock = p.min_stock,
      unit = p.unit, barcode = p.barcode, description = p.description
    } = req.body;

    const categoryId = category !== undefined ? (category ? parseInt(category, 10) : null) : p.category_id;

    await db.query(
      `UPDATE products SET name=$1, sku=$2, category_id=$3, price=$4, cost_price=$5,
       tax_rate=$6, stock=$7, min_stock=$8, unit=$9, barcode=$10, description=$11
       WHERE id=$12`,
      [name, sku || null, categoryId, price, costPrice, taxRate, stock, minStock, unit, barcode || null, description || null, req.params.id]
    );

    const updated = await db.query(productQuery + ' WHERE p.id = $1', [req.params.id]);
    res.json(fmt(updated.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/products/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
