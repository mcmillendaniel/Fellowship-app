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
          {['submissions', 'tasks', 'trivia', 'alert', 'users'].map(t => (
            <button
              key={t}
              style={{ ...tabStyle, ...(tab === t ? tabActiveStyle : {}) }}
              onClick={() => setTab(t)}
            >
              {{ submissions: '📸 Queue', tasks: '⚔️ Tasks', trivia: '🧠 Trivia', alert: '📢 Alert', users: '👥 Users' }[t]}
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
  const [xpValues, setXpValues] = useState({})

  useEffect(() => { fetchSubmissions() }, [])

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('task_submissions')
      .select('*, users(username), tasks(title, xp_value)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
    if (data) {
      setSubmissions(data)
      const vals = {}
      data.forEach(s => { vals[s.id] = s.tasks?.xp_value || 100 })
      setXpValues(vals)
    }
    setLoading(false)
  }

  const review = async (id, taskId, userId, status, xp) => {
    await supabase.from('task_submissions').update({ status, xp_awarded: status === 'approved' ? xp : 0 }).eq('id', id)
    toast(status === 'approved' ? `✅ Approved! +${xp} XP awarded` : '❌ Rejected', status === 'approved' ? 'success' : 'error')
    setSubmissions(s => s.filter(x => x.id !== id))
  }

  if (loading) return <Loading />

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Pending photo submissions ({submissions.length})</p>
      {submissions.length === 0 ? (
        <EmptyMsg icon="📭" text="No pending submissions" />
      ) : (
        submissions.map(sub => (
          <div key={sub.id} style={styles.subCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#2C3E50', marginBottom: 2 }}>{sub.users?.username}</p>
                <p style={{ fontSize: 13, color: '#8DA4B4' }}>{sub.tasks?.title}</p>
                <p style={{ fontSize: 11, color: '#B0BEC5', marginTop: 2 }}>
                  {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}
                </p>
              </div>
              {sub.photo_url && (
                <a href={sub.photo_url} target="_blank" rel="noreferrer">
                  <img src={sub.photo_url} alt="submission" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(123,184,212,0.3)' }} />
                </a>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: '#546E7A', fontWeight: 600 }}>XP:</span>
              <input
                className="input"
                type="number"
                value={xpValues[sub.id] || ''}
                onChange={e => setXpValues(v => ({ ...v, [sub.id]: parseInt(e.target.value) || 0 }))}
                style={{ width: 80, padding: '6px 10px', fontSize: 14, textAlign: 'center' }}
              />
              <button className="btn btn-success" style={{ flex: 1, fontSize: 13, padding: '8px' }}
                onClick={() => review(sub.id, sub.task_id, sub.user_id, 'approved', xpValues[sub.id] || 100)}>
                Approve
              </button>
              <button className="btn btn-danger" style={{ flex: 1, fontSize: 13, padding: '8px' }}
                onClick={() => review(sub.id, sub.task_id, sub.user_id, 'rejected', 0)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function TasksTab() {
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', xp_value: 100, requires_photo: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at')
    if (data) setTasks(data)
    setLoading(false)
  }

  const addTask = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('tasks').insert(form)
    toast('Quest added! ⚔️', 'success')
    setForm({ title: '', description: '', xp_value: 100, requires_photo: true })
    await fetchTasks()
    setSaving(false)
  }

  const toggleActive = async (id, current) => {
    await supabase.from('tasks').update({ is_active: !current }).eq('id', id)
    setTasks(t => t.map(x => x.id === id ? { ...x, is_active: !current } : x))
  }

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(t => t.filter(x => x.id !== id))
    toast('Task removed')
  }

  if (loading) return <Loading />

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Add new quest</p>
      <div style={styles.formCard}>
        <input className="input" placeholder="Quest title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ marginBottom: 10 }} />
        <textarea className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'none', marginBottom: 10 }} rows={2} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 13, color: '#546E7A', fontWeight: 600, whiteSpace: 'nowrap' }}>XP value:</label>
          <input className="input" type="number" value={form.xp_value} onChange={e => setForm(f => ({ ...f, xp_value: parseInt(e.target.value) || 0 }))} style={{ width: 90 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#546E7A', fontWeight: 600, marginLeft: 'auto' }}>
            <input type="checkbox" checked={form.requires_photo} onChange={e => setForm(f => ({ ...f, requires_photo: e.target.checked }))} />
            Photo required
          </label>
        </div>
        <button className="btn btn-primary" onClick={addTask} disabled={saving || !form.title.trim()} style={{ width: '100%' }}>
          {saving ? 'Adding...' : 'Add quest'}
        </button>
      </div>

      <p style={{ ...styles.sectionTitle, marginTop: 20 }}>All quests ({tasks.length})</p>
      {tasks.map(task => (
        <div key={task.id} style={{ ...styles.subCard, opacity: task.is_active ? 1 : 0.55 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#2C3E50' }}>{task.title}</p>
              {task.description && <p style={{ fontSize: 12, color: '#8DA4B4', marginTop: 2 }}>{task.description}</p>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#B8600A', background: '#FFF5E6', padding: '2px 6px', borderRadius: 4 }}>⭐ {task.xp_value} XP</span>
                {task.requires_photo && <span style={{ fontSize: 11, color: '#7BB8D4', background: '#E8F4FA', padding: '2px 6px', borderRadius: 4 }}>📸</span>}
                <span style={{ fontSize: 11, color: task.is_active ? '#27AE60' : '#8DA4B4', background: task.is_active ? '#EAF5EA' : '#F5F5F5', padding: '2px 6px', borderRadius: 4 }}>
                  {task.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => toggleActive(task.id, task.is_active)}>
                {task.is_active ? 'Hide' : 'Show'}
              </button>
              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => deleteTask(task.id)}>✕</button>
            </div>
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
  const [form, setForm] = useState({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'medium', about: 'both' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchQ() }, [])

  const fetchQ = async () => {
    const { data } = await supabase.from('trivia_questions').select('*').order('created_at')
    if (data) setQuestions(data)
    setLoading(false)
  }

  const addQ = async () => {
    if (!form.question.trim() || !form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      toast('Fill in all fields', 'error'); return
    }
    setSaving(true)
    await supabase.from('trivia_questions').insert(form)
    toast('Question added! 🧠', 'success')
    setForm({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', difficulty: 'medium', about: 'both' })
    await fetchQ()
    setSaving(false)
  }

  const deleteQ = async (id) => {
    await supabase.from('trivia_questions').delete().eq('id', id)
    setQuestions(q => q.filter(x => x.id !== id))
    toast('Question removed')
  }

  if (loading) return <Loading />

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Add trivia question</p>
      <div style={styles.formCard}>
        <textarea className="input" placeholder="Question" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} style={{ resize: 'none', marginBottom: 10 }} rows={2} />
        {['a', 'b', 'c', 'd'].map(opt => (
          <div key={opt} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button
              style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${form.correct_answer === opt ? '#27AE60' : 'rgba(123,184,212,0.4)'}`, background: form.correct_answer === opt ? '#EAF5EA' : 'transparent', fontSize: 12, fontWeight: 700, color: form.correct_answer === opt ? '#27AE60' : '#8DA4B4', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setForm(f => ({ ...f, correct_answer: opt }))}
            >
              {opt.toUpperCase()}
            </button>
            <input className="input" placeholder={`Option ${opt.toUpperCase()}`} value={form[`option_${opt}`]} onChange={e => setForm(f => ({ ...f, [`option_${opt}`]: e.target.value }))} style={{ flex: 1 }} />
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#8DA4B4', marginBottom: 10 }}>Tap a letter to mark correct answer (currently: {form.correct_answer.toUpperCase()})</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} style={{ flex: 1 }}>
            <option value="easy">Easy (+50 XP)</option>
            <option value="medium">Medium (+100 XP)</option>
            <option value="hard">Hard (+150 XP)</option>
          </select>
          <select className="input" value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} style={{ flex: 1 }}>
            <option value="kevin">About Kevin</option>
            <option value="liz">About Liz</option>
            <option value="both">About Both</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={addQ} disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Adding...' : 'Add question'}
        </button>
      </div>

      <p style={{ ...styles.sectionTitle, marginTop: 20 }}>Questions loaded ({questions.length})</p>
      {questions.map((q, i) => (
        <div key={q.id} style={styles.subCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50', lineHeight: 1.4 }}>Q{i + 1}. {q.question}</p>
              <p style={{ fontSize: 12, color: '#27AE60', marginTop: 4 }}>✓ {q[`option_${q.correct_answer}`]}</p>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <span className={`badge ${q.difficulty === 'hard' ? 'badge-amber' : q.difficulty === 'easy' ? 'badge-sage' : 'badge-sky'}`} style={{ fontSize: 10 }}>{q.difficulty}</span>
                <span className="badge badge-periwinkle" style={{ fontSize: 10 }}>{q.about}</span>
              </div>
            </div>
            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12, alignSelf: 'flex-start' }} onClick={() => deleteQ(q.id)}>✕</button>
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

  const sendAlert = async () => {
    if (!message.trim()) return
    setSending(true)
    const user = JSON.parse(localStorage.getItem('fellowship_user') || '{}')
    await supabase.from('wall_posts').insert({
      user_id: user.id,
      content: message.trim(),
      is_alert: true,
      is_pinned: true,
    })
    toast('📢 Alert sent to the Fellowship!', 'success')
    setMessage('')
    setSending(false)
  }

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Send group alert</p>
      <div style={styles.formCard}>
        <p style={{ fontSize: 13, color: '#8DA4B4', marginBottom: 12, lineHeight: 1.5 }}>
          Alerts appear at the top of everyone's wall in a highlighted box. Use for time-sensitive info like meeting points, schedule changes, or emergencies.
        </p>
        <textarea
          className="input"
          placeholder="Type your alert... e.g. 'Everyone meet at the Vantage Hotel lobby at 9pm!'"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          style={{ resize: 'none', marginBottom: 12 }}
          maxLength={300}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#8DA4B4' }}>{message.length}/300</span>
        </div>
        <button
          className="btn btn-primary"
          onClick={sendAlert}
          disabled={!message.trim() || sending}
          style={{ width: '100%', background: 'linear-gradient(135deg, #4A6B8A, #2C4A6B)' }}
        >
          {sending ? 'Sending...' : '📢 Send to all members'}
        </button>
      </div>
    </div>
  )
}

function UsersTab() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', pin: '', team: 'both' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('id, username, team, is_admin, created_at').order('username')
    if (data) setUsers(data)
    setLoading(false)
  }

  const addUser = async () => {
    if (!form.username.trim() || form.pin.length !== 4) {
      toast('Name required + 4-digit PIN', 'error'); return
    }
    setSaving(true)
    try {
      const { data: hashData, error: hashError } = await supabase.rpc('hash_pin', { input_pin: form.pin })
      if (hashError) throw hashError
      const { error } = await supabase.from('users').insert({
        username: form.username.trim(),
        pin_hash: hashData,
        team: form.team,
        is_admin: false,
      })
      if (error) throw error
      toast(`${form.username} added!`, 'success')
      setForm({ username: '', pin: '', team: 'both' })
      await fetchUsers()
    } catch (err) {
      toast(err.message?.includes('unique') ? 'Username taken' : 'Error adding user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (id) => {
    await supabase.from('users').delete().eq('id', id)
    setUsers(u => u.filter(x => x.id !== id))
    toast('User removed')
  }

  if (loading) return <Loading />

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>Add member</p>
      <div style={styles.formCard}>
        <input className="input" placeholder="Name" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={{ marginBottom: 10 }} />
        <input className="input" type="tel" inputMode="numeric" placeholder="4-digit PIN" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={{ marginBottom: 10 }} />
        <select className="input" value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} style={{ marginBottom: 10 }}>
          <option value="kevin">Team Kevin 🏒</option>
          <option value="liz">Team Liz 🌸</option>
          <option value="both">Both sides 💍</option>
        </select>
        <button className="btn btn-primary" onClick={addUser} disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Adding...' : 'Add member'}
        </button>
      </div>

      <p style={{ ...styles.sectionTitle, marginTop: 20 }}>Members ({users.length})</p>
      {users.map(u => (
        <div key={u.id} style={styles.subCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50', fontFamily: 'Lato' }}>{u.username}</span>
                {u.is_admin && <span className="badge badge-amber" style={{ fontSize: 10 }}>Admin</span>}
              </div>
              <span style={{ fontSize: 12, color: '#8DA4B4' }}>
                Team {u.team === 'kevin' ? 'Kevin 🏒' : u.team === 'liz' ? 'Liz 🌸' : 'Both 💍'}
              </span>
            </div>
            {!u.is_admin && (
              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => deleteUser(u.id)}>Remove</button>
            )}
          </div>
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

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F8FA' },
  section: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#8DA4B4', textTransform: 'uppercase', letterSpacing: '0.8px' },
  formCard: { background: '#fff', borderRadius: 14, padding: 16, border: '1px solid rgba(123,184,212,0.2)' },
  subCard: { background: '#fff', borderRadius: 12, padding: '14px', border: '1px solid rgba(123,184,212,0.15)' },
}

const tabsStyle = { display: 'flex', gap: 2, paddingBottom: 12 }
const tabStyle = { padding: '7px 12px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#8DA4B4', cursor: 'pointer', fontFamily: 'Lato, sans-serif', whiteSpace: 'nowrap' }
const tabActiveStyle = { background: '#EEF4F8', color: '#2C4A6B' }
