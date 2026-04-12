function TriviaSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [questions, setQuestions] = useState([])
  const [answered, setAnswered] = useState({})
  const [loading, setLoading] = useState(true)
  const [triviaActive, setTriviaActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('question')
  const [leaderboard, setLeaderboard] = useState([])

  const ROUND_SIZE = 4

  useEffect(() => { loadTrivia(); loadAnswered() }, [])

  const loadTrivia = async () => {
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
    const { data } = await supabase.from('trivia_answers').select('*').eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(a => { map[a.question_id] = a })
      setAnswered(map)
    }
  }

  const loadLeaderboard = async () => {
    const { data: answers } = await supabase.from('trivia_answers').select('user_id, stars_awarded')
    const { data: users } = await supabase.from('users').select('id, username, team')
    if (!answers || !users) return
    const totals = {}
    answers.forEach(a => { totals[a.user_id] = (totals[a.user_id] || 0) + (a.stars_awarded || 0) })
    const board = users
      .map(u => ({ username: u.username, team: u.team, stars: totals[u.id] || 0 }))
      .filter(u => u.stars > 0)
      .sort((a, b) => b.stars - a.stars)
    setLeaderboard(board)
  }

  useEffect(() => {
    if (questions.length === 0) return
    const firstUnanswered = questions.findIndex(q => !answered[q.id])
    if (firstUnanswered === -1) { setPhase('done'); return }
    setCurrentIndex(firstUnanswered)
  }, [questions, answered])

  const handleAnswered = (result) => {
    const newAnswered = { ...answered, [questions[currentIndex].id]: result }
    setAnswered(newAnswered)

    if (result.stars_awarded === questions[currentIndex].stars) toast(`✨ Correct! +${questions[currentIndex].stars}⭐`, 'success')
    else if (result.stars_awarded > 0) toast(`Almost! +${result.stars_awarded}⭐ partial credit`, 'info')
    else toast('Not quite!', 'error')

    const nextIndex = currentIndex + 1
    const justFinishedRound = nextIndex % ROUND_SIZE === 0 || nextIndex >= questions.length

    if (justFinishedRound) {
      setCurrentIndex(nextIndex)
      setPhase('round-end')
    } else {
      setCurrentIndex(nextIndex)
    }
  }

  const handleSeeLeaderboard = async () => {
    await loadLeaderboard()
    setPhase('leaderboard')
  }

  const handleStartNextRound = () => {
    if (currentIndex >= questions.length) { setPhase('done'); return }
    setPhase('question')
  }

  if (loading) return <div style={centerStyle}><div className="spinner" /></div>

  if (!triviaActive) return (
    <div style={centerStyle}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A' }}>Trivia coming soon</p>
      <p style={{ color: '#888', fontSize: 14 }}>Check back later, Fellowship member</p>
    </div>
  )

  const roundNumber = Math.floor(currentIndex / ROUND_SIZE) + 1
  const totalRounds = Math.ceil(questions.length / ROUND_SIZE)
  const roundStart = Math.floor(currentIndex / ROUND_SIZE) * ROUND_SIZE
  const roundEnd = Math.min(roundStart + ROUND_SIZE, questions.length)
  const posInRound = currentIndex - roundStart + 1

  if (phase === 'done') {
    const totalStars = questions.reduce((sum, q) => {
      const a = answered[q.id]; return sum + (a ? (a.stars_awarded || 0) : 0)
    }, 0)
    const maxStars = questions.reduce((sum, q) => sum + q.stars, 0)
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
        <p style={{ fontWeight: 800, fontSize: 20, color: '#4A6B8A', marginBottom: 4 }}>Trivia Complete!</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50' }}>{totalStars} / {maxStars} ⭐</p>
        <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Well played, Fellowship member</p>
      </div>
    )
  }

  if (phase === 'round-end') {
    const completedRound = Math.ceil(currentIndex / ROUND_SIZE)
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⚔️</div>
        <p style={{ fontWeight: 800, fontSize: 22, color: '#4A6B8A', marginBottom: 4 }}>
          Round {completedRound} Complete!
        </p>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>The Fellowship rests...</p>
        <button style={{ ...startBtn, width: 'auto', padding: '12px 32px', fontSize: 15 }} onClick={handleSeeLeaderboard}>
          📊 See Leaderboard
        </button>
      </div>
    )
  }

  if (phase === 'leaderboard') {
    const completedRound = Math.ceil(currentIndex / ROUND_SIZE)
    const isLastRound = currentIndex >= questions.length
    return (
      <div style={{ padding: '24px 16px', paddingBottom: 80 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🏅</div>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#4A6B8A', margin: 0 }}>Current Standings</p>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>After Round {completedRound}</p>
        </div>
        <div style={{ marginBottom: 24 }}>
          {leaderboard.map((entry, i) => (
            <div key={entry.username} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 8,
              boxShadow: '0 2px 8px rgba(123,184,212,0.12)',
              borderLeft: `4px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#7BB8D4'}`
            }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#4A6B8A', width: 24 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 700, color: '#2C3E50' }}>{entry.username}</span>
              <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>{entry.team}</span>
              <span style={{ fontWeight: 800, color: '#4A6B8A' }}>{entry.stars}⭐</span>
            </div>
          ))}
          {leaderboard.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No scores yet</p>}
        </div>
        {!isLastRound ? (
          <button style={{ ...startBtn, padding: '12px 32px', fontSize: 15 }} onClick={handleStartNextRound}>
            ⚔️ Start Round {completedRound + 1}
          </button>
        ) : (
          <button style={{ ...startBtn, padding: '12px 32px', fontSize: 15 }} onClick={() => setPhase('done')}> 
            🏆 Finish
          </button>
        )}
      </div>
    )
  }

  const totalStars = questions.reduce((sum, q) => {
    const a = answered[q.id]
    return sum + (a ? (a.stars_awarded || 0) : 0)
  }, 0)

  const maxStars = questions.reduce((sum, q) => sum + q.stars, 0)

  return (
    <div style={{ padding: '16px', paddingBottom: 80 }}>
      <div style={scoreCard}>
        <span style={{ fontSize: 13, color: '#4A6B8A', fontWeight: 600 }}>Your Score</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#4A6B8A' }}>{totalStars} / {maxStars} ⭐</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#888' }}>Round {roundNumber} of {totalRounds}</span>
        <span style={{ fontSize: 13, color: '#888' }}>Question {posInRound} of {roundEnd - roundStart}</span>
      </div>
      <QuestionCard
        key={questions[currentIndex].id}
        question={questions[currentIndex]}
        existing={answered[questions[currentIndex].id]}
        onAnswered={handleAnswered}
        user={user}
      />
    </div>
  )
}