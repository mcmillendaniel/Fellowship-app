import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Header({ title }) {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const initial = user?.username?.slice(0, 1).toUpperCase() || '?'
  const avatarColor = user?.team === 'kevin' ? 'avatar-sky' : user?.team === 'liz' ? 'avatar-periwinkle' : 'avatar-sage'

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={{ width: 42 }} />
        <h2 style={styles.title} className="font-lotr">{title}</h2>
        <div style={{ position: 'relative' }}>
          <button style={styles.avatarBtn} onClick={() => setShowMenu(v => !v)}>
            <div className={`avatar ${avatarColor}`} style={{ width: 38, height: 38, fontSize: 16, fontWeight: 700 }}>
              {initial}
            </div>
          </button>
          {showMenu && (
            <div style={styles.menu}>
              <div style={styles.menuItem}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50', fontFamily: 'Lato' }}>{user?.username}</span>
                {user?.is_admin && <span className="badge badge-amber" style={{ fontSize: 10, marginLeft: 6 }}>Admin</span>}
              </div>
              <div style={{ padding: '2px 16px 8px', fontSize: 13, color: '#8DA4B4' }}>
                Team {user?.team === 'kevin' ? 'Kevin 🏒' : user?.team === 'liz' ? 'Liz 🌸' : 'Both 💍'}
              </div>
              <div style={styles.menuDivider} />
              <button style={styles.menuBtn} onClick={() => { logout(); setShowMenu(false) }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      {showMenu && <div style={styles.overlay} onClick={() => setShowMenu(false)} />}
    </header>
  )
}

const styles = {
  header: {
    background: 'rgba(255,255,255,0.97)',
    borderBottom: '1px solid rgba(123,184,212,0.2)',
    boxShadow: '0 2px 12px rgba(74,107,138,0.06)',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    flexShrink: 0,
    position: 'relative',
    zIndex: 100,
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
  },
  title: {
    fontSize: '22px',
    color: '#2C4A6B',
    letterSpacing: '0.5px',
    textAlign: 'center',
    flex: 1,
  },
  avatarBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid rgba(123,184,212,0.25)',
    boxShadow: '0 8px 24px rgba(74,107,138,0.15)',
    minWidth: '170px',
    zIndex: 200,
    overflow: 'hidden',
  },
  menuItem: {
    padding: '12px 16px 4px',
    display: 'flex',
    alignItems: 'center',
  },
  menuDivider: {
    height: 1,
    background: 'rgba(123,184,212,0.2)',
    margin: '4px 0',
  },
  menuBtn: {
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    color: '#C0392B',
    cursor: 'pointer',
    fontFamily: 'Lato, sans-serif',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 150,
  },
}
