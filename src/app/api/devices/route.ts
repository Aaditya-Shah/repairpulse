import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = 'SELECT * FROM devices WHERE tenant_id = ?'
    const params: unknown[] = [session.tenantId]

    if (session.role === 'customer') {
      query += ' AND customer_id = ?'
      params.push(session.userId)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const devices = db.prepare(query).all(...params)
    return NextResponse.json({ devices })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('customer', 'vendor', 'admin')
    const db = getDb()
    const body = await request.json()

    const { category, brand, model, serialNumber, warrantyStatus } = body

    if (!category || !brand || !model) {
      return NextResponse.json({ error: 'Category, brand, and model are required' }, { status: 400 })
    }

    const deviceId = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO devices (id, tenant_id, customer_id, category, brand, model, serial_number_hash, warranty_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviceId, session.tenantId, session.userId, category, brand, model, serialNumber || null, warrantyStatus || null, now)

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId)
    return NextResponse.json({ device }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to create device' }, { status: 500 })
  }
}