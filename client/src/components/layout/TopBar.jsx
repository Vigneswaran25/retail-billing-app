import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

export default function TopBar({ title }) {
  const { navigate, setSidebarMobileOpen, addToCartById, toast } = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications, setNotifications] = useState([])
  const searchRef = useRef(null)
  const notifRef = useRef(null)

  // Compute low stock notifications
  const computeNotifs = useCallback(async () => {
    try {
      const products = await Store.getProducts()
      const lowStock = products.filter(p => (p.stock || 0) <= (p.minStock || 5))
      setNotifications(lowStock)
    } catch (err) { console.error('Failed to load notifs', err) }
  }, [])

  useEffect(() => { computeNotifs() }, [computeNotifs])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setShowResults(false); setResults([]); return }
    const t = setTimeout(async () => {
      const q = query.toLowerCase()
      try {
        const [allProds, allCusts] = await Promise.all([Store.getProducts(), Store.getCustomers()])
        const prods = allProds.filter(p =>
          p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
        ).slice(0, 8)
        const custs = allCusts.filter(c =>
          c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
        ).slice(0, 4)
        setResults([
          ...prods.map(p => ({ type: 'product', id: p.id, name: p.name, sub: Utils.currency(p.price) })),
          ...custs.map(c => ({ type: 'customer', id: c.id, name: c.name, sub: c.phone || '' }))
        ])
        setShowResults(true)
      } catch (err) { console.error('Search failed', err) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  // Close search on outside click
  useEffect(() => {
    const handler = e => { if (!searchRef.current?.contains(e.target)) setShowResults(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // Close notif panel on outside click
  useEffect(() => {
    const handler = e => { if (!notifRef.current?.contains(e.target)) setShowNotif(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleResultClick = (item) => {
    setQuery(''); setShowResults(false)
    if (item.type === 'product') {
      navigate('billing')
      addToCartById(item.id)
    } else {
      navigate('customers')
    }
  }

  const icons = { product: 'fa-box', customer: 'fa-user' }
  const colors = { product: 'var(--accent)', customer: 'var(--success)' }

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button
          className="mobile-menu-toggle"
          aria-label="Open menu"
          onClick={() => setSidebarMobileOpen(o => !o)}
        >
          <i className="fas fa-bars" />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="top-bar-right">
        {/* Global Search */}
        <div className="search-box" ref={searchRef}>
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Search products, customers..."
            autoComplete="off"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className={`search-results${showResults && results.length > 0 ? ' show' : ''}`}>
            {results.length === 0 && query && (
              <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>No results found</div>
            )}
            {results.map(item => (
              <div key={item.type + item.id} className="search-result-item" onClick={() => handleResultClick(item)}>
                <span>
                  <i className={`fas ${icons[item.type]}`} style={{ marginRight: 8, color: colors[item.type] }} />
                  {item.name}
                </span>
                <span style={{ color: 'var(--accent-light)', fontSize: '.8rem' }}>{item.sub}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="top-bar-actions">
          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              className="action-btn"
              aria-label="Notifications"
              onClick={() => { setShowNotif(v => !v); computeNotifs() }}
            >
              <i className="fas fa-bell" />
              {notifications.length > 0 && (
                <span className="badge">{notifications.length}</span>
              )}
            </button>
            {showNotif && (
              <div className="notification-panel" style={{ position: 'absolute', right: 0, top: '48px', width: 320 }}>
                <div className="notification-panel-header">
                  <h3>Notifications</h3>
                  <button className="clear-notifications-btn" onClick={() => setNotifications([])}>Clear All</button>
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
                  ) : notifications.map(p => (
                    <div key={p.id} className="notif-item">
                      <div className="notif-title">
                        <i className="fas fa-exclamation-triangle" style={{ color: 'var(--warning)', marginRight: 6 }} />
                        Low Stock Alert
                      </div>
                      <div className="notif-text">{p.name} — Only {p.stock} left (min: {p.minStock})</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Sale Button */}
          <button className="action-btn quick-sale-btn" aria-label="Quick Sale" onClick={() => navigate('billing')}>
            <i className="fas fa-plus" />
            <span>New Sale</span>
          </button>

          {/* Logout Button */}
          <button className="action-btn" aria-label="Logout" onClick={() => Store.logout()} style={{ marginLeft: 8, color: 'var(--danger)' }}>
            <i className="fas fa-sign-out-alt" />
          </button>
        </div>
      </div>
    </header>
  )
}
