import { useAuth } from '../lib/auth'

const NAV_ITEMS = [
  { id: 'wall', label: 'Wall', icon: WallIcon },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'game', label: 'Quest', icon: QuestIcon },
  { id: 'leaderboard', label: 'Ranks', icon: RankIcon },
]

const ADMIN_ITEM = { id: 'admin', label: 'Admin', icon: AdminIcon }

export default function BottomNav({ current, onChange }) {
  const { user } = useAuth()
  const items = user?.is_admin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

  return (
    <nav style={styles.nav}>
      {items.map(item => {
        const Icon = item.icon
        const active = current === item.id
        return (
          <button
            key={item.id}
            style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}
            onClick={() => onChange(item.id)}
          >
            <Icon active={active} />
            <span style={{ ...styles.navLabel, ...(active ? styles.navLabelActive : {}) }}>
              {item.label}
            </span>
            {active && <div style={styles.activeBar} />}
          </button>
        )
      })}
    </nav>
  )
}

function WallIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4A6B8A' : '#8DA4B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MapIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4A6B8A' : '#8DA4B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function QuestIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4A6B8A' : '#8DA4B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function RankIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4A6B8A' : '#8DA4B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function AdminIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4A6B8A' : '#8DA4B4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <polyline points="16 3 18 5 22 1" />
    </svg>
  )
}

const styles = {
  nav: {
    display: 'flex',
    background: 'rgba(255,255,255,0.97)',
    borderTop: '1px solid rgba(123,184,212,0.2)',
    boxShadow: '0 -4px 20px rgba(74,107,138,0.08)',
    paddingBottom: 'calc(env(safe-area-inset-bottom) + 25px)',
    flexShrink: 0,
  },
  navBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: '10px 4px 8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'opacity 0.15s',
  },
  navBtnActive: {},
  navLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#8DA4B4',
    letterSpacing: '0.3px',
    fontFamily: 'Lato, sans-serif',
  },
  navLabelActive: {
    color: '#4A6B8A',
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: '2px',
    background: 'linear-gradient(90deg, #7BB8D4, #8B9FD4)',
    borderRadius: '0 0 2px 2px',
  },
}
