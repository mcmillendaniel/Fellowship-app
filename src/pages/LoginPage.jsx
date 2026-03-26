import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || pin.length < 4) return
    setError('')
    setLoading(true)
    try {
      await login(username, pin)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
  }

  return (
    <div style={styles.container}>
      {/* Sky gradient background */}
      <div style={styles.skyBg} />

      {/* Mountain silhouettes */}
      <svg style={styles.mountains} viewBox="0 0 375 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,160 L60,80 L110,120 L170,40 L230,100 L280,60 L330,110 L375,70 L375,200 L0,200 Z"
          fill="rgba(184,217,236,0.35)" />
        <path d="M0,180 L80,110 L140,150 L200,80 L260,130 L310,90 L375,120 L375,200 L0,200 Z"
          fill="rgba(123,184,212,0.25)" />
        {/* Tiny flowers/details at base */}
        <circle cx="30" cy="194" r="3" fill="rgba(232,196,196,0.6)" />
        <circle cx="55" cy="196" r="2" fill="rgba(184,196,232,0.6)" />
        <circle cx="90" cy="193" r="3" fill="rgba(122,158,126,0.5)" />
        <circle cx="340" cy="195" r="2.5" fill="rgba(232,196,196,0.6)" />
        <circle cx="310" cy="197" r="2" fill="rgba(184,196,232,0.6)" />
        <circle cx="280" cy="194" r="3" fill="rgba(122,158,126,0.5)" />
      </svg>

      {/* Card */}
      <div style={styles.card} className="slide-up">
        {/* Ring decoration */}
        <div style={styles.ringDecor}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="none" stroke="url(#ringGrad)" strokeWidth="3" />
            <circle cx="30" cy="30" r="18" fill="none" stroke="rgba(123,184,212,0.3)" strokeWidth="1" />
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7BB8D4" />
                <stop offset="50%" stopColor="#8B9FD4" />
                <stop offset="100%" stopColor="#7BB8D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <h1 style={styles.title} className="font-lotr">The Fellowship</h1>
        <p style={styles.subtitle}>Kevin &amp; Liz · Asheville 2026</p>

        <div style={styles.divider} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Your name</label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoCapitalize="words"
              autoCorrect="off"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PIN</label>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              placeholder="4-digit PIN"
              value={pin}
              onChange={handlePinChange}
              style={{ letterSpacing: pin ? '8px' : '0', fontSize: pin ? '20px' : '16px' }}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={{ fontSize: 16 }}>⚠️</span> {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !username.trim() || pin.length < 4}
            style={{ width: '100%', marginTop: 4, fontSize: 16, padding: '14px' }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Joining...</>
            ) : (
              'Join the Fellowship'
            )}
          </button>
        </form>

        <p style={styles.hint}>
          Don't have a PIN yet? Ask the trip organizer.
        </p>
      </div>

      {/* Floating flowers */}
      <div style={styles.flower1}>✿</div>
      <div style={styles.flower2}>✾</div>
      <div style={styles.flower3}>✿</div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #D6EEF8 0%, #E8F4FA 40%, #F2F6EE 100%)',
  },
  skyBg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(184,217,236,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 10%, rgba(184,196,232,0.3) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  mountains: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '200px',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    border: '1px solid rgba(123,184,212,0.2)',
    boxShadow: '0 8px 40px rgba(74,107,138,0.15)',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '380px',
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
  },
  ringDecor: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: '28px',
    color: '#2C4A6B',
    marginBottom: 6,
    lineHeight: 1.2,
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#7A94A8',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    fontWeight: 600,
    marginBottom: 4,
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(123,184,212,0.4), transparent)',
    margin: '20px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    textAlign: 'left',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#4A6B8A',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  errorBox: {
    background: '#FDEAEA',
    color: '#C0392B',
    border: '1px solid rgba(192,57,43,0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    marginTop: 16,
    fontSize: '12px',
    color: '#8DA4B4',
    textAlign: 'center',
  },
  flower1: {
    position: 'absolute',
    top: '12%',
    left: '8%',
    fontSize: '28px',
    color: 'rgba(232,196,196,0.6)',
    animation: 'float 4s ease-in-out infinite',
    pointerEvents: 'none',
  },
  flower2: {
    position: 'absolute',
    top: '18%',
    right: '10%',
    fontSize: '22px',
    color: 'rgba(184,196,232,0.55)',
    animation: 'float 5s ease-in-out infinite 1s',
    pointerEvents: 'none',
  },
  flower3: {
    position: 'absolute',
    bottom: '25%',
    right: '6%',
    fontSize: '20px',
    color: 'rgba(122,158,126,0.45)',
    animation: 'float 6s ease-in-out infinite 2s',
    pointerEvents: 'none',
  },
}
