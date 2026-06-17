'use strict';

const router = require('express').Router();
const db = require('../db');

// ── GET /api/dashboard ────────────────────────────────────────────────────────
// Returns KPI summary: today's sales, total revenue, products count, customers count,
// last 7 days sales chart data, top 5 products, recent transactions, low stock alerts
router.get('/', async (req, res, next) => {
  try {
    // Today's sales
    const todaySales = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total_sales, COUNT(*) AS transaction_count
      FROM invoices
      WHERE created_at::date = CURRENT_DATE
    `);

    // Total revenue (paid invoices only)
    const totalRevenue = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total_revenue, COUNT(*) AS invoice_count
      FROM invoices
      WHERE payment_status = 'paid'
    `);

    // Products count + low stock
    const productsData = await db.query(`
      SELECT COUNT(*) AS total, 
             COUNT(*) FILTER (WHERE stock <= min_stock) AS low_stock
      FROM products
    `);

    // Customers count
    const customersData = await db.query('SELECT COUNT(*) AS total FROM customers');

    // Last 7 days sales chart
    const sevenDaysSales = await db.query(`
      SELECT 
        DATE(created_at) AS date,
        COALESCE(SUM(total), 0) AS total
      FROM invoices
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND payment_status = 'paid'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Build complete 7-day array (fill gaps with 0)
    const salesByDate = {};
    sevenDaysSales.rows.forEach(r => {
      salesByDate[r.date.toISOString().split('T')[0]] = parseFloat(r.total);
    });

    const salesLabels = [];
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      salesLabels.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }));
      salesData.push(salesByDate[key] || 0);
    }

    // Top 5 products by revenue
    const topProducts = await db.query(`
      SELECT ii.name, 
             SUM(ii.total) AS revenue,
             SUM(ii.qty) AS qty_sold
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE inv.payment_status = 'paid'
      GROUP BY ii.name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    // Recent 10 transactions
    const recentTransactions = await db.query(`
      SELECT id, invoice_number, customer_name, total, payment_method, payment_status, created_at
      FROM invoices
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Low stock alerts
    const lowStockAlerts = await db.query(`
      SELECT id, name, stock, min_stock
      FROM products
      WHERE stock <= min_stock
      ORDER BY stock ASC
      LIMIT 20
    `);

    res.json({
      todaySales: parseFloat(todaySales.rows[0].total_sales),
      todayTransactions: parseInt(todaySales.rows[0].transaction_count, 10),
      totalRevenue: parseFloat(totalRevenue.rows[0].total_revenue),
      totalInvoices: parseInt(totalRevenue.rows[0].invoice_count, 10),
      totalProducts: parseInt(productsData.rows[0].total, 10),
      lowStockCount: parseInt(productsData.rows[0].low_stock, 10),
      totalCustomers: parseInt(customersData.rows[0].total, 10),
      chart: { labels: salesLabels, data: salesData },
      topProducts: topProducts.rows.map(r => ({
        name: r.name,
        revenue: parseFloat(r.revenue),
        qtySold: parseInt(r.qty_sold, 10),
      })),
      recentTransactions: recentTransactions.rows.map(r => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        customerName: r.customer_name || 'Walk-in Customer',
        total: parseFloat(r.total),
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        createdAt: r.created_at,
      })),
      lowStockAlerts: lowStockAlerts.rows.map(r => ({
        id: r.id,
        name: r.name,
        stock: r.stock,
        minStock: r.min_stock,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
