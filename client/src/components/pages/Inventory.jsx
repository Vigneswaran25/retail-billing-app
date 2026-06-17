import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

function AdjustStockForm({ product, onSave, onClose }) {
  const [type, setType] = useState('set')
  const [qty, setQty] = useState(0)
  const [reason, setReason] = useState('')

  const handleSave = () => {
    onSave(type, qty, reason)
  }

  return (
    <>
      <div className="form-grid">
        <div className="form-group">
          <label>Current Stock</label>
          <input type="text" value={product.stock} disabled />
        </div>
        <div className="form-group">
          <label>Adjustment Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="set">Set to</option>
            <option value="add">Add</option>
            <option value="subtract">Subtract</option>
          </select>
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input type="number" value={qty} min={0} onChange={e => setQty(parseInt(e.target.value) || 0)} />
        </div>
        <div className="form-group">
          <label>Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. New shipment, Damaged..." />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>Save</button>
      </div>
    </>
  )
}

export default function Inventory() {
  const { openModal, closeModal, toast } = useApp()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const refresh = async () => {
    try {
      const data = await Store.getInventory()
      setProducts(data)
    } catch (err) {
      toast('Failed to load inventory: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const totalValue = products.reduce((s, p) => s + (p.price * (p.stock || 0)), 0)
  const totalCost = products.reduce((s, p) => s + ((p.costPrice || 0) * (p.stock || 0)), 0)
  const lowStock = products.filter(p => p.stock <= (p.minStock || 5))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p => {
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
      const matchF = filter === 'all' ||
        (filter === 'low' && p.stock <= (p.minStock || 5) && p.stock > 0) ||
        (filter === 'out' && p.stock <= 0)
      return matchQ && matchF
    })
  }, [products, search, filter])

  const adjustStock = (p) => {
    openModal(
      'Adjust Stock — ' + p.name,
      <AdjustStockForm
        product={p}
        onSave={async (type, qty, reason) => {
          try {
            await Store.adjustStock(p.id, { type, qty, reason })
            closeModal(); toast('Stock updated'); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
        onClose={closeModal}
      />
    )
  }

  const exportInventory = () => {
    let csv = 'SKU,Name,Category,Stock,MinStock,Price,CostPrice,Value\n'
    products.forEach(p => { csv += `"${p.sku || ''}","${p.name}","${p.categoryName || ''}",${p.stock},${p.minStock || 5},${p.price},${p.costPrice || 0},${p.price * p.stock}\n` })
    Utils.downloadFile(csv, 'inventory_export.csv', 'text/csv')
    toast('Inventory exported', 'info')
  }

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
    </div>
  )

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card purple"><div className="kpi-icon"><i className="fas fa-boxes" /></div><div className="kpi-label">Total Products</div><div className="kpi-value">{products.length}</div></div>
        <div className="kpi-card green"><div className="kpi-icon"><i className="fas fa-rupee-sign" /></div><div className="kpi-label">Stock Value (Retail)</div><div className="kpi-value">{Utils.currency(totalValue)}</div></div>
        <div className="kpi-card blue"><div className="kpi-icon"><i className="fas fa-tags" /></div><div className="kpi-label">Stock Value (Cost)</div><div className="kpi-value">{Utils.currency(totalCost)}</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><i className="fas fa-exclamation-triangle" /></div><div className="kpi-label">Low Stock Items</div><div className="kpi-value">{lowStock.length}</div></div>
      </div>

      <div className="card">
        <div className="data-toolbar">
          <div className="data-toolbar-left">
            <input type="text" placeholder="Search..." className="table-search" value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ height: 40 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          <div className="data-toolbar-right">
            <button className="btn btn-secondary" onClick={exportInventory}><i className="fas fa-download" /> Export</button>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Status</th><th>Value</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{p.sku || '-'}</td>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="category-tag">{p.categoryName || '-'}</span></td>
                  <td style={{ fontWeight: 700 }}>{p.stock}</td>
                  <td>{p.minStock || 5}</td>
                  <td>
                    <span className={`status-badge ${p.stock <= 0 ? 'cancelled' : p.stock <= (p.minStock || 5) ? 'low' : 'ok'}`}>
                      {p.stock <= 0 ? 'Out of Stock' : p.stock <= (p.minStock || 5) ? 'Low' : 'In Stock'}
                    </span>
                  </td>
                  <td>{Utils.currency(p.price * (p.stock || 0))}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => adjustStock(p)}>
                      <i className="fas fa-edit" /> Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
