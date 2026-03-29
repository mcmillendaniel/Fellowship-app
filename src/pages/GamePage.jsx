import { useState, useEffect } from 'react'
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
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const [qRes, aRes] = await Promise.all([
        supabase.from('trivia_questions').select('*').order('created_at'),
        supabase.from('trivia_answers').select('*').eq('user_id', user.id),
      ])
      if (qRes.data) setQuestions(qRes.data)
      if (aRes.data) {
        const map = {}
        aRes.data.forEach(a => { map[a.question_id] = a })
        setAnswered(map)
      }
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  const submitAnswer = async (question, choice) => {
    if (answered[question.id]) return
    const isCorrect = choice === question.correct_answer
    const xp = isCorrect ? (question.difficulty === 'hard' ? 150 : question.difficulty === 'easy' ? 50 : 100) : 0

    await supabase.from('trivia_answers').insert({
      question_id: question.id,
      user_id: user.id,
      selected_answer: choice,
      is_correct: isCorrect,
      xp_awarded: xp,
    })

    setAnswered(prev => ({ ...prev, [question.id]: { selected_answer: choice, is_correct: isCorrect } }))
    if (isCorrect) toast(`✨ Correct! +${xp} Stars`, 'success')
    else toast('Not quite! Better luck next one.', 'error')
  }

  if (loading) return <div style={centerStyle}><div className="spinner" /></div>

  if (questions.length === 0) return (
    <div style={centerStyle}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A' }}>Trivia coming soon</p>
      <p style={{ fontSize: 13, color: '#8DA4B4', marginTop: 4 }}>Check back once the questions are loaded!</p>
    </div>
  )

  const answeredCount = Object.keys(answered).length
  const correctCount = Object.values(answered).filter(a => a.is_correct).length

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress */}
      <div style={styles.progressCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4A6B8A' }}>Your progress</span>
          <span style={{ fontSize: 13, color: '#8DA4B4' }}>{answeredCount}/{questions.length}</span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
        <p style={{ fontSize: 12, color: '#8DA4B4', marginTop: 6 }}>
          {correctCount} correct · {answeredCount - correctCount} missed
        </p>
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={i}
          answer={answered[q.id]}
          onAnswer={(choice) => submitAnswer(q, choice)}
        />
      ))}
    </div>
  )
}

