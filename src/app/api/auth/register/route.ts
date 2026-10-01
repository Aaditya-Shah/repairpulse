import { NextRequest, NextResponse } from 'next/server'
import { createUser, createSession, setSessionCookie } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { displayName, email, phone, password, role, callbackUrl = '/customer' } = await request.json()

    if (!displayName || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const validRoles = ['customer', 'vendor', 'partner', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const db = getDb()
    
    let tenant = db.prepare('SELECT * FROM tenants WHERE slug = ?').get('demo')
    
    if (!tenant) {
      const tenantId = generateId()
      db.prepare(`
        INSERT INTO tenants (id, name, slug, status, currency, country, timezone)
        VALUES (?, ?, ?, 'active', 'INR', 'IN', 'Asia/Kolkata')
      `).run(tenantId, 'Demo Tenant', 'demo')
      
      tenant = { id: tenantId, slug: 'demo' }
    }

    const userId = await createUser(email, password, displayName, role, tenant.id, phone)

    const sessionData = {
      userId,
      email,
      role,
      tenantId: tenant.id,
      displayName,
    }

    const token = await createSession(sessionData)
    const response = NextResponse.json({ 
      success: true, 
      redirect: callbackUrl || `/${role}`,
      user: sessionData 
    })

    setSessionCookie(token)

    return response
  } catch (error) {
    console.error('Registration error:', error)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}