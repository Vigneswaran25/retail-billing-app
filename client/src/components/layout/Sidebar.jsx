import { useApp } from '../../context/AppContext.jsx'

const NAV_ITEMS = [
  { section: 'MAIN' },
  { page: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { page: 'billing', icon: 'fa-calculator', label: 'POS / Billing' },
  { section: 'MANAGEMENT' },
  { page: 'products', icon: 'fa-box', label: 'Products' },
  { page: 'categories', icon: 'fa-tags', label: 'Categories' },
  { page: 'inventory', icon: 'fa-warehouse', label: 'Inventory' },
  { section: 'RECORDS' },
  { page: 'invoices', icon: 'fa-file-invoice', label: 'Invoices' },
  { page: 'customers', icon: 'fa-users', label: 'Customers' },
  { section: 'ANALYTICS' },
  { page: 'reports', icon: 'fa-chart-bar', label: 'Reports' },
  { page: 'settings', icon: 'fa-cog', label: 'Settings' },
]

export default function Sidebar() {
  const { currentPage, navigate, sidebarCollapsed, setSidebarCollapsed, sidebarMobileOpen, storeName } = useApp()

  return (
    <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}${sidebarMobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon"><i className="fas fa-bolt" /></div>
          <span className="logo-text">RetailPro</span>
        </div>
        <button
          className="sidebar-toggle"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarCollapsed(c => !c)}
        >
          <i className="fas fa-chevron-left" />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {
          if (item.section) {
            return <div key={idx} className="nav-section-label">{item.section}</div>
          }
          return (
            <a
              key={item.page}
              href="#"
              className={`nav-item${currentPage === item.page ? ' active' : ''}`}
              onClick={e => { e.preventDefault(); navigate(item.page) }}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="store-badge">
          <i className="fas fa-store" />
          <span>{storeName}</span>
        </div>
      </div>
    </aside>
  )
}
