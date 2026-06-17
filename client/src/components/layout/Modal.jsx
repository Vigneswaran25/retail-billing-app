import { useApp } from '../../context/AppContext.jsx'

export default function Modal() {
  const { modal, closeModal } = useApp()
  if (!modal.open) return null

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal() }}
    >
      <div className={`modal-container${modal.wide ? ' wide' : ''}`}>
        <div className="modal-header">
          <h2>{modal.title}</h2>
          <button className="modal-close-btn" aria-label="Close modal" onClick={closeModal}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">
          {modal.body}
        </div>
        {modal.footer && (
          <div className="modal-footer">
            {modal.footer}
          </div>
        )}
      </div>
    </div>
  )
}
