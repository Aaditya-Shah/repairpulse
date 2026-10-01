'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleLayout } from '@/components/ui/layout'
import { getSession } from '@/lib/auth'

const mockSession = {
  displayName: 'Demo Admin',
  email: 'admin@demo.com',
  avatarUrl: undefined,
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<typeof mockSession | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user.role === 'admin') {
            setSession({ displayName: data.user.displayName, email: data.user.email })
          } else {
            router.push('/auth/login?callbackUrl=/admin')
          }
        } else {
          router.push('/auth/login?callbackUrl=/admin')
        }
      } catch {
        router.push('/auth/login?callbackUrl=/admin')
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) return null

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <RoleLayout role="admin" user={session} onLogout={handleLogout}>
      {children}
    </RoleLayout>
  )
}