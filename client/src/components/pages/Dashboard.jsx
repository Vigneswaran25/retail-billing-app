import { useEffect, useState } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import Store, { Utils } from '../../store/store.js'
import { useApp } from '../../context/AppContext.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

export default function Dashboard() {
  const { navigate } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Store.getDashboard()
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="empty-state">
      <i className="fas fa-spinner fa-spin" />
      <h3>Loading dashboard...</h3>
    </div>
  )

  if (error) return (
    <div className="empty-state">
      <i className="fas fa-exclamation-triangle" style={{ color: 'var(--danger)' }} />
      <h3>Failed to load dashboard</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>{error}</p>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>
        <i className="fas fa-redo" /> Retry
      </button>
    </div>
  )

  const { chart, topProducts, recentTransactions, lowStockAlerts } = data

  const chartDefaults = { responsive: true, maintainAspectRatio: false }
  const gridColor = 'rgba(45,51,72,0.5)'
  const tickColor = '#8b8fa3'

  const salesChartData = {
    labels: chart.labels,
    datasets: [{
      label: 'Sales', data: chart.data, borderColor: '#6c5ce7',
      backgroundColor: 'rgba(108,92,231,0.1)', fill: true, tension: 0.4,
      pointBackgroundColor: '#6c5ce7', pointRadius: 4
    }]
  }

  const topProdData = topProducts.length > 0 ? {
    labels: topProducts.map(p => p.name),
    datasets: [{
      data: topProducts.map(p => p.revenue),
      backgroundColor: ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff']
    }]
  } : null

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card purple">
          <div className="kpi-icon"><i className="fas fa-receipt" /></div>
          <div className="kpi-label">Today's Sales</div>
          <div className="kpi-value">{Utils.currency(data.todaySales)}</div>
          <div className="kpi-change up"><i className="fas fa-arrow-up" />{data.todayTransactions} transactions</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><i className="fas fa-wallet" /></div>
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value">{Utils.currency(data.totalRevenue)}</div>
          <div className="kpi-change up"><i className="fas fa-chart-line" />{data.totalInvoices} total invoices</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><i className="fas fa-box" /></div>
          <div className="kpi-label">Products</div>
          <div className="kpi-value">{data.totalProducts}</div>
          <div className={`kpi-change ${data.lowStockCount ? 'down' : 'up'}`}>
            <i className={`fas fa-${data.lowStockCount ? 'exclamation-triangle' : 'check'}`} />
            {data.lowStockCount} low stock
          </div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon"><i className="fas fa-users" /></div>
          <div className="kpi-label">Customers</div>
          <div className="kpi-value">{data.totalCustomers}</div>
          <div className="kpi-change up"><i className="fas fa-user-plus" />Active customers</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><h3>Sales Overview (7 Days)</h3></div>
          <div className="chart-container">
            <Line data={salesChartData} options={{
              ...chartDefaults,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: gridColor }, ticks: { color: tickColor } },
                y: { grid: { color: gridColor }, ticks: { color: tickColor } }
              }
            }} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Top Products</h3></div>
          <div className="chart-container">
            {topProdData ? (
              <Doughnut data={topProdData} options={{
                ...chartDefaults,
                plugins: { legend: { position: 'bottom', labels: { color: tickColor, boxWidth: 12, padding: 10, font: { size: 11 } } } }
              }} />
            ) : (
              <div className="empty-state"><i className="fas fa-chart-pie" /><h3>No sales data yet</h3></div>
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><h3>Recent Transactions</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th><th>Customer</th><th>Amount</th>
                  <th>Payment</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(i => (
                  <tr key={i.id}>
                    <td style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{i.invoiceNumber}</td>
                    <td>{i.customerName || 'Walk-in'}</td>
                    <td style={{ fontWeight: 700 }}>{Utils.currency(i.total)}</td>
                    <td>{i.paymentMethod}</td>
                    <td><span className={`status-badge ${i.paymentStatus}`}>{i.paymentStatus}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{Utils.formatDateTime(i.createdAt)}</td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Low Stock Alerts</h3></div>
          {lowStockAlerts.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Product</th><th>Stock</th><th>Min</th></tr></thead>
                <tbody>
                  {lowStockAlerts.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{p.stock}</td>
                      <td>{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-check-circle" style={{ color: 'var(--success)' }} />
              <h3>All stocked up!</h3>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
