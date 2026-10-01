'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/base'
import { Input, Select } from '@/components/ui/base'
import { Card, CardContent, CardHeader } from '@/components/ui/layout'
import { Loader2 } from 'lucide-react'

const roleOptions = [
  { value: 'customer', label: 'Customer — I need repairs' },
  { value: 'vendor', label: 'Repairist/Vendor — I fix devices' },
  { value: 'partner', label: 'Delivery Partner — I transport devices' },
  { value: 'admin', label: 'Admin — I manage the platform' },
]

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/customer'
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, callbackUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
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
          <h1 className="font-heading text-2xl font-bold text-rp-text">Create Account</h1>
          <p className="text-rp-muted mt-2">Join RepairPulse — Smarter Predictions. Smoother Schedules.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rp-danger/10 text-rp-danger text-sm" role="alert">
                {error}
              </div>
            )}
            
            <Input
              label="Full Name"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="John Doe"
              required
              autoComplete="name"
              disabled={loading}
            />
            
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
            />
            
            <Input
              label="Phone (optional)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              disabled={loading}
            />
            
            <Select
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={roleOptions}
              placeholder="Select your role"
              disabled={loading}
            />
            
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={loading}
              helperText="At least 8 characters"
            />
            
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={loading}
            />
            
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {loading ? <Loader2 className="w-5 h-5" /> : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-rp-muted text-sm">
              Already have an account?{' '}
              <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-rp-primary hover:underline font-medium">
                Sign in
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