import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearSessionCookie } from '@/lib/auth'

export async function POST() {
  clearSessionCookie()
  return NextResponse.json({ success: true, redirect: '/' })
}