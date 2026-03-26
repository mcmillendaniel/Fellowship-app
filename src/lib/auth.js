import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

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

    const bcrypt = await import('bcryptjs')
    const match = await bcrypt.compare(pin, data.pin_hash)
    if (!match) throw new Error('Incorrect PIN')

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
