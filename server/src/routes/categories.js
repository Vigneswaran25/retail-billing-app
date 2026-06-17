'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

// ── GET /api/categories ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, color, created_at FROM categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/categories/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, color, created_at FROM categories WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/categories ─────────────────────────────────────────────────────
router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('color').optional().isHexColor().withMessage('Invalid color hex'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, color = '#6c5ce7' } = req.body;
      const result = await db.query(
        'INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING *',
        [name, color]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/categories/:id ──────────────────────────────────────────────────
router.put('/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('color').optional().isHexColor().withMessage('Invalid color hex'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, color } = req.body;
      const existing = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Category not found' });

      const updated = {
        name: name ?? existing.rows[0].name,
        color: color ?? existing.rows[0].color,
      };

      const result = await db.query(
        'UPDATE categories SET name=$1, color=$2 WHERE id=$3 RETURNING *',
        [updated.name, updated.color, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/categories/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
