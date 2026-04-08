import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { formatDistanceToNow } from 'date-fns'

export default function WallPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [channels, setChannels] = useState([])
  const [activeChannelId, setActiveChannelId] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchChannels()
  }, [])

  useEffect(() => {
    if (!activeChannelId) return
    fetchPosts(activeChannelId)

    const channel = supabase
      .channel(`wall_posts_${activeChannelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wall_posts',
        filter: `channel_id=eq.${activeChannelId}`,
      }, () => fetchPosts(activeChannelId))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [activeChannelId])

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('wall_channels')
      .select('*')
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setChannels(data)
      setActiveChannelId(data[0].id)
    }
  }

  const fetchPosts = async (channelId) => {
    setLoading(true)
    const { data } = await supabase
      .from('wall_posts')
      .select('*, users(username, team)')
      .eq('channel_id', channelId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
    setLoading(false)
  }

  const submitPost = async () => {
    if (!newPost.trim() || submitting || !activeChannelId) return
    setSubmitting(true)
    const { error } = await supabase.from('wall_posts').insert({
      user_id: user.id,
      content: newPost.trim(),
      channel_id: activeChannelId,
    })
    if (error) {
      toast('Failed to post', 'error')
    } else {
      setNewPost('')
      toast('Posted!', 'success')
    }
    setSubmitting(false)
  }

  const createChannel = async () => {
    const name = newChannelName.trim()
    if (!name || creatingChannel) return
    setCreatingChannel(true)
    const { data, error } = await supabase
      .from('wall_channels')
      .insert({ name, created_by: user.id })
      .select()
      .single()
    if (error) {
      toast('Failed to create channel', 'error')
    } else {
      setChannels(prev => [...prev, data])
      setActiveChannelId(data.id)
      setNewChannelName('')
      setShowNewChannel(false)
      toast(`#${name} created!`, 'success')
    }
    setCreatingChannel(false)
  }

  const deletePost = async (id) => {
    await supabase.from('wall_posts').delete().eq('id', id)
    toast('Post deleted')
  }

  const togglePin = async (id, current) => {
    await supabase.from('wall_posts').update({ is_pinned: !current }).eq('id', id)
    toast(!current ? 'Post pinned 📌' : 'Post unpinned')
  }

  const activeChannel = channels.find(c => c.id === activeChannelId)
  const pinnedPosts = posts.filter(p => p.is_pinned || p.is_alert)
  const regularPosts = posts.filter(p => !p.is_pinned && !p.is_alert)

  return (
    <div style={styles.page}>

      {/* Channel Bar */}
      <div style={styles.channelBar}>
        <div style={styles.channelList}>
          {channels.map(ch => (
            <button
              key={ch.id}
              style={{
                ...styles.channelTab,
                ...(ch.id === activeChannelId ? styles.channelTabActive : {}),
              }}
              onClick={() => setActiveChannelId(ch.id)}
            >
              # {ch.name}
            </button>
          ))}
          <button
            style={styles.newChannelBtn}
            onClick={() => setShowNewChannel(v => !v)}
            title="New channel"
          >
            +
          </button>
        </div>

        {showNewChannel && (
          <div style={styles.newChannelRow}>
            <input
              style={styles.newChannelInput}
              placeholder="Channel name..."
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              maxLength={40}
              onKeyDown={e => {
                if (e.key === 'Enter') createChannel()
                if (e.key === 'Escape') { setShowNewChannel(false); setNewChannelName('') }
              }}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={createChannel}
              disabled={!newChannelName.trim() || creatingChannel}
              style={{ padding: '6px 14px', fontSize: 13, flexShrink: 0 }}
            >
              {creatingChannel ? '...' : 'Create'}
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => { setShowNewChannel(false); setNewChannelName('') }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Compose box */}
      <div style={styles.compose}>
        <div style={styles.composeInner}>
          <div className={`avatar ${getAvatarClass(user?.team)}`} style={{ flexShrink: 0 }}>
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <textarea
            style={styles.textarea}
            placeholder={activeChannel ? `Post to #${activeChannel.name}...` : 'Share something with the Fellowship...'}
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
          <EmptyState channelName={activeChannel?.name} />
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
    <div
      style={{
        ...styles.postCard,
        ...(post.is_alert ? styles.alertCard : {}),
        ...(post.is_pinned ? styles.pinnedCard : {}),
      }}
      className="fade-in"
    >
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
                    <button
                      style={styles.postMenuItem}
                      onClick={() => { onTogglePin(post.id, post.is_pinned); setMenuOpen(false) }}
                    >
                      {post.is_pinned ? 'Unpin' : '📌 Pin post'}
                    </button>
                  )}
                  <button
                    style={{ ...styles.postMenuItem, color: '#C0392B' }}
                    onClick={() => { onDelete(post.id); setMenuOpen(false) }}
                  >
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

function EmptyState({ channelName }) {
  return (
    <div style={styles.empty}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🏔️</div>
      <p style={{ fontWeight: 700, color: '#4A6B8A', marginBottom: 4 }}>
        {channelName ? `#${channelName} is empty` : 'The wall awaits'}
      </p>
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
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', flex: 1, minHeight: 0, background: '#F5F8FA' },
  channelBar: { background: '#fff', borderBottom: '1px solid rgba(123,184,212,0.25)', flexShrink: 0 },
  channelList: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' },
  channelTab: { background: 'none', border: '1.5px solid rgba(123,184,212,0.3)', borderRadius: 20, padding: '5px 13px', fontSize: 13, fontWeight: 600, color: '#4A6B8A', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Lato, sans-serif', transition: 'all 0.15s', flexShrink: 0 },
  channelTabActive: { background: '#7BB8D4', borderColor: '#7BB8D4', color: '#fff' },
  newChannelBtn: { background: 'none', border: '1.5px dashed rgba(123,184,212,0.5)', borderRadius: 20, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#7BB8D4', cursor: 'pointer', flexShrink: 0, lineHeight: 1 },
  newChannelRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 10px' },
  newChannelInput: { flex: 1, border: '1.5px solid rgba(123,184,212,0.4)', borderRadius: 8, padding: '7px 11px', fontSize: 14, fontFamily: 'Lato, sans-serif', outline: 'none', color: '#2C3E50', background: '#FAFCFE' },
  cancelBtn: { background: 'none', border: 'none', color: '#8DA4B4', fontSize: 16, cursor: 'pointer', padding: '4px 6px', flexShrink: 0 },
  compose: { background: '#fff', borderBottom: '1px solid rgba(123,184,212,0.2)', padding: '12px 16px', flexShrink: 0 },
  composeInner: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  textarea: { flex: 1, border: '1.5px solid rgba(123,184,212,0.35)', borderRadius: 10, padding: '10px 12px', fontSize: 15, fontFamily: 'Lato, sans-serif', resize: 'none', outline: 'none', color: '#2C3E50', background: '#FAFCFE', lineHeight: 1.5 },
  composeFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingLeft: 46 },
  charCount: { fontSize: 12, color: '#8DA4B4' },
  feed: { flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 },
  postCard: { background: '#fff', borderRadius: 14, border: '1px solid rgba(123,184,212,0.18)', boxShadow: '0 2px 8px rgba(74,107,138,0.06)', padding: '14px 16px', overflow: 'hidden' },
  pinnedCard: { border: '1px solid rgba(123,184,212,0.4)', background: '#F8FBFE' },
  alertCard: { border: '1px solid rgba(139,159,212,0.5)', background: 'linear-gradient(135deg, #F0F4FF 0%, #F8FBFE 100%)' },
  alertBanner: { fontSize: 11, fontWeight: 700, color: '#4A5B8A', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10, padding: '3px 8px', background: 'rgba(139,159,212,0.15)', borderRadius: 4, display: 'inline-block' },
  pinnedBanner: { fontSize: 11, fontWeight: 700, color: '#4A6B8A', letterSpacing: '0.5px', marginBottom: 10 },
  postHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  postMeta: { display: 'flex', flexDirection: 'column', gap: 1 },
  postAuthor: { fontSize: 14, fontWeight: 700, color: '#2C3E50', fontFamily: 'Lato, sans-serif' },
  postTime: { fontSize: 12, color: '#8DA4B4' },
  postContent: { fontSize: 15, color: '#2C3E50', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  menuTrigger: { background: 'none', border: 'none', fontSize: 20, color: '#8DA4B4', cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  postMenu: { position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#fff', borderRadius: 10, border: '1px solid rgba(123,184,212,0.25)', boxShadow: '0 4px 16px rgba(74,107,138,0.15)', minWidth: 140, zIndex: 200, overflow: 'hidden' },
  postMenuItem: { display: 'block', width: '100%', padding: '11px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#2C3E50', cursor: 'pointer', fontFamily: 'Lato, sans-serif' },
  menuOverlay: { position: 'fixed', inset: 0, zIndex: 150 },
  loading: { display: 'flex', justifyContent: 'center', padding: 40 },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#8DA4B4' },
}
