import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import Store from '../../store/store.js'

function CategoryForm({ editId, initialData, onSave, onClose }) {
  const [name, setName] = useState(initialData?.name || '')
  const [color, setColor] = useState(initialData?.color || '#6c5ce7')

  return (
    <>
      <div className="form-grid">
        <div className="form-group">
          <label>Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ height: 42, padding: 4 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(name, color)}>{editId ? 'Update' : 'Add'}</button>
      </div>
    </>
  )
}

export default function Categories() {
  const { openModal, closeModal, toast } = useApp()
  const [categories, setCategories] = useState([])
  const [productCounts, setProductCounts] = useState({})
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const [cats, prods] = await Promise.all([Store.getCategories(), Store.getProducts()])
      setCategories(cats)
      const counts = {}
      prods.forEach(p => {
        const cid = String(p.categoryId || p.category)
        counts[cid] = (counts[cid] || 0) + 1
      })
      setProductCounts(counts)
    } catch (err) {
      toast('Failed to load categories: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const showForm = (editId = null) => {
    const existing = editId ? categories.find(c => String(c.id) === String(editId)) : null
    openModal(
      editId ? 'Edit Category' : 'Add Category',
      <CategoryForm
        editId={editId}
        initialData={existing}
        onSave={async (name, color) => {
          if (!name) { toast('Name is required', 'error'); return }
          try {
            if (editId) { await Store.updateCategory(editId, { name, color }); toast('Category updated') }
            else { await Store.addCategory({ name, color }); toast('Category added') }
            closeModal(); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
        onClose={closeModal}
      />
    )
  }

  const deleteCategory = (id, count) => {
    if (count > 0) { toast(`Cannot delete: ${count} product(s) use this category`, 'error'); return }
    openModal(
      'Delete Category',
      <p>Are you sure you want to delete this category?</p>,
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
        <button className="btn btn-danger" onClick={async () => {
          try {
            await Store.deleteCategory(id); closeModal(); toast('Deleted'); refresh()
          } catch (err) {
            toast(err.message, 'error')
          }
        }}>Delete</button>
      </div>
    )
  }

  if (loading) return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)' }} />
    </div>
  )

  return (
    <div className="card">
      <div className="data-toolbar">
        <div className="data-toolbar-left"><h3>Manage Categories</h3></div>
        <div className="data-toolbar-right">
          <button className="btn btn-primary" onClick={() => showForm()}><i className="fas fa-plus" /> Add Category</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Category</th><th>Color</th><th>Products</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No categories yet</td></tr>
            ) : categories.map(c => {
              const count = productCounts[String(c.id)] || 0
              return (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    <span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: 6, background: c.color || 'var(--accent)', verticalAlign: 'middle' }} />
                  </td>
                  <td>{count} products</td>
                  <td>
                    <button className="btn-icon" onClick={() => showForm(c.id)}><i className="fas fa-edit" /></button>{' '}
                    <button className="btn-icon" onClick={() => deleteCategory(c.id, count)}><i className="fas fa-trash" style={{ color: 'var(--danger)' }} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
