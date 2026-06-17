import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

function ProductForm({ editId, categories, onSave, onClose }) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(!!editId)

  useEffect(() => {
    if (editId) {
      Store.getProduct(editId).then(p => { setProduct(p); setLoading(false) }).catch(() => setLoading(false))
    }
  }, [editId])

  const p = product || {}
  const [form, setForm] = useState({
    name: '', sku: '', category: '', unit: 'piece', price: '', costPrice: '',
    taxRate: 0, stock: 0, minStock: 5, barcode: '', description: ''
  })

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '', sku: product.sku || '', category: product.category || '',
        unit: product.unit || 'piece', price: product.price || '', costPrice: product.costPrice || '',
        taxRate: product.taxRate ?? 0, stock: product.stock ?? 0, minStock: product.minStock ?? 5,
        barcode: product.barcode || '', description: product.description || ''
      })
    }
  }, [product])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name) { onSave(null, 'Product name is required'); return }
    if (!form.price || parseFloat(form.price) <= 0) { onSave(null, 'Valid price is required'); return }
    const data = {
      name: form.name, sku: form.sku, category: form.category, unit: form.unit || 'piece',
      price: parseFloat(form.price), costPrice: parseFloat(form.costPrice) || 0,
      taxRate: parseFloat(form.taxRate) || 0, stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 5, barcode: form.barcode, description: form.description
    }
    onSave(data)
  }

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}><i className="fas fa-spinner fa-spin" /></div>

  return (
    <>
      <div className="form-grid">
        {[
          ['Product Name *', 'name', 'text'], ['SKU', 'sku', 'text'],
          ['Unit', 'unit', 'text'], ['Selling Price *', 'price', 'number'],
          ['Cost Price', 'costPrice', 'number'], ['Tax Rate (%)', 'taxRate', 'number'],
          ['Stock', 'stock', 'number'], ['Min Stock Alert', 'minStock', 'number'],
          ['Barcode', 'barcode', 'text'],
        ].map(([label, key, type]) => (
          <div className="form-group" key={key}>
            <label>{label}</label>
            <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div className="form-group">
          <label>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group full-width">
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Add'} Product</button>
      </div>
    </>
  )
}

function BulkUpload({ categories, onClose, onImport }) {
  const [csvData, setCsvData] = useState([])
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const catNames = categories.map(c => c.name).join(', ')

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = Utils.parseCSV(ev.target.result)
      setCsvData(rows)
      setPreview(rows)
    }
    reader.readAsText(file)
  }

  const handleDrop = e => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const cols = preview && preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <>
      <div
        className="bulk-upload-zone"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <i className="fas fa-cloud-upload-alt" />
        <p><strong>Click to upload CSV file</strong></p>
        <p className="upload-hint">or drag and drop your file here</p>
        <p className="upload-hint" style={{ marginTop: 12 }}>Required: name, price<br />Optional: sku, category, costPrice, taxRate, stock, minStock, unit</p>
        <p className="upload-hint">Available categories: {catNames}</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

      {preview && preview.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8 }}>Preview</h4>
          <div className="table-wrapper">
            <table>
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}<th>Status</th></tr></thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => {
                  const valid = row.name && row.price && !isNaN(parseFloat(row.price))
                  return (
                    <tr key={i}>
                      {cols.map(c => <td key={c} style={{ fontSize: '.8rem' }}>{row[c] || ''}</td>)}
                      <td><span className={`status-badge ${valid ? 'ok' : 'low'}`}>{valid ? 'Valid' : 'Invalid'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>{preview.length} products found</span>
            <button className="btn btn-success" onClick={() => onImport(csvData)}>
              <i className="fas fa-check" /> Import All
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function Products() {
  const { openModal, closeModal, toast } = useApp()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const catMap = Object.fromEntries(categories.map(c => [String(c.id), c.name]))

  const refresh = async () => {
    try {
      const [prods, cats] = await Promise.all([Store.getProducts(), Store.getCategories()])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      toast('Failed to load products: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) &&
      (!catFilter || String(p.categoryId) === catFilter || p.category === catFilter)
    )
  }, [products, search, catFilter])

  const showProductForm = (editId = null) => {
    openModal(
      editId ? 'Edit Product' : 'Add Product',
      <ProductForm
        editId={editId}
        categories={categories}
        onSave={async (data, errMsg) => {
          if (!data) { toast(errMsg, 'error'); return }
          try {
            if (editId) { await Store.updateProduct(editId, data); toast('Product updated') }
            else { await Store.addProduct(data); toast('Product added') }
            closeModal(); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
        onClose={closeModal}
      />
    )
  }

  const deleteProduct = (id) => {
    const p = products.find(x => String(x.id) === String(id))
    openModal(
      'Delete Product',
      <p>Are you sure you want to delete <strong>{p?.name}</strong>?<br />
        <span style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>This action cannot be undone.</span>
      </p>,
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button className="btn btn-danger" onClick={async () => {
          try {
            await Store.deleteProduct(id); closeModal(); toast('Product deleted'); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}>Delete</button>
      </div>
    )
  }

  const downloadTemplate = () => {
    const csv = 'name,sku,category,price,costPrice,taxRate,stock,minStock,unit,barcode,description\n"Example Product","SKU001","Groceries",100,80,5,50,10,"piece","","Sample product"'
    Utils.downloadFile(csv, 'product_template.csv', 'text/csv')
    toast('Template downloaded', 'info')
  }

  const bulkUpload = () => {
    openModal(
      'Bulk Upload Products',
      <BulkUpload
        categories={categories}
        onClose={closeModal}
        onImport={async (rows) => {
          try {
            const result = await Store.bulkAddProducts(rows)
            closeModal()
            toast(result.message, result.added > 0 ? 'success' : 'warning')
            refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
      />,
      null, true
    )
  }

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
      <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading products...</p>
    </div>
  )

  return (
    <div className="card">
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <input type="text" placeholder="Search products..." className="table-search" value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ height: 40 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
        <div className="data-toolbar-right">
          <button className="btn btn-secondary" onClick={bulkUpload}><i className="fas fa-file-csv" /> Bulk Upload</button>
          <button className="btn btn-secondary" onClick={downloadTemplate}><i className="fas fa-download" /> CSV Template</button>
          <button className="btn btn-primary" onClick={() => showProductForm()}><i className="fas fa-plus" /> Add Product</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>SKU</th><th>Product Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Tax %</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No products found</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{p.sku || '-'}</td>
                <td><strong>{p.name}</strong></td>
                <td><span className="category-tag">{p.categoryName || catMap[p.category] || 'Uncategorized'}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>{Utils.currency(p.price)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{Utils.currency(p.costPrice || 0)}</td>
                <td><span className={`status-badge ${p.stock <= (p.minStock || 5) ? 'low' : 'ok'}`}>{p.stock}</span></td>
                <td>{p.taxRate || 0}%</td>
                <td>
                  <button className="btn-icon" onClick={() => showProductForm(p.id)} title="Edit"><i className="fas fa-edit" /></button>{' '}
                  <button className="btn-icon" onClick={() => deleteProduct(p.id)} title="Delete"><i className="fas fa-trash" style={{ color: 'var(--danger)' }} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '.8rem' }}>Showing {filtered.length} of {products.length} products</div>
    </div>
  )
}
