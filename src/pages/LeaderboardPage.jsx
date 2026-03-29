import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
    const interval = setInterval(fetchRankings, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRankings = async () => {
    const { data: users } = await supabase.from('users').select('id, username, team').eq('is_admin', false)
    if (!users) { setLoading(false); return }

    const [triviaRes, taskRes] = await Promise.all([
      supabase.from('trivia_answers').select('user_id, stars_awarded'),
      supabase.from('task_submissions').select('user_id, stars_awarded').eq('status', 'approved'),
    ])

    const starsMap = {}
    users.forEach(u => { starsMap[u.id] = { ...u, trivia⭐: 0, task⭐: 0 } })

    triviaRes.data?.forEach(a => { if (xpMap[a.user_id]) starsMap[a.user_id].trivia⭐ += a.xp_awarded || 0 })
    taskRes.data?.forEach(s => { if (xpMap[s.user_id]) starsMap[s.user_id].task⭐ += s.xp_awarded || 0 })

    const ranked = Object.values(xpMap)
      .map(u => ({ ...u, total⭐: u.trivia⭐ + u.task⭐ }))
      .sort((a, b) => b.total⭐ - a.total⭐)

    setRankings(ranked)
    setLoading(false)
  }

  const topThree = rankings.slice(0, 3)
  const rest = rankings.slice(3)

  return (
    <div style={styles.page}>
      <div className="scroll" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : rankings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48 }}>🏆</div>
            <p style={{ fontWeight: 700, color: '#4A6B8A', marginTop: 12 }}>Rankings will appear here</p>
            <p style={{ fontSize: 13, color: '#8DA4B4', marginTop: 4 }}>Play trivia and complete quests to earn ⭐!</p>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {/* Podium */}
            {topThree.length >= 1 && (
              <div style={styles.podium}>
                {topThree.length >= 2 && <PodiumSpot rank={2} entry={topThree[1]} isMe={topThree[1].id === user?.id} />}
                <PodiumSpot rank={1} entry={topThree[0]} isMe={topThree[0].id === user?.id} />
                {topThree.length >= 3 && <PodiumSpot rank={3} entry={topThree[2]} isMe={topThree[2].id === user?.id} />}
              </div>
            )}

            {/* Rest of rankings */}
            {rest.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rest.map((entry, i) => (
                  <RankRow key={entry.id} rank={i + 4} entry={entry} isMe={entry.id === user?.id} />
                ))}
              </div>
            )}

            {/* ⭐ breakdown info */}
            <div style={styles.infoCard}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4A6B8A', marginBottom: 6 }}>How to earn ⭐</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <⭐Row icon="🧠" label="Easy trivia" value="1 ⭐" />
                <⭐Row icon="🧠" label="Medium trivia" value="2 ⭐" />
                <⭐Row icon="🧠" label="Hard trivia" value="3 ⭐" />
                <⭐Row icon="⭐" label="Quest completion" value="Varies" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PodiumSpot({ rank, entry, isMe }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const heights = { 1: 90, 2: 70, 3: 55 }
  const avatarClass = entry.team === 'kevin' ? 'avatar-sky' : entry.team === 'liz' ? 'avatar-periwinkle' : 'avatar-sage'
  const initials = entry.username?.slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: rank === 1 ? 1.2 : 1 }}>
      <div className={`avatar ${avatarClass}`} style={{
        width: rank === 1 ? 48 : 40,
        height: rank === 1 ? 48 : 40,
        fontSize: rank === 1 ? 16 : 13,
        border: isMe ? '2px solid #4A6B8A' : 'none',
        marginBottom: 4,
      }}>
        {initials}
      </div>
      <span style={{ fontSize: rank === 1 ? 13 : 12, fontWeight: 700, color: '#2C3E50', fontFamily: 'Lato', marginBottom: 2 }}>
        {entry.username}{isMe ? ' 👈' : ''}
      </span>
      <span style={{ fontSize: 12, color: '#8DA4B4', marginBottom: 6 }}>{entry.total⭐} ⭐</span>
      <div style={{
        height: heights[rank],
        width: '100%',
        background: rank === 1
          ? 'linear-gradient(180deg, #FFD700 0%, #FFC200 100%)'
          : rank === 2
          ? 'linear-gradient(180deg, #C0C0C0 0%, #A0A0A0 100%)'
          : 'linear-gradient(180deg, #CD7F32 0%, #B87333 100%)',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 8,
        fontSize: 20,
      }}>
        {medals[rank]}
      </div>
    </div>
  )
}

function RankRow({ rank, entry, isMe }) {
  const avatarClass = entry.team === 'kevin' ? 'avatar-sky' : entry.team === 'liz' ? 'avatar-periwinkle' : 'avatar-sage'
  const initials = entry.username?.slice(0, 2).toUpperCase()

  return (
    <div style={{ ...styles.rankRow, ...(isMe ? styles.rankRowMe : {}) }}>
      <span style={styles.rankNum}>#{rank}</span>
      <div className={`avatar ${avatarClass}`} style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#2C3E50', fontFamily: 'Lato' }}>
        {entry.username}{isMe ? ' (you)' : ''}
      </span>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4A6B8A' }}>{entry.total⭐} ⭐</div>
        <div style={{ fontSize: 10, color: '#8DA4B4' }}>{entry.trivia⭐}T · {entry.task⭐}Q</div>
      </div>
    </div>
  )
}

function ⭐Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#546E7A' }}>{icon} {label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#4A6B8A' }}>{value}</span>
    </div>
  )
}

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F8FA' },
  podium: { display: 'flex', alignItems: 'flex-end', gap: 8, background: '#fff', borderRadius: 16, padding: '20px 16px 0', border: '1px solid rgba(123,184,212,0.2)', overflow: 'hidden' },
  rankRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid rgba(123,184,212,0.15)' },
  rankRowMe: { border: '1.5px solid rgba(74,107,138,0.4)', background: '#F4F8FB' },
  rankNum: { width: 28, fontSize: 13, fontWeight: 700, color: '#8DA4B4', fontFamily: 'Lato', textAlign: 'center' },
  infoCard: { marginTop: 16, background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(123,184,212,0.2)' },
}
