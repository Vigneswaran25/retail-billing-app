import { useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

export default function Reports() {
  const { toast } = useApp()
  const today = new Date()
  const thirtyAgo = new Date(); thirtyAgo.setDate(today.getDate() - 30)

  const [dateFrom, setDateFrom] = useState(thirtyAgo.toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    try {
      const data = await Store.getReport(dateFrom, dateTo)
      setReportData(data)
    } catch (err) {
      toast('Failed to load report: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    try {
      // Just fetch the invoices for that date range to export the raw data
      const invoices = await Store.getInvoices({ dateFrom, dateTo })
      let csv = 'Invoice,Customer,Items,Subtotal,Tax,Discount,Total,Payment,Status,Date\n'
      invoices.forEach(i => { csv += `${i.invoiceNumber},"${i.customerName}",${i.items.length},${i.subtotal},${i.taxAmount},${i.discount || 0},${i.total},${i.paymentMethod},${i.paymentStatus},${i.createdAt}\n` })
      Utils.downloadFile(csv, 'sales_report.csv', 'text/csv')
      toast('Report exported', 'info')
    } catch (err) {
      toast('Failed to export: ' + err.message, 'error')
    }
  }

  const gridColor = 'rgba(45,51,72,0.5)'
  const tickColor = '#8b8fa3'

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
      <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Generating report...</p>
    </div>
  )

  return (
    <>
      <div className="report-filters">
        <input type="date" style={{ height: 40 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" style={{ height: 40 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn btn-primary" onClick={generateReport}><i className="fas fa-chart-bar" /> Generate Report</button>
        <button className="btn btn-secondary" onClick={exportReport}><i className="fas fa-download" /> Export CSV</button>
      </div>

      {!reportData ? (
        <div className="empty-state">
          <i className="fas fa-chart-bar" />
          <h3>Select a date range and click Generate Report</h3>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card purple"><div className="kpi-icon"><i className="fas fa-wallet" /></div><div className="kpi-label">Total Revenue</div><div className="kpi-value">{Utils.currency(reportData.summary.totalRevenue)}</div></div>
            <div className="kpi-card green"><div className="kpi-icon"><i className="fas fa-receipt" /></div><div className="kpi-label">Total Invoices</div><div className="kpi-value">{reportData.summary.totalInvoices}</div><div className="kpi-change up">{reportData.summary.paidInvoices} paid</div></div>
            <div className="kpi-card orange"><div className="kpi-icon"><i className="fas fa-calculator" /></div><div className="kpi-label">Avg Order Value</div><div className="kpi-value">{Utils.currency(reportData.summary.avgOrderValue)}</div></div>
            <div className="kpi-card blue"><div className="kpi-icon"><i className="fas fa-percent" /></div><div className="kpi-label">Tax Collected</div><div className="kpi-value">{Utils.currency(reportData.summary.totalTax)}</div></div>
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="card-header"><h3>Daily Sales</h3></div>
              <div className="chart-container">
                {reportData.dailySales.length > 0 ? (
                  <Bar
                    data={{
                      labels: reportData.dailySales.map(d => d.date),
                      datasets: [{
                        label: 'Sales', data: reportData.dailySales.map(d => d.total),
                        backgroundColor: 'rgba(108,92,231,0.6)', borderColor: '#6c5ce7',
                        borderWidth: 1, borderRadius: 6
                      }]
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { color: gridColor }, ticks: { color: tickColor, maxRotation: 45 } },
                        y: { grid: { color: gridColor }, ticks: { color: tickColor } }
                      }
                    }}
                  />
                ) : <div className="empty-state"><i className="fas fa-chart-bar" /><h3>No data</h3></div>}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Payment Methods</h3></div>
              <div className="chart-container">
                {reportData.paymentBreakdown.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: reportData.paymentBreakdown.map(p => p.method),
                      datasets: [{ data: reportData.paymentBreakdown.map(p => p.total), backgroundColor: ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff'] }]
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { color: tickColor, boxWidth: 12, padding: 10 } } }
                    }}
                  />
                ) : <div className="empty-state"><i className="fas fa-chart-pie" /><h3>No data</h3></div>}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3>Top Selling Products</h3></div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {reportData.topProducts.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No data</td></tr>
                  ) : reportData.topProducts.map((data, i) => (
                    <tr key={data.name}>
                      <td>{i + 1}</td>
                      <td><strong>{data.name}</strong></td>
                      <td>{data.qtySold}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>{Utils.currency(data.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
