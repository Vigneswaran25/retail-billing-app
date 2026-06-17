import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

function CustomerForm({ editId, initialData, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initialData?.name || '', phone: initialData?.phone || '', email: initialData?.email || '',
    address: initialData?.address || '', city: initialData?.city || '', state: initialData?.state || '',
    zip: initialData?.zip || '', gst: initialData?.gst || ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="form-grid">
        {[
          ['Name *', 'name', 'text'], ['Phone', 'phone', 'text'],
          ['Email', 'email', 'email'], ['City', 'city', 'text'],
          ['State', 'state', 'text'], ['ZIP', 'zip', 'text'],
          ['GST Number', 'gst', 'text'],
        ].map(([label, key, type]) => (
          <div className="form-group" key={key}>
            <label>{label}</label>
            <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div className="form-group full-width">
          <label>Address</label>
          <input type="text" value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>{editId ? 'Update' : 'Add'}</button>
      </div>
    </>
  )
}

function CustomerHistory({ customerId }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Store.getInvoices({ customerId }).then(invs => {
      // Filter the ones matching customer id since query params might not be fully supported by API yet
      setInvoices(invs.filter(i => String(i.customerId) === String(customerId)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [customerId])

  const total = invoices.reduce((s, i) => s + i.total, 0)
  
  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}><i className="fas fa-spinner fa-spin" /></div>

  return (
    <div>
      <div style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
        Total Purchases: <strong>{invoices.length}</strong> | Total Spent: <strong style={{ color: 'var(--accent-light)' }}>{Utils.currency(total)}</strong>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No purchases yet</td></tr>
            ) : invoices.map(i => (
              <tr key={i.id}>
                <td style={{ color: 'var(--accent-light)' }}>{i.invoiceNumber}</td>
                <td>{Utils.formatDate(i.createdAt)}</td>
                <td>{i.items.length}</td>
                <td style={{ fontWeight: 700 }}>{Utils.currency(i.total)}</td>
                <td><span className={`status-badge ${i.paymentStatus}`}>{i.paymentStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Customers() {
  const { openModal, closeModal, toast } = useApp()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const refresh = async () => {
    try {
      const data = await Store.getCustomers()
      setCustomers(data)
    } catch (err) {
      toast('Failed to load customers: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return customers.filter(c =>
      !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q)
    )
  }, [customers, search])

  const showForm = (editId = null) => {
    const existing = editId ? customers.find(c => String(c.id) === String(editId)) : null
    openModal(
      editId ? 'Edit Customer' : 'Add Customer',
      <CustomerForm
        editId={editId}
        initialData={existing}
        onSave={async (data) => {
          if (!data.name) { toast('Name is required', 'error'); return }
          try {
            if (editId) { await Store.updateCustomer(editId, data); toast('Customer updated') }
            else { await Store.addCustomer(data); toast('Customer added') }
            closeModal(); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
        onClose={closeModal}
      />
    )
  }

  const deleteCustomer = (id) => {
    openModal(
      'Delete Customer',
      <p>Are you sure? This cannot be undone.</p>,
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button className="btn btn-danger" onClick={async () => {
          try {
            await Store.deleteCustomer(id); closeModal(); toast('Deleted'); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}>Delete</button>
      </div>
    )
  }

  const viewHistory = (customer) => {
    openModal('Purchase History — ' + customer.name, <CustomerHistory customerId={customer.id} />, null, true)
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
          <input type="text" placeholder="Search customers..." className="table-search" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="data-toolbar-right">
          <button className="btn btn-primary" onClick={() => showForm()}><i className="fas fa-plus" /> Add Customer</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>GST</th><th>Purchases</th><th>Total Spent</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No customers found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.phone || '-'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{c.email || '-'}</td>
                <td>{c.city || '-'}</td>
                <td style={{ fontSize: '.8rem' }}>{c.gst || '-'}</td>
                <td style={{ textAlign: 'center' }}>{c.totalPurchases || 0}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>{Utils.currency(c.totalAmount || 0)}</td>
                <td>
                  <button className="btn-icon" onClick={() => showForm(c.id)}><i className="fas fa-edit" /></button>{' '}
                  <button className="btn-icon" onClick={() => viewHistory(c)}><i className="fas fa-history" /></button>{' '}
                  <button className="btn-icon" onClick={() => deleteCustomer(c.id)}><i className="fas fa-trash" style={{ color: 'var(--danger)' }} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
