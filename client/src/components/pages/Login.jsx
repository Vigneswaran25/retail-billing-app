import { useState } from 'react'
import Store from '../../store/store.js'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter username and password.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const user = await Store.login(username, password)
      onLogin(user)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <i className="fas fa-store" />
          </div>
          <h1 style={styles.title}>RetailPro</h1>
          <p style={styles.subtitle}>Sign in to access your dashboard</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <i className="fas fa-user" style={styles.inputIcon} />
              <input
                type="text"
                style={styles.input}
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <i className="fas fa-lock" style={styles.inputIcon} />
              <input
                type="password"
                style={styles.input}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading || !username || !password ? styles.buttonDisabled : {})
            }}
            disabled={loading || !username || !password}
          >
            {loading ? <i className="fas fa-spinner fa-spin" /> : 'Sign In'}
          </button>
        </form>
        
        <div style={styles.footer}>
          RetailPro Point of Sale System
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e2130 0%, #2d3348 100%)',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#2d3348',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  logo: {
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#fff',
    margin: '0 auto 16px',
    boxShadow: '0 8px 16px rgba(108,92,231,0.3)'
  },
  title: {
    margin: '0 0 8px',
    fontSize: '28px',
    color: '#fff',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: '#8b8fa3',
    fontSize: '15px'
  },
  errorAlert: {
    background: 'rgba(255, 118, 117, 0.1)',
    color: '#ff7675',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid rgba(255, 118, 117, 0.2)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#b2b5c4',
    fontSize: '14px',
    fontWeight: '500'
  },
  inputWrapper: {
    position: 'relative'
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6c5ce7',
    fontSize: '16px'
  },
  input: {
    width: '100%',
    height: '50px',
    background: 'rgba(20, 23, 34, 0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '0 16px 0 46px',
    color: '#fff',
    fontSize: '16px',
    transition: 'all 0.2s',
    outline: 'none'
  },
  button: {
    width: '100%',
    height: '50px',
    background: '#6c5ce7',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(108,92,231,0.3)'
  },
  buttonDisabled: {
    background: '#4a4d61',
    color: '#8b8fa3',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
    color: '#63677c',
    fontSize: '13px'
  }
}
