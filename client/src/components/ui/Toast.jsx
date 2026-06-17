import { useApp } from '../../context/AppContext.jsx'

const ICONS = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' }

export default function Toast() {
  const { toasts } = useApp()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`fas fa-${ICONS[t.type] || 'info-circle'}`} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
