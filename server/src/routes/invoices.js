'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

// Format invoice row + items for client consumption
const fmtInvoice = (row, items = []) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  customerId: row.customer_id ? String(row.customer_id) : '',
  customerName: row.customer_name || 'Walk-in Customer',
  subtotal: parseFloat(row.subtotal),
  taxAmount: parseFloat(row.tax_amount),
  discount: parseFloat(row.discount),
  discountType: row.discount_type,
  total: parseFloat(row.total),
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  notes: row.notes || '',
  createdAt: row.created_at,
  items: items.map(i => ({
    id: i.id,
    productId: i.product_id ? String(i.product_id) : '',
    name: i.name,
    price: parseFloat(i.price),
    qty: i.qty,
    taxRate: parseFloat(i.tax_rate),
    total: parseFloat(i.total),
  })),
});

// ── GET /api/invoices ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, status, dateFrom, dateTo, limit, offset } = req.query;
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (invoice_number ILIKE $${params.length} OR customer_name ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      sql += ` AND payment_status = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND created_at >= $${params.length}::date`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND created_at <= ($${params.length}::date + INTERVAL '1 day')`;
    }

    sql += ' ORDER BY created_at DESC';

    if (limit) {
      params.push(parseInt(limit, 10));
      sql += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(parseInt(offset, 10));
      sql += ` OFFSET $${params.length}`;
    }

    const invoicesResult = await db.query(sql, params);
    const invoiceIds = invoicesResult.rows.map(r => r.id);

    if (invoiceIds.length === 0) return res.json([]);

    const itemsResult = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ANY($1::int[]) ORDER BY id',
      [invoiceIds]
    );

    const itemsByInvoice = {};
    itemsResult.rows.forEach(item => {
      if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
      itemsByInvoice[item.invoice_id].push(item);
    });

    res.json(invoicesResult.rows.map(inv => fmtInvoice(inv, itemsByInvoice[inv.id] || [])));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/invoices/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const invResult = await db.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
    if (!invResult.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const itemsResult = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id',
      [req.params.id]
    );
    res.json(fmtInvoice(invResult.rows[0], itemsResult.rows));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/invoices (Create Sale — atomic) ────────────────────────────────
router.post('/',
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('total').isFloat({ min: 0 }).withMessage('Total must be a non-negative number'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  ],
  validate,
  async (req, res, next) => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const {
        customerId, customerName = 'Walk-in Customer',
        items, subtotal = 0, taxAmount = 0, discount = 0,
        discountType = '%', total, paymentMethod, paymentStatus = 'paid', notes = ''
      } = req.body;

      // Generate next invoice number
      const countRow = await client.query('SELECT COUNT(*) FROM invoices');
      const seq = parseInt(countRow.rows[0].count, 10) + 1;
      const invoiceNumber = 'INV-' + String(seq + 1000).padStart(5, '0');

      // Insert invoice
      const invResult = await client.query(
        `INSERT INTO invoices (invoice_number, customer_id, customer_name, subtotal, tax_amount, discount, discount_type, total, payment_method, payment_status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          invoiceNumber,
          customerId ? parseInt(customerId, 10) : null,
          customerName,
          subtotal, taxAmount, discount, discountType, total,
          paymentMethod, paymentStatus, notes
        ]
      );
      const inv = invResult.rows[0];

      // Insert invoice items + reduce stock
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, product_id, name, price, qty, tax_rate, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            inv.id,
            item.productId ? parseInt(item.productId, 10) : null,
            item.name, item.price, item.qty,
            item.taxRate || 0,
            item.total || (item.price * item.qty)
          ]
        );

        // Reduce product stock
        if (item.productId) {
          await client.query(
            `UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2`,
            [item.qty, parseInt(item.productId, 10)]
          );
        }
      }

      // Update customer totals (only if paid)
      if (customerId && paymentStatus === 'paid') {
        await client.query(
          `UPDATE customers SET total_purchases = total_purchases + 1, total_amount = total_amount + $1 WHERE id = $2`,
          [total, parseInt(customerId, 10)]
        );
      }

      await client.query('COMMIT');

      // Return full invoice with items
      const itemsResult = await db.query(
        'SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id', [inv.id]
      );
      res.status(201).json(fmtInvoice(inv, itemsResult.rows));
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── PUT /api/invoices/:id (update status/notes) ──────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const inv = existing.rows[0];
    const { paymentStatus = inv.payment_status, notes = inv.notes } = req.body;

    const result = await db.query(
      'UPDATE invoices SET payment_status=$1, notes=$2 WHERE id=$3 RETURNING *',
      [paymentStatus, notes, req.params.id]
    );
    const itemsResult = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id', [req.params.id]
    );
    res.json(fmtInvoice(result.rows[0], itemsResult.rows));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/invoices/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM invoices WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
