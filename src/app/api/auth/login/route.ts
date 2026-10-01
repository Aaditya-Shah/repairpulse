import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { email, password, callbackUrl = '/customer' } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const sessionData = await verifyPassword(email, password)

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession(sessionData)
    const response = NextResponse.json({ 
      success: true, 
      redirect: callbackUrl,
      user: sessionData 
    })

    setSessionCookie(token)
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}