import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './hooks/useToast'
import LoginPage from './pages/LoginPage'
import WallPage from './pages/WallPage'
import MapPage from './pages/MapPage'
import GamePage from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import BottomNav from './components/BottomNav'
import Header from './components/Header'
import './index.css'

const PAGE_TITLES = {
  wall: 'The Fellowship',
  map: 'The Fellowship',
  game: 'The Fellowship',
  leaderboard: 'The Fellowship',
  admin: 'The Fellowship',
}

function AppInner() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('wall')

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #D6EEF8 0%, #F2F6EE 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'Lato, sans-serif', color: '#4A6B8A', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header title="The Fellowship" />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {page === 'wall' && <WallPage />}
        {page === 'map' && <MapPage />}
        {page === 'game' && <GamePage />}
        {page === 'leaderboard' && <LeaderboardPage />}
        {page === 'admin' && user.is_admin && <AdminPage />}
      </div>
      <BottomNav current={page} onChange={setPage} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  )
}
