import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { formatDistanceToNow } from 'date-fns'

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY
const ASHEVILLE_CENTER = { lat: 35.5951, lng: -82.5515 }

export default function MapPage() {
  const { user } = useAuth()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const [locations, setLocations] = useState([])
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) { setMapsLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`
    script.async = true
    script.onload = () => setMapsLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Init map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstance.current) return
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: ASHEVILLE_CENTER,
      zoom: 14,
      mapTypeId: 'roadmap',
      styles: mapStyles,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
    })
  }, [mapsLoaded])

  // Fetch locations
  useEffect(() => {
    fetchLocations()
    const interval = setInterval(fetchLocations, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*, users(username, team)')
      .not('latitude', 'is', null)
    if (data) setLocations(data)
  }

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstance.current || !window.google) return
    updateMarkers()
  }, [locations, mapsLoaded])

  const updateMarkers = () => {
    const map = mapInstance.current
    if (!map) return

    locations.forEach(loc => {
      const pos = { lat: loc.latitude, lng: loc.longitude }
      const isMe = loc.user_id === user?.id
      const team = loc.users?.team
      const color = team === 'kevin' ? '#7BB8D4' : team === 'liz' ? '#8B9FD4' : '#7A9E7E'
      const initials = loc.users?.username?.slice(0, 2).toUpperCase() || '??'

      const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
          <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/></filter>
          <path d="M22 2C13.2 2 6 9.2 6 18c0 11.2 16 32 16 32s16-20.8 16-32C38 9.2 30.8 2 22 2z" fill="${isMe ? '#2C4A6B' : color}" filter="url(#s)"/>
          <circle cx="22" cy="18" r="11" fill="white" opacity="0.9"/>
          <text x="22" y="22" text-anchor="middle" font-size="10" font-weight="700" font-family="Lato,sans-serif" fill="${isMe ? '#2C4A6B' : color}">${initials}</text>
          ${isMe ? '<circle cx="36" cy="8" r="6" fill="#27AE60" stroke="white" stroke-width="1.5"/>' : ''}
        </svg>
      `

      const icon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarker),
        scaledSize: new window.google.maps.Size(44, 52),
        anchor: new window.google.maps.Point(22, 52),
      }

      if (markersRef.current[loc.user_id]) {
        markersRef.current[loc.user_id].setPosition(pos)
        markersRef.current[loc.user_id].setIcon(icon)
      } else {
        const marker = new window.google.maps.Marker({ position: pos, map, icon, title: loc.users?.username })
        marker.addListener('click', () => setSelectedUser(loc))
        markersRef.current[loc.user_id] = marker
      }
    })
  }

  const checkIn = useCallback(async () => {
    if (!navigator.geolocation || checkingIn) return
    setCheckingIn(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        await supabase.from('locations').upsert({
          user_id: user.id,
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        setCheckedIn(true)
        setCheckingIn(false)
        await fetchLocations()
        if (mapInstance.current) {
          mapInstance.current.panTo({ lat: latitude, lng: longitude })
        }
      },
      () => setCheckingIn(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [user, checkingIn])

  // Auto check-in on page load
  useEffect(() => { checkIn() }, [])

  return (
    <div style={styles.page}>
      {/* Map */}
      <div ref={mapRef} style={styles.map} />

      {!mapsLoaded && (
        <div style={styles.mapLoading}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: '#4A6B8A', fontSize: 14 }}>Loading map...</p>
        </div>
      )}

      {/* Check-in button */}
      <button
        className="btn btn-primary"
        onClick={checkIn}
        disabled={checkingIn}
        style={styles.checkInBtn}
      >
        {checkingIn ? '📍 Finding you...' : checkedIn ? '📍 Update location' : '📍 Check in'}
      </button>

      {/* User list */}
      <div style={styles.userList}>
        <div className="scroll" style={{ maxHeight: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {locations.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8DA4B4', padding: '8px 0' }}>No one has checked in yet</p>
          ) : (
            locations.map(loc => (
              <LocationRow
                key={loc.user_id}
                loc={loc}
                isMe={loc.user_id === user?.id}
                onTap={() => {
                  setSelectedUser(loc)
                  if (mapInstance.current) {
                    mapInstance.current.panTo({ lat: loc.latitude, lng: loc.longitude })
                    mapInstance.current.setZoom(16)
                  }
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Selected user popup */}
      {selectedUser && (
        <div style={styles.popup} onClick={() => setSelectedUser(null)}>
          <div style={styles.popupCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#2C3E50', fontFamily: 'Lato, sans-serif' }}>
                {selectedUser.users?.username}
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8DA4B4' }} onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#8DA4B4' }}>
              Last seen {formatDistanceToNow(new Date(selectedUser.updated_at), { addSuffix: true })}
            </p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 12, fontSize: 13 }}
              onClick={() => {
                if (mapInstance.current) {
                  mapInstance.current.panTo({ lat: selectedUser.latitude, lng: selectedUser.longitude })
                  mapInstance.current.setZoom(17)
                }
                setSelectedUser(null)
              }}
            >
              Go to location
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LocationRow({ loc, isMe, onTap }) {
  const team = loc.users?.team
  const avatarClass = team === 'kevin' ? 'avatar-sky' : team === 'liz' ? 'avatar-periwinkle' : 'avatar-sage'
  const initials = loc.users?.username?.slice(0, 2).toUpperCase() || '??'
  const timeAgo = formatDistanceToNow(new Date(loc.updated_at), { addSuffix: true })

  return (
    <button style={styles.locationRow} onClick={onTap}>
      <div className={`avatar ${avatarClass}`} style={{ width: 30, height: 30, fontSize: 11 }}>{initials}</div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50', fontFamily: 'Lato' }}>
          {loc.users?.username}{isMe ? ' (you)' : ''}
        </span>
        <span style={{ fontSize: 11, color: '#8DA4B4', marginLeft: 6 }}>{timeAgo}</span>
      </div>
      <span style={{ fontSize: 11, color: '#7BB8D4' }}>→</span>
    </button>
  )
}

const styles = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F8FA',
  },
  checkInBtn: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(74,107,138,0.3)',
    padding: '10px 20px',
    fontSize: 14,
  },
  userList: {
    background: 'rgba(255,255,255,0.97)',
    borderTop: '1px solid rgba(123,184,212,0.2)',
    padding: '10px 16px',
    flexShrink: 0,
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s',
  },
  popup: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 20,
    padding: '0 16px 16px',
  },
  popupCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 -4px 24px rgba(74,107,138,0.15)',
  },
}

const mapStyles = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B8D9EC' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#EEF5EE' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E0EBF4' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#C8DFC8' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#D4E4F0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A6B8A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
]
