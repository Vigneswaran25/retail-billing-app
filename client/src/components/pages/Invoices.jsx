import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

function ReceiptView({ inv }) {
  const { settings } = useApp()
  const s = settings || { storeName: 'RetailPro', storeAddress: '', storePhone: '', storeEmail: '', currency: '₹' }
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem' }}>{s.storeName}</h2>
        <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{s.storeAddress}</p>
        <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{s.storePhone} | {s.storeEmail}</p>
        {s.storeGST && <p style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>GST: {s.storeGST}</p>}
      </div>
      <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '8px 0', margin: '8px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
          <span><strong>{inv.invoiceNumber}</strong></span><span>{Utils.formatDateTime(inv.createdAt)}</span>
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Customer: {inv.customerName}</div>
      </div>
      <table style={{ width: '100%', fontSize: '.8rem', margin: '8px 0' }}>
        <thead><tr><th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
        <tbody>
          {inv.items.map((item, i) => (
            <tr key={i}><td style={{ padding: '4px 0' }}>{item.name}</td><td style={{ textAlign: 'center' }}>{item.qty}</td><td style={{ textAlign: 'right' }}>{Utils.currency(item.price)}</td><td style={{ textAlign: 'right' }}>{Utils.currency(item.total)}</td></tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, fontSize: '.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Subtotal</span><span>{Utils.currency(inv.subtotal)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Tax</span><span>{Utils.currency(inv.taxAmount)}</span></div>
        {inv.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Discount</span><span>-{Utils.currency(inv.discount)}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span>Total</span><span style={{ color: 'var(--accent-light)' }}>{Utils.currency(inv.total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '.8rem', color: 'var(--text-secondary)' }}><span>Payment</span><span>{inv.paymentMethod}</span></div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: '.75rem', color: 'var(--text-muted)' }}>Thank you for shopping with us!</div>
    </div>
  )
}

export default function Invoices() {
  const { openModal, closeModal, toast, settings } = useApp()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const refresh = async () => {
    try {
      const data = await Store.getInvoices()
      setInvoices(data)
    } catch (err) {
      toast('Failed to load invoices: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    return invoices.slice().reverse().filter(inv => {
      const q = search.toLowerCase().trim()
      const matchQ = !q || inv.invoiceNumber.toLowerCase().includes(q) || (inv.customerName || '').toLowerCase().includes(q)
      const matchStatus = !statusFilter || inv.paymentStatus === statusFilter
      const d = new Date(inv.createdAt)
      const from = dateFrom ? new Date(dateFrom) : null
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null
      const matchDate = (!from || d >= from) && (!to || d <= to)
      return matchQ && matchStatus && matchDate
    })
  }, [invoices, search, statusFilter, dateFrom, dateTo])

  const printReceipt = (inv) => {
    const s = settings || { storeName: 'RetailPro', storeAddress: '', storePhone: '', currency: '₹' }
    const html = `<html><head><style>body{font-family:monospace;font-size:12px;max-width:300px;margin:0 auto;padding:10px}table{width:100%;border-collapse:collapse}td,th{padding:3px 0;text-align:left}th{border-bottom:1px solid #000}.total{font-size:16px;font-weight:bold;border-top:2px solid #000;padding-top:6px}.right{text-align:right}.center{text-align:center}hr{border:none;border-top:1px dashed #000}</style></head><body>
      <div class="center"><strong>${s.storeName}</strong><br>${s.storeAddress}<br>${s.storePhone}</div><hr>
      <div>${inv.invoiceNumber} | ${Utils.formatDateTime(inv.createdAt)}<br>Customer: ${inv.customerName}</div><hr>
      <table><tr><th>Item</th><th class="right">Qty</th><th class="right">Amt</th></tr>${inv.items.map(i => `<tr><td>${i.name}</td><td class="right">${i.qty}</td><td class="right">${i.total.toFixed(2)}</td></tr>`).join('')}</table><hr>
      <div>Subtotal: <span style="float:right">${inv.subtotal.toFixed(2)}</span></div>
      <div>Tax: <span style="float:right">${inv.taxAmount.toFixed(2)}</span></div>
      ${inv.discount > 0 ? `<div>Discount: <span style="float:right">-${inv.discount.toFixed(2)}</span></div>` : ''}
      <div class="total">TOTAL: <span style="float:right">${s.currency} ${inv.total.toFixed(2)}</span></div>
      <div>Payment: ${inv.paymentMethod}</div><hr><div class="center">Thank you!</div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=350,height=500')
    w.document.write(html); w.document.close()
  }

  const viewInvoice = (inv) => {
    openModal(
      'Receipt — ' + inv.invoiceNumber,
      <ReceiptView inv={inv} />,
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => printReceipt(inv)}><i className="fas fa-print" /> Print</button>
        <button className="btn btn-primary" onClick={closeModal}><i className="fas fa-check" /> Done</button>
      </div>
    )
  }

  const changeStatus = (inv) => {
    let sel = inv.paymentStatus
    openModal(
      'Change Status — ' + inv.invoiceNumber,
      <div className="form-group">
        <label>Status</label>
        <select defaultValue={inv.paymentStatus} onChange={e => { sel = e.target.value }}>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>,
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button className="btn btn-primary" onClick={async () => {
          try {
            await Store.updateInvoice(inv.id, { paymentStatus: sel })
            closeModal(); toast('Status updated'); refresh()
          } catch (err) { toast(err.message, 'error') }
        }}>Save</button>
      </div>
    )
  }

  const exportInvoices = () => {
    let csv = 'InvoiceNumber,Customer,Subtotal,Tax,Discount,Total,PaymentMethod,Status,Date\n'
    invoices.forEach(i => { csv += `${i.invoiceNumber},"${i.customerName || 'Walk-in'}",${i.subtotal},${i.taxAmount},${i.discount || 0},${i.total},${i.paymentMethod},${i.paymentStatus},${i.createdAt}\n` })
    Utils.downloadFile(csv, 'invoices_export.csv', 'text/csv')
    toast('Invoices exported', 'info')
  }

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
    </div>
  )

  return (
    <div className="card">
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <input type="text" placeholder="Search invoices..." className="table-search" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ height: 40 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" style={{ height: 40 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
          <input type="date" style={{ height: 40 }} value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
        </div>
        <div className="data-toolbar-right">
          <button className="btn btn-secondary" onClick={exportInvoices}><i className="fas fa-download" /> Export</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Invoice #</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No invoices found</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id}>
                <td style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                <td>{inv.customerName || 'Walk-in'}</td>
                <td>{(inv.items || []).length}</td>
                <td>{Utils.currency(inv.subtotal)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{Utils.currency(inv.taxAmount)}</td>
                <td style={{ fontWeight: 700 }}>{Utils.currency(inv.total)}</td>
                <td>{inv.paymentMethod}</td>
                <td><span className={`status-badge ${inv.paymentStatus}`}>{inv.paymentStatus}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>{Utils.formatDateTime(inv.createdAt)}</td>
                <td>
                  <button className="btn-icon" onClick={() => viewInvoice(inv)} title="View"><i className="fas fa-eye" /></button>{' '}
                  <button className="btn-icon" onClick={() => printReceipt(inv)} title="Print"><i className="fas fa-print" /></button>{' '}
                  <button className="btn-icon" onClick={() => changeStatus(inv)} title="Change Status"><i className="fas fa-exchange-alt" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '.8rem' }}>Total: {filtered.length} invoices</div>
    </div>
  )
}
