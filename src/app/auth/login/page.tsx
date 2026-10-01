'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/base'
import { Input } from '@/components/ui/base'
import { Card, CardContent, CardHeader } from '@/components/ui/layout'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/customer'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, callbackUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      router.push(data.redirect || callbackUrl)
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rp-bg-soft px-4 py-12">
      <Card variant="outlined" className="w-full max-w-md animate-in">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-rp-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">RP</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-rp-text">Welcome back</h1>
          <p className="text-rp-muted mt-2">Sign in to your RepairPulse account</p>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rp-danger/10 text-rp-danger text-sm" role="alert">
                {error}
              </div>
            )}
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
            />
            
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] text-rp-muted hover:text-rp-text"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {loading ? <Loader2 className="w-5 h-5" /> : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-rp-muted text-sm">
              Don&apos;t have an account?{' '}
              <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-rp-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-rp-bg-soft text-sm text-rp-muted">
            <p className="font-medium mb-2">Demo Credentials</p>
            <p>customer@demo.com / demo123</p>
            <p>vendor@demo.com / demo123</p>
            <p>partner@demo.com / demo123</p>
            <p>admin@demo.com / demo123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}