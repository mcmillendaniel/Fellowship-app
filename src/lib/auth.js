import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// Browser-compatible PIN verification using Supabase's pgcrypto
// We verify by asking Supabase to check the hash server-side
async function verifyPin(pin, hash) {
  const { data, error } = await supabase.rpc('verify_pin', {
    input_pin: pin,
    stored_hash: hash
  })
  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('fellowship_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (username, pin) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username.trim())
      .single()

    if (error || !data) throw new Error('Username not found')

    const match = await verifyPin(pin, data.pin_hash)
    if (!match) throw new Error('Incorrect PIN')

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.id)
    localStorage.setItem('fellowship_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('fellowship_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
