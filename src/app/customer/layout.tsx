'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RoleLayout, Header, PageContainer, Section, Card, CardContent, StatusBadge, RepairTimeline, DataCard } from '@/components/ui/layout'
import { Button } from '@/components/ui/base'
import { getSession } from '@/lib/auth'
import { formatRelativeTime, formatDuration, formatCurrency } from '@/lib/utils'
import { Box, Truck, CreditCard, MessageCircle, Plus, RefreshCw, Filter, Search } from 'lucide-react'

const mockSession = {
  displayName: 'Demo Customer',
  email: 'customer@demo.com',
  avatarUrl: undefined,
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<typeof mockSession | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user.role === 'customer') {
            setSession({ displayName: data.user.displayName, email: data.user.email })
          } else {
            router.push('/auth/login?callbackUrl=/customer')
          }
        } else {
          router.push('/auth/login?callbackUrl=/customer')
        }
      } catch {
        router.push('/auth/login?callbackUrl=/customer')
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
    <RoleLayout role="customer" user={session} onLogout={handleLogout}>
      {children}
    </RoleLayout>
  )
}