function QuestionCard({ question, index, answer, onAnswer }) {
  const options = [
    { key: 'a', text: question.option_a },
    { key: 'b', text: question.option_b },
    { key: 'c', text: question.option_c },
    { key: 'd', text: question.option_d },
  ]

  const difficultyColor = question.difficulty === 'hard' ? 'badge-amber' : question.difficulty === 'easy' ? 'badge-sage' : 'badge-sky'

  return (
    <div style={styles.questionCard} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#8DA4B4', fontWeight: 600 }}>Q{index + 1}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={`badge ${difficultyColor}`}>{question.difficulty}</span>
          {question.about && <span className="badge badge-periwinkle">{question.about}</span>}
        </div>
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50', lineHeight: 1.4, marginBottom: 14 }}>
        {question.question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => {
          const isSelected = answer?.selected_answer === opt.key
          const isCorrect = question.correct_answer === opt.key
          let style = styles.optionBtn
          if (answer) {
            if (isCorrect) style = { ...style, ...styles.optionCorrect }
            else if (isSelected && !answer.is_correct) style = { ...style, ...styles.optionWrong }
            else style = { ...style, ...styles.optionDimmed }
          }
          return (
            <button key={opt.key} style={style} onClick={() => onAnswer(opt.key)} disabled={!!answer}>
              <span style={styles.optionLetter}>{opt.key.toUpperCase()}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{opt.text}</span>
              {answer && isCorrect && <span>✓</span>}
              {answer && isSelected && !answer.is_correct && <span>✗</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TasksSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [showSubmit, setShowSubmit] = useState(null)
  const [submitText, setSubmitText] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const [tRes, sRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('is_active', true).order('created_at'),
        supabase.from('task_submissions').select('*').eq('user_id', user.id),
      ])
      if (tRes.data) setTasks(tRes.data)
      if (sRes.data) {
        const map = {}
        sRes.data.forEach(s => { map[s.task_id] = s })
        setSubmissions(map)
      }
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  const submitTask = async (task, file) => {
    setUploading(task.id)
    try {
      let photoUrl = null

      if (file && task.requires_photo) {
        // Compress image
        const compressed = await compressImage(file)
        const filename = `${user.id}/${task.id}_${Date.now()}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task-photos')
          .upload(filename, compressed, { contentType: 'image/jpeg', upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('task-photos').getPublicUrl(filename)
          photoUrl = urlData?.publicUrl
        }
      }

      await supabase.from('task_submissions').upsert({
        task_id: task.id,
        user_id: user.id,
        photo_url: photoUrl,
        status: 'pending',
        xp_awarded: 0,
      }, { onConflict: 'task_id,user_id' })

      setSubmissions(prev => ({ ...prev, [task.id]: { status: 'pending', photo_url: photoUrl } }))
      toast('Quest submitted! Awaiting admin approval 🏆', 'success')
      setShowSubmit(null)
    } catch (err) {
      toast('Submission failed, try again', 'error')
    } finally {
      setUploading(null)
    }
  }

  if (loading) return <div style={centerStyle}><div className="spinner" /></div>

  if (tasks.length === 0) return (
    <div style={centerStyle}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A' }}>Quests loading soon</p>
      <p style={{ fontSize: 13, color: '#8DA4B4', marginTop: 4 }}>Check back once the admin loads the quest list!</p>
    </div>
  )

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#8DA4B4', textAlign: 'center' }}>
        Complete quests, submit proof, earn ⭐️
      </p>
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          submission={submissions[task.id]}
          uploading={uploading === task.id}
          onSubmit={(file) => submitTask(task, file)}
          showSubmit={showSubmit === task.id}
          onToggleSubmit={() => setShowSubmit(showSubmit === task.id ? null : task.id)}
        />
      ))}
    </div>
  )
}

function TaskCard({ task, submission, uploading, onSubmit, showSubmit, onToggleSubmit }) {
  const [selectedFile, setSelectedFile] = useState(null)

  const statusColor = !submission ? 'badge-sky' :
    submission.status === 'approved' ? 'badge-approved' :
    submission.status === 'rejected' ? 'badge-rejected' : 'badge-pending'

  const statusText = !submission ? 'Not started' :
    submission.status === 'approved' ? `✓ Approved (+${submission.xp_awarded} ⭐️)` :
    submission.status === 'rejected' ? 'Needs retry' : '⏳ Pending review'

  return (
    <div style={styles.taskCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={styles.xpBadge}>⭐️ {task.xp_value} ⭐️</span>
            {task.requires_photo && <span className="badge badge-sky" style={{ fontSize: 10 }}>📸 Photo</span>}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50', lineHeight: 1.35, marginBottom: 4 }}>{task.title}</p>
          {task.description && <p style={{ fontSize: 13, color: '#8DA4B4', lineHeight: 1.4 }}>{task.description}</p>}
        </div>
        <span className={`badge ${statusColor}`} style={{ marginLeft: 8, flexShrink: 0, fontSize: 11 }}>{statusText}</span>
      </div>

      {!submission || submission.status === 'rejected' ? (
        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: 12, fontSize: 13 }}
          onClick={onToggleSubmit}
          disabled={uploading}
        >
          {uploading ? 'Submitting...' : showSubmit ? 'Cancel' : 'Submit quest'}
        </button>
      ) : null}

      {showSubmit && (
        <div style={styles.submitForm}>
          {task.requires_photo && (
            <label style={styles.photoUpload}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <span style={{ color: '#27AE60', fontWeight: 700, fontSize: 13 }}>
                  📸 {selectedFile.name.slice(0, 30)}...
                </span>
              ) : (
                <span style={{ color: '#7BB8D4', fontWeight: 700, fontSize: 13 }}>
                  📸 Tap to add photo
                </span>
              )}
            </label>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', fontSize: 14 }}
            onClick={() => onSubmit(selectedFile)}
            disabled={uploading || (task.requires_photo && !selectedFile)}
          >
            {uploading ? 'Submitting...' : 'Submit for review'}
          </button>
        </div>
      )}
    </div>
  )
}

async function compressImage(file, maxWidth = 1400, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob) }, 'image/jpeg', quality)
    }
    img.src = url
  })
}

const centerStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F8FA' },
  progressCard: { background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(123,184,212,0.2)' },
  progressBar: { height: 8, background: '#E8F4FA', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #7BB8D4, #8B9FD4)', borderRadius: 4, transition: 'width 0.5s ease' },
  questionCard: { background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid rgba(123,184,212,0.18)', boxShadow: '0 2px 8px rgba(74,107,138,0.05)' },
  optionBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 8, border: '1.5px solid rgba(123,184,212,0.3)', background: '#FAFCFE', cursor: 'pointer', fontSize: 14, color: '#2C3E50', fontFamily: 'Lato,sans-serif', transition: 'all 0.15s', width: '100%' },
  optionCorrect: { background: '#EAF5EA', border: '1.5px solid #27AE60', color: '#1A6B35' },
  optionWrong: { background: '#FDEAEA', border: '1.5px solid #C0392B', color: '#8B2020' },
  optionDimmed: { opacity: 0.4 },
  optionLetter: { width: 22, height: 22, background: 'rgba(123,184,212,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#4A6B8A', flexShrink: 0 },
  taskCard: { background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid rgba(123,184,212,0.18)', boxShadow: '0 2px 8px rgba(74,107,138,0.05)' },
  xpBadge: { background: 'linear-gradient(135deg, #FFF5E6, #FFF0D0)', color: '#B8600A', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: '1px solid rgba(184,96,10,0.15)' },
  submitForm: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  photoUpload: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', border: '2px dashed rgba(123,184,212,0.5)', borderRadius: 10, cursor: 'pointer', background: '#F8FBFE' },
}
