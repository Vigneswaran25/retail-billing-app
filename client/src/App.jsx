import { useRef } from 'react'
import { useApp } from './context/AppContext.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import TopBar from './components/layout/TopBar.jsx'
import Modal from './components/layout/Modal.jsx'
import Toast from './components/ui/Toast.jsx'
import Dashboard from './components/pages/Dashboard.jsx'
import Billing from './components/pages/Billing.jsx'
import Products from './components/pages/Products.jsx'
import Categories from './components/pages/Categories.jsx'
import Inventory from './components/pages/Inventory.jsx'
import Invoices from './components/pages/Invoices.jsx'
import Customers from './components/pages/Customers.jsx'
import Reports from './components/pages/Reports.jsx'
import Settings from './components/pages/Settings.jsx'

import Login from './components/pages/Login.jsx'

const PAGE_TITLES = {
  dashboard: 'Dashboard', billing: 'POS / Billing', products: 'Products',
  categories: 'Categories', inventory: 'Inventory', invoices: 'Invoices',
  customers: 'Customers', reports: 'Reports', settings: 'Settings'
}

const PAGE_MAP = {
  dashboard: Dashboard, billing: Billing, products: Products,
  categories: Categories, inventory: Inventory, invoices: Invoices,
  customers: Customers, reports: Reports, settings: Settings
}

export default function App() {
  const { currentPage, csvInputRef, backupRestoreInputRef, logoInputRef, user, setUser } = useApp()
  const PageComponent = PAGE_MAP[currentPage] || Dashboard

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <div className="app-container">
      {/* Hidden file inputs — managed by refs from context */}
      <input type="file" ref={csvInputRef} accept=".csv" style={{ display: 'none' }} />
      <input type="file" ref={backupRestoreInputRef} accept=".json" style={{ display: 'none' }} />
      <input type="file" ref={logoInputRef} accept="image/*" style={{ display: 'none' }} />

      <Sidebar />

      <main className="main-content">
        <TopBar title={PAGE_TITLES[currentPage] || currentPage} />
        <div className="page-content">
          <PageComponent key={currentPage} />
        </div>
      </main>

      <Modal />
      <Toast />
      <div id="print-area" className="print-area" />
    </div>
  )
}
