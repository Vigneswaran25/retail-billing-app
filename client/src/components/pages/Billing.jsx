import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

function Receipt({ inv, onClose, onPrint }) {
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
          <span><strong>{inv.invoiceNumber}</strong></span>
          <span>{Utils.formatDateTime(inv.createdAt)}</span>
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Customer: {inv.customerName}</div>
      </div>
      <table style={{ width: '100%', fontSize: '.8rem', margin: '8px 0' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 0' }}>Item</th>
            <th style={{ textAlign: 'center' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 0' }}>{item.name}</td>
              <td style={{ textAlign: 'center' }}>{item.qty}</td>
              <td style={{ textAlign: 'right' }}>{Utils.currency(item.price)}</td>
              <td style={{ textAlign: 'right' }}>{Utils.currency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, fontSize: '.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Subtotal</span><span>{Utils.currency(inv.subtotal)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Tax</span><span>{Utils.currency(inv.taxAmount)}</span></div>
        {inv.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Discount</span><span>-{Utils.currency(inv.discount)}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span>Total</span>
          <span style={{ color: 'var(--accent-light)' }}>{Utils.currency(inv.total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '.8rem', color: 'var(--text-secondary)' }}>
          <span>Payment</span><span>{inv.paymentMethod}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: '.75rem', color: 'var(--text-muted)' }}>Thank you for shopping with us!</div>
    </div>
  )
}

export default function Billing() {
  const { cart, setCart, posDiscount, setPosDiscount, posDiscountType, setPosDiscountType, openModal, closeModal, toast, addToCartById, settings } = useApp()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const [prods, custs, cats] = await Promise.all([
        Store.getProducts({ inStock: true }), // Only fetch in-stock products
        Store.getCustomers(),
        Store.getCategories()
      ])
      setProducts(prods)
      setCustomers(custs)
      setCategories(cats)
    } catch (err) {
      toast('Failed to load POS data: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) &&
      (!catFilter || String(p.category) === catFilter || String(p.categoryId) === catFilter)
    )
  }, [products, search, catFilter])

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const taxAmount = cart.reduce((s, c) => s + (c.price * c.qty * c.taxRate / 100), 0)
  const discountAmt = posDiscountType === '%' ? subtotal * posDiscount / 100 : posDiscount
  const total = Math.max(0, subtotal + taxAmount - discountAmt)

  const updateQty = (idx, delta) => {
    setCart(prev => {
      const updated = [...prev]
      const item = { ...updated[idx] }
      const p = products.find(prod => String(prod.id) === String(item.productId))
      item.qty += delta
      if (item.qty <= 0) { updated.splice(idx, 1); return updated }
      if (p && item.qty > p.stock) { toast('Max stock reached', 'warning'); return prev }
      updated[idx] = item
      return updated
    })
  }

  const handleAddToCart = (productId) => {
    addToCartById(productId)
  }

  const printReceipt = (inv) => {
    const s = settings || { storeName: 'RetailPro', storeAddress: '', storePhone: '', currency: '₹' }
    const printHtml = `<html><head><style>body{font-family:monospace;font-size:12px;max-width:300px;margin:0 auto;padding:10px}table{width:100%;border-collapse:collapse}td,th{padding:3px 0;text-align:left}th{border-bottom:1px solid #000}.total{font-size:16px;font-weight:bold;border-top:2px solid #000;padding-top:6px}.right{text-align:right}.center{text-align:center}hr{border:none;border-top:1px dashed #000}</style></head><body>
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
    w.document.write(printHtml)
    w.document.close()
  }

  const showReceipt = (inv) => {
    openModal(
      'Receipt — ' + inv.invoiceNumber,
      <Receipt inv={inv} />,
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => printReceipt(inv)}>
          <i className="fas fa-print" /> Print
        </button>
        <button className="btn btn-primary" onClick={() => { closeModal(); refresh() }}>
          <i className="fas fa-check" /> Done
        </button>
      </div>
    )
  }

  const completeSale = async () => {
    if (cart.length === 0) { toast('Cart is empty', 'error'); return }
    const custEl = document.getElementById('pos-customer')
    const payEl = document.getElementById('pos-payment')
    const custId = custEl?.value || ''
    const cust = custId ? customers.find(c => String(c.id) === String(custId)) : null
    
    try {
      const inv = await Store.addInvoice({
        customerId: custId,
        customerName: cust ? cust.name : 'Walk-in Customer',
        items: cart.map(c => ({ productId: c.productId, name: c.name, price: c.price, qty: c.qty, taxRate: c.taxRate, total: c.price * c.qty })),
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        discount: Math.round(discountAmt * 100) / 100,
        discountType: posDiscountType,
        total: Math.round(total * 100) / 100,
        paymentMethod: payEl?.value || 'Cash',
        paymentStatus: 'paid',
        notes: ''
      })
      setCart([])
      setPosDiscount(0)
      setPosDiscountType('%')
      toast('Sale completed! Invoice: ' + inv.invoiceNumber, 'success')
      showReceipt(inv)
    } catch (err) {
      toast('Failed to process sale: ' + err.message, 'error')
    }
  }

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
    </div>
  )

  const s = settings || { paymentMethods: ['Cash', 'Card', 'UPI'] }

  return (
    <div className="pos-layout">
      {/* Product Grid */}
      <div className="pos-products">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            className="table-search"
            style={{ flex: 1, minWidth: 200 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={{ height: 40 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="pos-product-grid">
          {filteredProducts.length > 0 ? filteredProducts.map(p => (
            <div key={p.id} className="pos-product-card" onClick={() => handleAddToCart(p.id)}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.2rem', color: 'var(--accent-light)' }}>
                <i className="fas fa-box" />
              </div>
              <div className="product-name">{p.name}</div>
              <div className="product-price">{Utils.currency(p.price)}</div>
              <div className="product-stock">Stock: {p.stock}</div>
            </div>
          )) : (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <i className="fas fa-search" />
              <h3>No products found</h3>
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="pos-cart">
        <div className="pos-cart-header">
          <span><i className="fas fa-shopping-cart" style={{ marginRight: 8 }} />Cart ({cart.reduce((s, c) => s + c.qty, 0)} items)</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setCart([])}>
            <i className="fas fa-trash" /> Clear
          </button>
        </div>

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <i className="fas fa-shopping-basket" />
              <p>Cart is empty</p>
              <p style={{ fontSize: '.8rem' }}>Click products to add</p>
            </div>
          ) : cart.map((c, idx) => (
            <div key={idx} className="cart-item">
              <div className="cart-item-info">
                <div className="cart-item-name">{c.name}</div>
                <div className="cart-item-price">{Utils.currency(c.price)} × {c.qty}</div>
              </div>
              <div className="cart-item-qty">
                <button onClick={() => updateQty(idx, -1)}><i className="fas fa-minus" /></button>
                <span>{c.qty}</span>
                <button onClick={() => updateQty(idx, 1)}><i className="fas fa-plus" /></button>
              </div>
              <div className="cart-item-total">{Utils.currency(c.price * c.qty)}</div>
              <div className="cart-item-remove" onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}>
                <i className="fas fa-times" />
              </div>
            </div>
          ))}
        </div>

        <div className="pos-cart-footer">
          <div className="cart-summary-row"><span>Subtotal</span><span>{Utils.currency(subtotal)}</span></div>
          <div className="cart-discount-row">
            <input
              type="number"
              placeholder="Discount"
              value={posDiscount}
              min={0}
              onChange={e => setPosDiscount(parseFloat(e.target.value) || 0)}
            />
            <select value={posDiscountType} onChange={e => setPosDiscountType(e.target.value)}>
              <option value="%">%</option>
              <option value="flat">{s.currency}</option>
            </select>
          </div>
          <div className="cart-summary-row"><span>Tax</span><span>{Utils.currency(taxAmount)}</span></div>
          <div className="cart-summary-row"><span>Discount</span><span>- {Utils.currency(discountAmt)}</span></div>
          <div className="cart-summary-row total"><span>Total</span><span>{Utils.currency(total)}</span></div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>Customer</label>
            <select id="pos-customer" style={{ width: '100%', marginTop: 4, height: 40 }}>
              <option value="">Walk-in Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || ''})</option>)}
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>Payment Method</label>
            <select id="pos-payment" style={{ width: '100%', marginTop: 4, height: 40 }}>
              {(s.paymentMethods || ['Cash', 'Card', 'UPI']).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            className="btn btn-primary pos-pay-btn"
            onClick={completeSale}
            disabled={cart.length === 0}
          >
            <i className="fas fa-check-circle" /> Complete Sale
          </button>
        </div>
      </div>
    </div>
  )
}
