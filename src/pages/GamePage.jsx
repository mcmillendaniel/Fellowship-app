import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'

export default function GamePage() {
  const [tab, setTab] = useState('trivia')
  return (
    <div style={styles.page}>
      <div style={{ padding: '12px 16px 0', background: '#fff', borderBottom: '1px solid rgba(123,184,212,0.2)' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'trivia' ? 'active' : ''}`} onClick={() => setTab('trivia')}>
            🧠 Trivia
          </button>
          <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            ⭐ Quests
          </button>
        </div>
      </div>
      <div className="scroll" style={{ flex: 1 }}>
        {tab === 'trivia' ? <TriviaSection /> : <TasksSection />}
      </div>
    </div>
  )
}

function TriviaSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [questions, setQuestions] = useState([])
  const [answered, setAnswered] = useState({})
  const [loading, setLoading] = useState(true)
  const [triviaActive, setTriviaActive] = useState(false)

  useEffect(() => {
    loadTrivia()
    loadAnswered()
  }, [])

  const loadTrivia = async () => {
    // Check if trivia is active — if any question is active, show trivia
    const { data } = await supabase
      .from('trivia_questions')
      .select('*')
      .eq('is_active', true)
      .order('stars', { ascending: true })
    setQuestions(data || [])
    setTriviaActive((data || []).length > 0)
    setLoading(false)
  }

  const loadAnswered = async () => {
    const { data } = await supabase
      .from('trivia_answers')
      .select('*')
      .eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(a => { map[a.question_id] = a })
      setAnswered(map)
    }
  }

  if (loading) return <div style={centerStyle}><div className="spinner" /></div>

  if (!triviaActive) return (
    <div style={centerStyle}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A' }}>Trivia coming soon</p>
      <p style={{ color: '#888', fontSize: 14 }}>Check back later, Fellowship member</p>
    </div>
  )

  const totalStars = questions.reduce((sum, q) => {
    const a = answered[q.id]
    if (!a) return sum
    return sum + (a.stars_awarded || 0)
  }, 0)

  const maxStars = questions.reduce((sum, q) => sum + q.stars, 0)

  return (
    <div style={{ padding: '16px', paddingBottom: 80 }}>
      <div style={scoreCard}>
        <span style={{ fontSize: 13, color: '#4A6B8A', fontWeight: 600 }}>Your Score</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#4A6B8A' }}>{totalStars} / {maxStars} ⭐</span>
      </div>
      {questions.map(q => (
        <QuestionCard
          key={q.id}
          question={q}
          existing={answered[q.id]}
          onAnswered={(result) => {
            setAnswered(prev => ({ ...prev, [q.id]: result }))
            if (result.stars_awarded === q.stars) toast(`✨ Correct! +${q.stars}⭐`, 'success')
            else if (result.stars_awarded > 0) toast(`Almost! +${result.stars_awarded}⭐ partial credit`, 'info')
            else toast('Not quite! Better luck next one.', 'error')
          }}
          user={user}
        />
      ))}
    </div>
  )
}

function QuestionCard({ question, existing, onAnswered, user }) {
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(10)
  const [timerActive, setTimerActive] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [started, setStarted] = useState(false)
  const intervalRef = useRef(null)
  const inputRef = useRef(null)

  const alreadyAnswered = !!existing

  const startQuestion = () => {
    setStarted(true)
    setTimerActive(true)
    setTimeLeft(10)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  useEffect(() => {
    if (!timerActive) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setTimerActive(false)
          if (!submitted) handleSubmit('', true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [timerActive])

  const normalize = (str) => str.toLowerCase().trim().replace(/['']/g, "'")

  const checkAnswer = (raw) => {
    const ans = normalize(raw)
    if (!ans) return { correct: false, partial: false }

    const accepted = (question.accepted_answers || '').split('|').map(normalize).filter(Boolean)
    const alternates = (question.alternate_answers || '').split('|').map(normalize).filter(Boolean)

    if (accepted.some(a => a === ans)) return { correct: true, partial: false }
    if (alternates.some(a => a === ans)) return { correct: false, partial: true }
    return { correct: false, partial: false }
  }

  const handleSubmit = async (overrideInput, timedOut = false) => {
    if (submitted || alreadyAnswered) return
    clearInterval(intervalRef.current)
    setTimerActive(false)
    setSubmitted(true)

    const raw = timedOut ? '' : (overrideInput !== undefined ? overrideInput : input)
    const { correct, partial } = checkAnswer(raw)
    const starsAwarded = correct ? question.stars : partial ? 0.5 : 0

    const record = {
      question_id: question.id,
      user_id: user.id,
      selected_answer: raw,
      is_correct: correct,
      stars_awarded: starsAwarded,
    }

    await supabase.from('trivia_answers').insert(record)
    onAnswered(record)
  }

  if (alreadyAnswered) {
    const { is_correct, stars_awarded, selected_answer } = existing
    return (
      <div style={{ ...cardStyle, borderLeft: `4px solid ${is_correct ? '#4CAF50' : stars_awarded > 0 ? '#FF9800' : '#e57373'}` }}>
        <div style={categoryBadge(question.category)}>{question.category}</div>
        <p style={qText}>{question.question}</p>
        <div style={answerRow}>
          <span style={{ fontSize: 13, color: '#888' }}>Your answer: <strong>{selected_answer || '(no answer)'}</strong></span>
          <span style={{ fontSize: 16 }}>{is_correct ? '✅' : stars_awarded > 0 ? '🟡' : '❌'} {stars_awarded}⭐</span>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div style={cardStyle}>
        <div style={categoryBadge(question.category)}>{question.category}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ ...qText, margin: 0 }}>{'⭐'.repeat(question.stars)}</p>
        </div>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>10 seconds to answer once started</p>
        <button style={startBtn} onClick={startQuestion}>Start Question</button>
      </div>
    )
  }

  const timerColor = timeLeft <= 3 ? '#e53935' : timeLeft <= 6 ? '#FF9800' : '#4CAF50'

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={categoryBadge(question.category)}>{question.category}</div>
        <div style={{ ...timerCircle, borderColor: timerColor, color: timerColor }}>{timeLeft}</div>
      </div>
      <p style={qText}>{question.question}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          ref={inputRef}
          style={inputStyle}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Type your answer..."
          disabled={submitted || timeLeft === 0}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <button
          style={submitBtn}
          onClick={() => handleSubmit()}
          disabled={submitted || timeLeft === 0 || !input.trim()}
        >
          →
        </button>
      </div>
      <div style={{ marginTop: 8, height: 4, background: '#eee', borderRadius: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: timerColor, width: `${(timeLeft / 10) * 100}%`, transition: 'width 1s linear, background 0.3s' }} />
      </div>
    </div>
  )
}


const LOCATION_COORDS = {
  'Green Man Brewing':        { lat: 35.5672, lng: -82.5547, type: 'tight' },
  'Wicked Weed Funkatorium':  { lat: 35.5657, lng: -82.5564, type: 'tight' },
  'New Belgium Brewing':      { lat: 35.5760, lng: -82.5807, type: 'tight' },
  'Burial Beer':              { lat: 35.5658, lng: -82.5541, type: 'tight' },
  'Hi-Wire Brewing':          { lat: 35.5664, lng: -82.5540, type: 'tight' },
  'Twin Leaf Brewing':        { lat: 35.5660, lng: -82.5562, type: 'tight' },
  'DSSOLVR':                  { lat: 35.5793, lng: -82.5573, type: 'tight' },
  'One World Brewing':        { lat: 35.5751, lng: -82.5565, type: 'tight' },
  'Level 256 Arcade Bar':     { lat: 35.5663, lng: -82.5548, type: 'tight' },
  'Honeypot Vintage':         { lat: 35.5794, lng: -82.5572, type: 'tight' },
  'Lexington Park Antiques':  { lat: 35.5772, lng: -82.5559, type: 'tight' },
  'Lexington Ave Corridor':   { lat: 35.5793, lng: -82.5573, type: 'large' },
  'Pack Square/Downtown Asheville': { lat: 35.5752, lng: -82.5541, type: 'city' },
  'River Arts District':      { lat: 35.5760, lng: -82.5820, type: 'large' },
}

const GEOFENCE_RADIUS = { tight: 20, large: 75, city: 5000 }

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function isInGeofence(task, userLat, userLng) {
  if (!task.geofence_location || !userLat || !userLng) return false
  const loc = LOCATION_COORDS[task.geofence_location]
  if (!loc) return false
  const type = task.geofence_type || loc.type || 'tight'
  const radius = GEOFENCE_RADIUS[type] ?? 20
  return getDistanceMeters(userLat, userLng, loc.lat, loc.lng) <= radius
}

function TasksSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [locLoading, setLocLoading] = useState(true)

  useEffect(() => {
    loadData()
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocLoading(false) },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const loadData = async () => {
    const [{ data: taskData }, { data: subData }] = await Promise.all([
      supabase.from('fellowship_quests').select('*').order('stars', { ascending: true }),
      supabase.from('task_submissions').select('*').eq('user_id', user.id)
    ])
    setTasks(taskData || [])
    const map = {}
    ;(subData || []).forEach(s => { map[s.task_id] = s })
    setSubmissions(map)
    setLoading(false)
  }

  const handlePhoto = async (task, file) => {
    if (!file) return
    setUploading(task.id)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${task.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('quest-photos').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('quest-photos').getPublicUrl(path)
      await supabase.from('task_submissions').insert({
        task_id: task.id, user_id: user.id, photo_url: publicUrl, status: 'pending', stars_awarded: 0,
      })
      await loadData()
      toast('\ud83d\udcf8 Submitted! Awaiting admin approval.', 'success')
    } catch (e) { toast('Upload failed. Try again.', 'error') }
    setUploading(null)
  }

  const handleMarkComplete = async (task) => {
    try {
      await supabase.from('task_submissions').insert({
        task_id: task.id, user_id: user.id, photo_url: null, status: 'pending', stars_awarded: 0,
      })
      await loadData()
      toast('\u2705 Marked complete! Awaiting admin approval.', 'success')
    } catch (e) { toast('Something went wrong. Try again.', 'error') }
  }

  if (loading || locLoading) return <div style={centerStyle}><div className="spinner" /></div>

  const visibleTasks = tasks.filter(t => isInGeofence(t, userLat, userLng))

  if (!visibleTasks.length) return (
    <div style={centerStyle}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>\ud83d\uddfa\ufe0f</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A', fontSize: 16 }}>No quests nearby</p>
      <p style={{ color: '#888', fontSize: 14, maxWidth: 260, lineHeight: 1.5 }}>
        Update your location to see if any quests are available!
      </p>
      <button
        style={{ ...startBtn, marginTop: 16, width: 'auto', padding: '10px 24px' }}
        onClick={() => {
          setLocLoading(true)
          navigator.geolocation?.getCurrentPosition(
            pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocLoading(false) },
            () => setLocLoading(false),
            { enableHighAccuracy: true, timeout: 8000 }
          )
        }}
      >
        \ud83d\udccd Refresh Location
      </button>
    </div>
  )

  return (
    <div style={{ padding: '16px', paddingBottom: 80 }}>
      {visibleTasks.map(task => {
        const sub = submissions[task.id]
        const requiresPhoto = task.requires_photo === true || task.requires_photo === 'TRUE'
        return (
          <div key={task.id} style={{ ...cardStyle, borderLeft: `4px solid ${sub ? (sub.status === 'approved' ? '#4CAF50' : '#FF9800') : '#7BB8D4'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
              <p style={{ ...qText, margin: 0 }}>{task.title}</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4A6B8A', whiteSpace: 'nowrap', marginLeft: 8 }}>{'\u2b50'.repeat(task.stars)}</span>
            </div>
            {task.geofence_location && (
              <p style={{ fontSize: 11, color: '#7BB8D4', fontWeight: 600, margin: '2px 0 8px', letterSpacing: '0.3px' }}>
                \ud83d\udccd {task.geofence_location}
              </p>
            )}
            {task.description && <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>{task.description}</p>}
            {sub ? (
              <div style={{ fontSize: 13, color: sub.status === 'approved' ? '#4CAF50' : '#FF9800', fontWeight: 600 }}>
                {sub.status === 'approved' ? `\u2705 Approved! +${sub.stars_awarded}\u2b50` : '\u23f3 Pending review'}
              </div>
            ) : requiresPhoto ? (
              <label style={{ ...startBtn, display: 'inline-block', cursor: 'pointer', textAlign: 'center' }}>
                {uploading === task.id ? 'Uploading...' : '\ud83d\udcf8 Submit Photo'}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => handlePhoto(task, e.target.files[0])} />
              </label>
            ) : (
              <button
                style={startBtn}
                onClick={() => handleMarkComplete(task)}
                disabled={uploading === task.id}
              >
                \u2714 Mark Completed
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const centerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: 24 }

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '14px 16px',
  marginBottom: 14,
  boxShadow: '0 2px 8px rgba(123,184,212,0.12)',
  borderLeft: '4px solid #7BB8D4',
}

const qText = {
  fontSize: 15,
  fontWeight: 700,
  color: '#2C3E50',
  marginBottom: 4,
  lineHeight: 1.4,
}

const inputStyle = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #7BB8D4',
  fontSize: 15,
  outline: 'none',
  background: '#f8fbfd',
}

const submitBtn = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#7BB8D4',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
}

const startBtn = {
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#7BB8D4',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
}

const timerCircle = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '3px solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 15,
  transition: 'color 0.3s, border-color 0.3s',
}

const answerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 6,
}

const scoreCard = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'linear-gradient(135deg, #e8f4fd, #f0f8ff)',
  borderRadius: 12,
  padding: '12px 16px',
  marginBottom: 16,
  border: '1px solid rgba(123,184,212,0.3)',
}

const categoryColors = {
  Kevin: '#5C85D6',
  Liz: '#D65CA0',
  Cats: '#E8A838',
  Couple: '#56B068',
}

const categoryBadge = (cat) => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  background: categoryColors[cat] || '#7BB8D4',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fbfd' }
}
