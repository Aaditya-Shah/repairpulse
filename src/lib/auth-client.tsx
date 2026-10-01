'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  userId: string
  email: string
  role: string
  tenantId: string
  displayName: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, role: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

interface RegisterData {
  displayName: string
  email: string
  phone?: string
  password: string
  role: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) setUser(data.user)
        else setUser(null)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [pathname])

  const login = async (email: string, password: string, role: string) => {
    const callbackUrl = role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : role === 'partner' ? '/partner' : '/customer'
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, callbackUrl }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    
    setUser(data.user)
    router.push(data.redirect || callbackUrl)
    router.refresh()
  }

  const register = async (data: RegisterData) => {
    const callbackUrl = data.role === 'admin' ? '/admin' : data.role === 'vendor' ? '/vendor' : data.role === 'partner' ? '/partner' : '/customer'
    
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, callbackUrl }),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Registration failed')
    
    setUser(result.user)
    router.push(result.redirect || callbackUrl)
    router.refresh()
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const refresh = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function useRole(...allowedRoles: string[]) {
  const { user } = useAuth()
  if (!user) return false
  return allowedRoles.includes(user.role)
}