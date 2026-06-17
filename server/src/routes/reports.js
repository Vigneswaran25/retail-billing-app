'use strict';

const router = require('express').Router();
const db = require('../db');

// ── GET /api/reports ──────────────────────────────────────────────────────────
// Query params: dateFrom, dateTo (YYYY-MM-DD)
router.get('/', async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo + 'T23:59:59.999Z');

    // Summary stats
    const summary = await db.query(`
      SELECT
        COUNT(*) AS total_invoices,
        COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid_invoices,
        COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_invoices,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS total_revenue,
        COALESCE(SUM(tax_amount) FILTER (WHERE payment_status = 'paid'), 0) AS total_tax,
        COALESCE(SUM(discount) FILTER (WHERE payment_status = 'paid'), 0) AS total_discount,
        CASE WHEN COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
             THEN SUM(total) FILTER (WHERE payment_status = 'paid') / COUNT(*) FILTER (WHERE payment_status = 'paid')
             ELSE 0 END AS avg_order_value
      FROM invoices
      WHERE created_at >= $1 AND created_at <= $2
    `, [from.toISOString(), to.toISOString()]);

    // Daily sales
    const dailySales = await db.query(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS date,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS total
      FROM invoices
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
      ORDER BY date ASC
    `, [from.toISOString(), to.toISOString()]);

    // Payment method breakdown
    const paymentBreakdown = await db.query(`
      SELECT payment_method, COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
      FROM invoices
      WHERE created_at >= $1 AND created_at <= $2 AND payment_status = 'paid'
      GROUP BY payment_method
      ORDER BY total DESC
    `, [from.toISOString(), to.toISOString()]);

    // Top products
    const topProducts = await db.query(`
      SELECT 
        ii.name,
        SUM(ii.qty) AS qty_sold,
        COALESCE(SUM(ii.total), 0) AS revenue
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE inv.created_at >= $1 AND inv.created_at <= $2
      GROUP BY ii.name
      ORDER BY revenue DESC
      LIMIT 10
    `, [from.toISOString(), to.toISOString()]);

    // Category sales
    const categorySales = await db.query(`
      SELECT
        COALESCE(c.name, 'Uncategorized') AS category,
        COALESCE(SUM(ii.total), 0) AS revenue,
        SUM(ii.qty) AS qty_sold
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      LEFT JOIN products p ON ii.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE inv.created_at >= $1 AND inv.created_at <= $2
      GROUP BY COALESCE(c.name, 'Uncategorized')
      ORDER BY revenue DESC
    `, [from.toISOString(), to.toISOString()]);

    const s = summary.rows[0];
    res.json({
      dateFrom,
      dateTo,
      summary: {
        totalInvoices: parseInt(s.total_invoices, 10),
        paidInvoices: parseInt(s.paid_invoices, 10),
        pendingInvoices: parseInt(s.pending_invoices, 10),
        totalRevenue: parseFloat(s.total_revenue),
        totalTax: parseFloat(s.total_tax),
        totalDiscount: parseFloat(s.total_discount),
        avgOrderValue: parseFloat(s.avg_order_value),
      },
      dailySales: dailySales.rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        total: parseFloat(r.total),
      })),
      paymentBreakdown: paymentBreakdown.rows.map(r => ({
        method: r.payment_method,
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
      topProducts: topProducts.rows.map(r => ({
        name: r.name,
        qtySold: parseInt(r.qty_sold, 10),
        revenue: parseFloat(r.revenue),
      })),
      categorySales: categorySales.rows.map(r => ({
        category: r.category,
        revenue: parseFloat(r.revenue),
        qtySold: parseInt(r.qty_sold, 10),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
