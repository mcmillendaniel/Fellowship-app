import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { formatDistanceToNow } from 'date-fns'

export default function WallPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchPosts()
    const channel = supabase
      .channel('wall_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wall_posts' }, fetchPosts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('wall_posts')
      .select('*, users(username, team)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
    setLoading(false)
  }

  const submitPost = async () => {
    if (!newPost.trim() || submitting) return
    setSubmitting(true)
    const { error } = await supabase.from('wall_posts').insert({
      user_id: user.id,
      content: newPost.trim(),
    })
    if (error) {
      toast('Failed to post', 'error')
    } else {
      setNewPost('')
      toast('Posted!', 'success')
    }
    setSubmitting(false)
  }

  const deletePost = async (id) => {
    await supabase.from('wall_posts').delete().eq('id', id)
    toast('Post deleted')
  }

  const togglePin = async (id, current) => {
    await supabase.from('wall_posts').update({ is_pinned: !current }).eq('id', id)
    toast(!current ? 'Post pinned 📌' : 'Post unpinned')
  }

  const pinnedPosts = posts.filter(p => p.is_pinned || p.is_alert)
  const regularPosts = posts.filter(p => !p.is_pinned && !p.is_alert)

  return (
    <div style={styles.page}>
      {/* Compose box */}
      <div style={styles.compose}>
        <div style={styles.composeInner}>
          <div className={`avatar ${getAvatarClass(user?.team)}`} style={{ flexShrink: 0 }}>
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <textarea
            style={styles.textarea}
            placeholder="Share something with the Fellowship..."
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            rows={2}
            maxLength={500}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitPost()
            }}
          />
        </div>
        <div style={styles.composeFooter}>
          <span style={styles.charCount}>{newPost.length}/500</span>
          <button
            className="btn btn-primary"
            onClick={submitPost}
            disabled={!newPost.trim() || submitting}
            style={{ padding: '8px 20px', fontSize: 14 }}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="scroll" style={styles.feed}>
        {loading ? (
          <div style={styles.loading}><div className="spinner" /></div>
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {pinnedPosts.map(post => (
              <PostCard key={post.id} post={post} user={user} onDelete={deletePost} onTogglePin={togglePin} />
            ))}
            {regularPosts.map(post => (
              <PostCard key={post.id} post={post} user={user} onDelete={deletePost} onTogglePin={togglePin} />
            ))}
          </>
        )}
        <div ref={bottomRef} style={{ height: 16 }} />
      </div>
    </div>
  )
}

function PostCard({ post, user, onDelete, onTogglePin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const canModify = user?.is_admin || post.user_id === user?.id
  const initials = post.users?.username?.slice(0, 2).toUpperCase() || '??'
  const avatarClass = getAvatarClass(post.users?.team)
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true })

  return (
    <div style={{
      ...styles.postCard,
      ...(post.is_alert ? styles.alertCard : {}),
      ...(post.is_pinned ? styles.pinnedCard : {}),
    }} className="fade-in">
      {post.is_alert && (
        <div style={styles.alertBanner}>📢 Group Alert</div>
      )}
      {post.is_pinned && !post.is_alert && (
        <div style={styles.pinnedBanner}>📌 Pinned</div>
      )}
      <div style={styles.postHeader}>
        <div className={`avatar ${avatarClass}`}>{initials}</div>
        <div style={styles.postMeta}>
          <span style={styles.postAuthor}>{post.users?.username || 'Unknown'}</span>
          <span style={styles.postTime}>{timeAgo}</span>
        </div>
        {canModify && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button style={styles.menuTrigger} onClick={() => setMenuOpen(v => !v)}>⋯</button>
            {menuOpen && (
              <>
                <div style={styles.postMenu}>
                  {user?.is_admin && (
                    <button style={styles.postMenuItem} onClick={() => { onTogglePin(post.id, post.is_pinned); setMenuOpen(false) }}>
                      {post.is_pinned ? 'Unpin' : '📌 Pin post'}
                    </button>
                  )}
                  <button style={{ ...styles.postMenuItem, color: '#C0392B' }} onClick={() => { onDelete(post.id); setMenuOpen(false) }}>
                    Delete
                  </button>
                </div>
                <div style={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
              </>
            )}
          </div>
        )}
      </div>
      <p style={styles.postContent}>{post.content}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={styles.empty}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🏔️</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A', marginBottom: 4 }}>The wall awaits</p>
      <p style={{ fontSize: 13, color: '#8DA4B4' }}>Be the first to post something for the Fellowship</p>
    </div>
  )
}

function getAvatarClass(team) {
  if (team === 'kevin') return 'avatar-sky'
  if (team === 'liz') return 'avatar-periwinkle'
  return 'avatar-sage'
}

const styles = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#F5F8FA',
  },
  compose: {
    background: '#fff',
    borderBottom: '1px solid rgba(123,184,212,0.2)',
    padding: '12px 16px',
    flexShrink: 0,
  },
  composeInner: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  textarea: {
    flex: 1,
    border: '1.5px solid rgba(123,184,212,0.35)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 15,
    fontFamily: 'Lato, sans-serif',
    resize: 'none',
    outline: 'none',
    color: '#2C3E50',
    background: '#FAFCFE',
    lineHeight: 1.5,
  },
  composeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 46,
  },
  charCount: {
    fontSize: 12,
    color: '#8DA4B4',
  },
  feed: {
    flex: 1,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  postCard: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid rgba(123,184,212,0.18)',
    boxShadow: '0 2px 8px rgba(74,107,138,0.06)',
    padding: '14px 16px',
    overflow: 'hidden',
  },
  pinnedCard: {
    border: '1px solid rgba(123,184,212,0.4)',
    background: '#F8FBFE',
  },
  alertCard: {
    border: '1px solid rgba(139,159,212,0.5)',
    background: 'linear-gradient(135deg, #F0F4FF 0%, #F8FBFE 100%)',
  },
  alertBanner: {
    fontSize: 11,
    fontWeight: 700,
    color: '#4A5B8A',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: 10,
    padding: '3px 8px',
    background: 'rgba(139,159,212,0.15)',
    borderRadius: 4,
    display: 'inline-block',
  },
  pinnedBanner: {
    fontSize: 11,
    fontWeight: 700,
    color: '#4A6B8A',
    letterSpacing: '0.5px',
    marginBottom: 10,
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  postMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: 700,
    color: '#2C3E50',
    fontFamily: 'Lato, sans-serif',
  },
  postTime: {
    fontSize: 12,
    color: '#8DA4B4',
  },
  postContent: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  menuTrigger: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#8DA4B4',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  postMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: '#fff',
    borderRadius: 10,
    border: '1px solid rgba(123,184,212,0.25)',
    boxShadow: '0 4px 16px rgba(74,107,138,0.15)',
    minWidth: 140,
    zIndex: 200,
    overflow: 'hidden',
  },
  postMenuItem: {
    display: 'block',
    width: '100%',
    padding: '11px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontSize: 14,
    fontWeight: 600,
    color: '#2C3E50',
    cursor: 'pointer',
    fontFamily: 'Lato, sans-serif',
  },
  menuOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 150,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: 40,
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#8DA4B4',
  },
}
