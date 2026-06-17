import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store, { Utils } from '../../store/store.js'

export default function Settings() {
  const { toast, navigate, refreshStoreName } = useApp()
  const [loading, setLoading] = useState(true)

  const [storeName, setStoreName] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeEmail, setStoreEmail] = useState('')
  const [storeGST, setStoreGST] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [currency, setCurrency] = useState('₹')
  const [currencyCode, setCurrencyCode] = useState('INR')
  const [taxRates, setTaxRates] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const restoreRef = useRef(null)

  useEffect(() => {
    Store.getSettings().then(s => {
      setStoreName(s.storeName || '')
      setStorePhone(s.storePhone || '')
      setStoreEmail(s.storeEmail || '')
      setStoreGST(s.storeGST || '')
      setStoreAddress(s.storeAddress || '')
      setCurrency(s.currency || '₹')
      setCurrencyCode(s.currencyCode || 'INR')
      setTaxRates(s.taxRates || [])
      setPaymentMethods(s.paymentMethods || [])
      setLoading(false)
    }).catch(err => {
      toast('Failed to load settings', 'error')
      setLoading(false)
    })
  }, [])

  const saveSettings = async () => {
    try {
      await Store.saveSettings({
        storeName, storePhone, storeEmail, storeGST, storeAddress,
        currency: currency || '₹', currencyCode: currencyCode || 'INR',
        taxRates: taxRates.filter(t => t.name && t.rate > 0),
        paymentMethods: paymentMethods.filter(m => m.trim())
      })
      refreshStoreName()
      toast('Settings saved')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const addTaxRate = () => setTaxRates(prev => [...prev, { name: '', rate: 0 }])
  const updateTaxRate = (i, key, val) => setTaxRates(prev => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t))
  const removeTaxRate = (i) => setTaxRates(prev => prev.filter((_, idx) => idx !== i))

  const addPayMethod = () => setPaymentMethods(prev => [...prev, ''])
  const updatePayMethod = (i, val) => setPaymentMethods(prev => prev.map((m, idx) => idx === i ? val : m))
  const removePayMethod = (i) => setPaymentMethods(prev => prev.filter((_, idx) => idx !== i))

  const backupData = async () => {
    try {
      const json = await Store.exportAll()
      Utils.downloadFile(json, 'retailpro_backup_' + new Date().toISOString().split('T')[0] + '.json', 'application/json')
      toast('Backup downloaded', 'info')
    } catch (err) {
      toast('Backup failed: ' + err.message, 'error')
    }
  }

  const handleRestore = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const success = await Store.importAll(ev.target.result)
        if (success) {
          toast('Data restored successfully!')
          window.location.reload() // Reload app completely
        } else {
          toast('Failed to restore backup', 'error')
        }
      } catch (err) {
        toast('Invalid backup file', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const resetData = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL products, invoices, customers, and settings! Are you sure?')) return
    try {
      await Store.resetAll()
      toast('All data reset')
      window.location.reload() // Reload the app
    } catch (err) {
      toast('Failed to reset: ' + err.message, 'error')
    }
  }

  const seedData = async () => {
    try {
      await Store.seed()
      toast('Demo data generated successfully!')
      window.location.reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
    </div>
  )

  return (
    <>
      {/* Store Information */}
      <div className="card settings-section">
        <h3><i className="fas fa-store" style={{ marginRight: 8, color: 'var(--accent)' }} />Store Information</h3>
        <div className="form-grid">
          <div className="form-group"><label>Store Name</label><input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} /></div>
          <div className="form-group"><label>Phone</label><input type="text" value={storePhone} onChange={e => setStorePhone(e.target.value)} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={storeEmail} onChange={e => setStoreEmail(e.target.value)} /></div>
          <div className="form-group"><label>GST Number</label><input type="text" value={storeGST} onChange={e => setStoreGST(e.target.value)} /></div>
          <div className="form-group full-width"><label>Address</label><input type="text" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} /></div>
          <div className="form-group"><label>Currency Symbol</label><input type="text" value={currency} onChange={e => setCurrency(e.target.value)} /></div>
          <div className="form-group"><label>Currency Code</label><input type="text" value={currencyCode} onChange={e => setCurrencyCode(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={saveSettings}><i className="fas fa-save" /> Save Settings</button>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="card settings-section">
        <h3><i className="fas fa-percent" style={{ marginRight: 8, color: 'var(--success)' }} />Tax Rates</h3>
        {taxRates.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="text" placeholder="Tax name" style={{ flex: 1 }} value={t.name} onChange={e => updateTaxRate(i, 'name', e.target.value)} />
            <input type="number" placeholder="Rate %" style={{ width: 100 }} value={t.rate} onChange={e => updateTaxRate(i, 'rate', parseFloat(e.target.value) || 0)} />
            <button className="btn-icon" onClick={() => removeTaxRate(i)}><i className="fas fa-times" style={{ color: 'var(--danger)' }} /></button>
          </div>
        ))}
        <button className="btn btn-sm btn-secondary" onClick={addTaxRate}><i className="fas fa-plus" /> Add Tax Rate</button>
      </div>

      {/* Payment Methods */}
      <div className="card settings-section">
        <h3><i className="fas fa-credit-card" style={{ marginRight: 8, color: 'var(--info)' }} />Payment Methods</h3>
        {paymentMethods.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="text" placeholder="Method name" style={{ flex: 1 }} value={m} onChange={e => updatePayMethod(i, e.target.value)} />
            <button className="btn-icon" onClick={() => removePayMethod(i)}><i className="fas fa-times" style={{ color: 'var(--danger)' }} /></button>
          </div>
        ))}
        <button className="btn btn-sm btn-secondary" onClick={addPayMethod}><i className="fas fa-plus" /> Add Method</button>
      </div>

      {/* Data Management */}
      <div className="card settings-section">
        <h3><i className="fas fa-database" style={{ marginRight: 8, color: 'var(--warning)' }} />Data Management</h3>
        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={backupData}><i className="fas fa-download" /> Backup Data</button>
          <button className="btn btn-secondary" onClick={() => restoreRef.current?.click()}><i className="fas fa-upload" /> Restore Data</button>
          <button className="btn btn-secondary" onClick={seedData}><i className="fas fa-leaf" /> Generate Demo Data</button>
          <button className="btn btn-danger" onClick={resetData}><i className="fas fa-exclamation-triangle" /> Reset All Data</button>
        </div>
        <p style={{ marginTop: 12, fontSize: '.8rem', color: 'var(--text-muted)' }}>Backup exports all data as JSON. Restore will overwrite existing data.</p>
        <input ref={restoreRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
      </div>
    </>
  )
}
