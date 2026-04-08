import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { formatDistanceToNow } from 'date-fns'

export default function AdminPage() {
  const [tab, setTab] = useState('submissions')

  return (
    <div style={styles.page}>
      <div style={{ padding: '12px 16px 0', background: '#fff', borderBottom: '1px solid rgba(123,184,212,0.2)', flexShrink: 0 }}>
        <div style={{ ...tabsStyle, overflowX: 'auto' }}>
          {[
            { id: 'submissions', label: '📸 Submissions' },
            { id: 'tasks', label: '🗺️ Quests' },
            { id: 'trivia', label: '🧠 Trivia' },
            { id: 'alert', label: '📣 Alert' },
            { id: 'users', label: '👥 Users' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...tabBtn,
                borderBottom: tab === t.id ? '2px solid #7BB8D4' : '2px solid transparent',
                color: tab === t.id ? '#4A6B8A' : '#8DA4B4',
                fontWeight: tab === t.id ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="scroll" style={{ flex: 1 }}>
        {tab === 'submissions' && <SubmissionsTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'trivia' && <TriviaTab />}
        {tab === 'alert' && <AlertTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}

function SubmissionsTab() {
  const toast = useToast()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSubmissions() }, [])

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('task_submissions')
      .select('*, users(username, team), tasks(title, stars)')
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
    setLoading(false)
  }

  const approve = async (sub) => {
    const stars = sub.tasks?.stars || 1
    await supabase.from('task_submissions').update({ status: 'approved', stars_awarded: stars }).eq('id', sub.id)
    await supabase.from('stars_log').insert({ user_id: sub.user_id, stars, reason: `Quest: ${sub.tasks?.title}`, source: 'quest' })
    setSubmissions(s => s.map(x => x.id === sub.id ? { ...x, status: 'approved', stars_awarded: stars } : x))
    toast(`✅ Approved! +${stars}⭐ awarded`, 'success')
  }

  const reject = async (id) => {
    await supabase.from('task_submissions').update({ status: 'rejected' }).eq('id', id)
    setSubmissions(s => s.map(x => x.id === id ? { ...x, status: 'rejected' } : x))
    toast('Submission rejected', 'info')
  }

  const remove = async (id) => {
    await supabase.from('task_submissions').delete().eq('id', id)
    setSubmissions(s => s.filter(x => x.id !== id))
    toast('Deleted', 'info')
  }

  if (loading) return <Loading />
  if (!submissions.length) return <EmptyMsg icon="📭" text="No submissions yet" />

  const pending = submissions.filter(s => s.status === 'pending')
  const reviewed = submissions.filter(s => s.status !== 'pending')

  return (
    <div style={styles.section}>
      {pending.length > 0 && (
        <>
          <p style={styles.sectionTitle}>Pending ({pending.length})</p>
          {pending.map(sub => (
            <div key={sub.id} style={styles.subCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50', marginBottom: 2 }}>{sub.tasks?.title}</p>
                  <p style={{ fontSize: 12, color: '#8DA4B4' }}>{sub.users?.username} · {sub.users?.team} · {'⭐'.repeat(sub.tasks?.stars || 1)}</p>
                </div>
                <p style={{ fontSize: 11, color: '#aaa' }}>{formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}</p>
              </div>
              {sub.photo_url && (
                <img src={sub.photo_url} alt="submission" style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 240, objectFit: 'cover' }} />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btnGreen, flex: 1 }} onClick={() => approve(sub)}>✅ Approve</button>
                <button style={{ ...btnRed, flex: 1 }} onClick={() => reject(sub.id)}>❌ Reject</button>
              </div>
            </div>
          ))}
        </>
      )}
      {reviewed.length > 0 && (
        <>
          <p style={{ ...styles.sectionTitle, marginTop: 8 }}>Reviewed ({reviewed.length})</p>
          {reviewed.map(sub => (
            <div key={sub.id} style={{ ...styles.subCard, opacity: 0.75 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50', marginBottom: 2 }}>{sub.tasks?.title}</p>
                  <p style={{ fontSize: 12, color: '#8DA4B4' }}>{sub.users?.username} · {sub.status === 'approved' ? `✅ +${sub.stars_awarded}⭐` : '❌ Rejected'}</p>
                </div>
                <button style={{ ...btnRed, fontSize: 11, padding: '4px 10px' }} onClick={() => remove(sub.id)}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function TasksTab() {
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', stars: 1 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    const { data } = await supabase.from('fellowship_quests').select('*').order('stars')
    setTasks(data || [])
    setLoading(false)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('fellowship_quests').insert({ title: form.title.trim(), description: form.description.trim(), stars: form.stars })
    setForm({ title: '', description: '', stars: 1 })
    await fetchTasks()
    toast('Quest added!', 'success')
    setSaving(false)
  }

  const remove = async (id) => {
    await supabase.from('fellowship_quests').delete().eq('id', id)
    setTasks(t => t.filter(x => x.id !== id))
    toast('Quest removed', 'info')
  }

  if (loading) return <Loading />

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Add Quest</p>
      <div style={styles.formCard}>
        <input style={inputStyle} placeholder="Quest title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <label style={{ fontSize: 13, color: '#4A6B8A', fontWeight: 600 }}>Stars:</label>
          {[1, 2, 3].map(n => (
            <button key={n} style={{ ...starBtn, background: form.stars === n ? '#7BB8D4' : '#eee', color: form.stars === n ? '#fff' : '#888' }} onClick={() => setForm(f => ({ ...f, stars: n }))}>{n}⭐</button>
          ))}
        </div>
        <button style={{ ...btnGreen, marginTop: 12, width: '100%' }} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Add Quest'}</button>
      </div>
      <p style={{ ...styles.sectionTitle, marginTop: 8 }}>All Quests ({tasks.length})</p>
      {tasks.map(t => (
        <div key={t.id} style={styles.subCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50', marginBottom: 2 }}>{t.title}</p>
              {t.description && <p style={{ fontSize: 12, color: '#8DA4B4' }}>{t.description}</p>}
              <p style={{ fontSize: 12, color: '#aaa' }}>{'⭐'.repeat(t.stars)}</p>
            </div>
            <button style={{ ...btnRed, fontSize: 11, padding: '4px 10px' }} onClick={() => remove(t.id)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TriviaTab() {
  const toast = useToast()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)

  useEffect(() => { fetchQ() }, [])

  const fetchQ = async () => {
    const { data } = await supabase
      .from('trivia_questions')
      .select('*')
      .order('stars', { ascending: true })
    if (data) setQuestions(data)
    setLoading(false)
  }

  const toggleAll = async (active) => {
    setToggling('all')
    await supabase.from('trivia_questions').update({ is_active: active }).neq('id', '00000000-0000-0000-0000-000000000000')
    setQuestions(prev => prev.map(q => ({ ...q, is_active: active })))
    toast(active ? '✅ Trivia activated for all guests' : '🔒 Trivia hidden from guests', active ? 'success' : 'info')
    setToggling(null)
  }

  const toggleOne = async (q) => {
    setToggling(q.id)
    const next = !q.is_active
    await supabase.from('trivia_questions').update({ is_active: next }).eq('id', q.id)
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, is_active: next } : x))
    setToggling(null)
  }

  const activeCount = questions.filter(q => q.is_active).length
  const allActive = activeCount === questions.length && questions.length > 0

  if (loading) return <Loading />

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={styles.formCard}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#4A6B8A', marginBottom: 4 }}>Trivia Visibility</p>
        <p style={{ fontSize: 12, color: '#8DA4B4', marginBottom: 14 }}>
          {activeCount} of {questions.length} questions visible to guests
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...actionBtn, background: allActive ? '#e0f2e9' : '#7BB8D4', color: allActive ? '#2e7d32' : '#fff', flex: 1 }}
            onClick={() => toggleAll(true)}
            disabled={toggling === 'all'}
          >
            {allActive ? '✅ All Active' : '🟢 Activate All'}
          </button>
          <button
            style={{ ...actionBtn, background: '#fdecea', color: '#c62828', flex: 1 }}
            onClick={() => toggleAll(false)}
            disabled={toggling === 'all'}
          >
            🔒 Hide All
          </button>
        </div>
      </div>

      <p style={{ ...styles.sectionTitle, marginTop: 16, marginBottom: 8 }}>Questions</p>

      {questions.map(q => (
        <div key={q.id} style={{ ...styles.subCard, marginBottom: 10, borderLeft: `4px solid ${q.is_active ? '#4CAF50' : '#ccc'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={catBadge(q.category)}>{q.category}</span>
                <span style={{ fontSize: 11, color: '#888' }}>{'⭐'.repeat(q.stars)}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50', margin: 0, lineHeight: 1.4 }}>{q.question}</p>
              <p style={{ fontSize: 11, color: '#8DA4B4', marginTop: 4, marginBottom: 0 }}>
                ✓ {q.accepted_answers?.replace(/\|/g, ', ')}
                {q.alternate_answers ? ` · ½⭐: ${q.alternate_answers.replace(/\|/g, ', ')}` : ''}
              </p>
            </div>
            <button
              style={{ ...toggleBtn, background: q.is_active ? '#4CAF50' : '#ccc', flexShrink: 0 }}
              onClick={() => toggleOne(q)}
              disabled={toggling === q.id}
            >
              {q.is_active ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertTab() {
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAlerts() }, [])

  const fetchAlerts = async () => {
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(10)
    setAlerts(data || [])
    setLoading(false)
  }

  const send = async () => {
    if (!message.trim()) return
    setSending(true)
    await supabase.from('alerts').insert({ message: message.trim() })
    setMessage('')
    await fetchAlerts()
    toast('📣 Alert sent!', 'success')
    setSending(false)
  }

  const remove = async (id) => {
    await supabase.from('alerts').delete().eq('id', id)
    setAlerts(a => a.filter(x => x.id !== id))
  }

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Send Alert</p>
      <div style={styles.formCard}>
        <textarea
          style={{ ...inputStyle, height: 80, resize: 'none' }}
          placeholder="Message to all guests..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <button style={{ ...btnGreen, marginTop: 10, width: '100%' }} onClick={send} disabled={sending}>
          {sending ? 'Sending...' : '📣 Send to All'}
        </button>
      </div>
      {!loading && alerts.length > 0 && (
        <>
          <p style={{ ...styles.sectionTitle, marginTop: 8 }}>Recent Alerts</p>
          {alerts.map(a => (
            <div key={a.id} style={styles.subCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontSize: 13, color: '#2C3E50', flex: 1, marginRight: 10 }}>{a.message}</p>
                <button style={{ ...btnRed, fontSize: 11, padding: '4px 10px', flexShrink: 0 }} onClick={() => remove(a.id)}>Delete</button>
              </div>
              <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('username')
    setUsers(data || [])
    setLoading(false)
  }

  if (loading) return <Loading />
  if (!users.length) return <EmptyMsg icon="👥" text="No users yet" />

  const byTeam = (team) => users.filter(u => u.team === team)

  return (
    <div style={styles.section}>
      {['Kevin', 'Liz'].map(team => (
        <div key={team}>
          <p style={styles.sectionTitle}>{team}'s Side ({byTeam(team).length})</p>
          {byTeam(team).map(u => (
            <div key={u.id} style={styles.subCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50', marginBottom: 2 }}>{u.username}</p>
                  <p style={{ fontSize: 11, color: '#8DA4B4' }}>{u.role} · Last seen: {u.last_login ? formatDistanceToNow(new Date(u.last_login), { addSuffix: true }) : 'never'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Loading() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
}

function EmptyMsg({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 14, color: '#8DA4B4' }}>{text}</p>
    </div>
  )
}

const actionBtn = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const toggleBtn = {
  padding: '6px 12px',
  borderRadius: 20,
  border: 'none',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  minWidth: 44,
}

const categoryColors = {
  Kevin: '#5C85D6',
  Liz: '#D65CA0',
  Cats: '#E8A838',
  Couple: '#56B068',
}

const catBadge = (cat) => ({
  display: 'inline-block',
  padding: '1px 8px',
  borderRadius: 20,
  fontSize: 10,
  fontWeight: 700,
  color: '#fff',
  background: categoryColors[cat] || '#7BB8D4',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
})

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1.5px solid rgba(123,184,212,0.4)',
  fontSize: 14,
  outline: 'none',
  background: '#f8fbfd',
  boxSizing: 'border-box',
}

const starBtn = {
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const btnGreen = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#4CAF50',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const btnRed = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#e57373',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F8FA' },
  section: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#8DA4B4', textTransform: 'uppercase', letterSpacing: '0.8px' },
  formCard: { background: '#fff', borderRadius: 14, padding: 16, border: '1px solid rgba(123,184,212,0.2)' },
  subCard: { background: '#fff', borderRadius: 12, padding: '14px', border: '1px solid rgba(123,184,212,0.15)' },
}

const tabsStyle = { display: 'flex', gap: 2, paddingBottom: 0 }

const tabBtn = {
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  whiteSpace: 'nowrap',
}
