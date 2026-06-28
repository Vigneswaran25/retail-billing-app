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

const TRANSLATIONS = {
  en: {
    bill: 'TAX INVOICE',
    invoiceNo: 'Invoice No',
    date: 'Date',
    customer: 'Customer',
    walkIn: 'Walk-in Customer',
    item: 'Item',
    qty: 'Qty',
    rate: 'Rate',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    total: 'TOTAL',
    payment: 'Payment',
    thankyou: 'Thank you for shopping with us!',
    gst: 'GST',
  },
  ta: {
    bill: 'வரி விலைப்பட்டியல்',
    invoiceNo: 'விலைப்பட்டியல் எண்',
    date: 'தேதி',
    customer: 'வாடிக்கையாளர்',
    walkIn: 'நேரடி வாடிக்கையாளர்',
    item: 'பொருள்',
    qty: 'அளவு',
    rate: 'விலை',
    amount: 'தொகை',
    subtotal: 'உப மொத்தம்',
    tax: 'வரி',
    discount: 'தள்ளுபடி',
    total: 'மொத்தம்',
    payment: 'கட்டணம்',
    thankyou: 'எங்களுடன் கொள்முதல் செய்ததற்கு நன்றி!',
    gst: 'ஜிஎஸ்டி',
  }
}

export default function Billing() {
  const { cart, setCart, posDiscount, setPosDiscount, posDiscountType, setPosDiscountType, openModal, closeModal, toast, addToCartById, settings } = useApp()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [billLang, setBillLang] = useState('en')
  const [showHeld, setShowHeld] = useState(false)
  const [heldBills, setHeldBills] = useState(() => {
    try { return JSON.parse(localStorage.getItem('heldBills') || '[]') } catch { return [] }
  })

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

  const updatePrice = (idx, value) => {
    setCart(prev => {
      const updated = [...prev]
      const item = { ...updated[idx] }
      const parsed = parseFloat(value)
      item.price = isNaN(parsed) || parsed < 0 ? 0 : parsed
      updated[idx] = item
      return updated
    })
  }

  const holdBill = () => {
    if (cart.length === 0) { toast('Cart is empty — nothing to hold', 'warning'); return }
    const label = `Hold #${heldBills.length + 1} (${cart.length} item${cart.length > 1 ? 's' : ''})`
    const held = { id: Date.now(), label, cart, posDiscount, posDiscountType }
    const updated = [...heldBills, held]
    setHeldBills(updated)
    localStorage.setItem('heldBills', JSON.stringify(updated))
    setCart([])
    setPosDiscount(0)
    setPosDiscountType('%')
    setShowHeld(true)
    toast(`Bill held: ${label}`, 'success')
  }

  const resumeBill = (id) => {
    const bill = heldBills.find(h => h.id === id)
    if (!bill) return
    if (cart.length > 0 && !window.confirm('Current cart will be cleared. Resume held bill?')) return
    setCart(bill.cart)
    setPosDiscount(bill.posDiscount)
    setPosDiscountType(bill.posDiscountType)
    const updated = heldBills.filter(h => h.id !== id)
    setHeldBills(updated)
    localStorage.setItem('heldBills', JSON.stringify(updated))
    setShowHeld(false)
    toast(`Resumed: ${bill.label}`, 'success')
  }

  const deleteHeld = (id) => {
    const updated = heldBills.filter(h => h.id !== id)
    setHeldBills(updated)
    localStorage.setItem('heldBills', JSON.stringify(updated))
    toast('Held bill removed', 'info')
  }

  const handleAddToCart = (productId) => {
    addToCartById(productId)
  }

  const printReceipt = (inv) => {
    const s = settings || { storeName: 'RetailPro', storeAddress: '', storePhone: '', storeGST: '', currency: '₹' }
    const t = TRANSLATIONS[billLang]
    const isTamil = billLang === 'ta'
    const fontLink = isTamil
      ? `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil&display=swap" rel="stylesheet">`
      : ''
    const fontFamily = isTamil ? `'Noto Sans Tamil', sans-serif` : `'Segoe UI', Arial, sans-serif`
    const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">${fontLink}<style>
      @page { size: A4; margin: 18mm 20mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: ${fontFamily}; font-size: 13px; color: #111; background: #fff; }
      .header { text-align: center; margin-bottom: 14px; }
      .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
      .header p { font-size: 12px; color: #444; line-height: 1.5; }
      .bill-title { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 6px 0; margin: 12px 0; }
      .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 14px; }
      .meta div { line-height: 1.8; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      thead tr { background: #111; color: #fff; }
      thead th { padding: 7px 8px; font-size: 12px; text-align: left; }
      tbody tr:nth-child(even) { background: #f7f7f7; }
      tbody td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #e0e0e0; }
      .right { text-align: right; }
      .center { text-align: center; }
      .summary { margin-left: auto; width: 260px; margin-top: 8px; }
      .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px dashed #ccc; }
      .summary-total { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: 800; border-top: 2px solid #111; margin-top: 4px; }
      .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #555; border-top: 1px dashed #aaa; padding-top: 12px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    <div class="header">
      <h1>${s.storeName}</h1>
      <p>${s.storeAddress}<br>${s.storePhone}${s.storeEmail ? ' | ' + s.storeEmail : ''}${s.storeGST ? '<br>' + t.gst + ': ' + s.storeGST : ''}</p>
    </div>
    <div class="bill-title">${t.bill}</div>
    <div class="meta">
      <div><strong>${t.invoiceNo}:</strong> ${inv.invoiceNumber}<br><strong>${t.customer}:</strong> ${inv.customerName || t.walkIn}</div>
      <div style="text-align:right"><strong>${t.date}:</strong> ${Utils.formatDateTime(inv.createdAt)}<br><strong>${t.payment}:</strong> ${inv.paymentMethod}</div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>${t.item}</th>
        <th class="right">${t.rate}</th>
        <th class="center">${t.qty}</th>
        <th class="right">${t.amount}</th>
      </tr></thead>
      <tbody>${inv.items.map((i, idx) => `<tr>
        <td>${idx + 1}</td><td>${i.name}</td>
        <td class="right">${s.currency} ${Number(i.price).toFixed(2)}</td>
        <td class="center">${i.qty}</td>
        <td class="right">${s.currency} ${Number(i.total).toFixed(2)}</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="summary">
      <div class="summary-row"><span>${t.subtotal}</span><span>${s.currency} ${inv.subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>${t.tax}</span><span>${s.currency} ${inv.taxAmount.toFixed(2)}</span></div>
      ${inv.discount > 0 ? `<div class="summary-row"><span>${t.discount}</span><span>- ${s.currency} ${inv.discount.toFixed(2)}</span></div>` : ''}
      <div class="summary-total"><span>${t.total}</span><span>${s.currency} ${inv.total.toFixed(2)}</span></div>
    </div>
    <div class="footer">${t.thankyou}</div>
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`
    const w = window.open('', '_blank')
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
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-sm"
              title="Hold current bill"
              style={{ background: 'rgba(253,203,110,0.15)', color: '#fdcb6e', border: '1px solid rgba(253,203,110,0.3)' }}
              onClick={holdBill}
            >
              <i className="fas fa-pause-circle" /> Hold
            </button>
            {heldBills.length > 0 && (
              <button
                className="btn btn-sm"
                title="View held bills"
                style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--accent-light)', border: '1px solid rgba(108,92,231,0.3)', position: 'relative' }}
                onClick={() => setShowHeld(p => !p)}
              >
                <i className="fas fa-layer-group" />
                <span style={{ marginLeft: 4 }}>Held</span>
                <span style={{ marginLeft: 4, background: 'var(--accent)', color: '#fff', borderRadius: '50%', fontSize: '.65rem', padding: '1px 6px', fontWeight: 700 }}>{heldBills.length}</span>
              </button>
            )}
            <button className="btn btn-sm btn-secondary" onClick={() => setCart([])}>
              <i className="fas fa-trash" /> Clear
            </button>
          </div>
        </div>

        {/* Held Bills Panel */}
        {showHeld && heldBills.length > 0 && (
          <div style={{ margin: '0 0 8px 0', background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 10, padding: 10 }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Held Bills</div>
            {heldBills.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: 4, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{h.label}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{h.cart.length} item{h.cart.length > 1 ? 's' : ''} · ₹{h.cart.reduce((s, c) => s + c.price * c.qty, 0).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(0,184,148,0.15)', color: '#00b894', border: '1px solid rgba(0,184,148,0.3)', padding: '3px 10px', fontSize: '.78rem' }}
                    onClick={() => resumeBill(h.id)}
                  >
                    <i className="fas fa-play" /> Resume
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '.78rem' }}
                    onClick={() => deleteHeld(h.id)}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                <div className="cart-item-price" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Rate:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={c.price === 0 ? '' : c.price}
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => updatePrice(idx, e.target.value)}
                    onBlur={e => { if (e.target.value === '') updatePrice(idx, 0) }}
                    style={{
                      width: 70,
                      padding: '2px 6px',
                      fontSize: '.82rem',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      textAlign: 'right'
                    }}
                  />
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>× {c.qty}</span>
                </div>
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
              value={posDiscount === 0 ? '' : posDiscount}
              min={0}
              onFocus={e => e.target.select()}
              onChange={e => setPosDiscount(parseFloat(e.target.value) || 0)}
              onBlur={e => { if (e.target.value === '') setPosDiscount(0) }}
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
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
              <i className="fas fa-language" style={{ marginRight: 5 }} />Bill Language
            </label>
            <select
              value={billLang}
              onChange={e => setBillLang(e.target.value)}
              style={{ width: '100%', marginTop: 4, height: 40 }}
            >
              <option value="en">🇬🇧 English</option>
              <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
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
