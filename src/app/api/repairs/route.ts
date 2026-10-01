import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'
import { generateWithFallback, validateAIOutput, traceAIRequest } from '@/lib/ai-gateway'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = 'SELECT * FROM repair_requests WHERE tenant_id = ?'
    const params: unknown[] = [session.tenantId]

    if (session.role === 'customer') {
      query += ' AND customer_id = ?'
      params.push(session.userId)
    } else if (session.role === 'vendor') {
      query += ' AND (assigned_vendor_id = ? OR status IN (?, ?))'
      params.push(session.userId, 'VENDOR_REVIEW', 'AI_TRIAGED')
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const repairs = db.prepare(query).all(...params)

    return NextResponse.json({ repairs })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Get repairs error:', error)
    return NextResponse.json({ error: 'Failed to fetch repairs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('customer', 'vendor', 'admin')
    const db = getDb()
    const body = await request.json()

    const { deviceId, reportedProblem, evidenceIds = [] } = body

    if (!deviceId || !reportedProblem) {
      return NextResponse.json({ error: 'Device ID and problem description are required' }, { status: 400 })
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND tenant_id = ?').get(deviceId, session.tenantId)
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    if (session.role === 'customer' && device.customer_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const repairId = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO repair_requests (
        id, tenant_id, customer_id, device_id, reported_problem, 
        status, physical_inspection_required, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'REQUESTED', 1, ?, ?)
    `).run(repairId, session.tenantId, session.userId, deviceId, reportedProblem, now, now)

    if (evidenceIds.length > 0) {
      const stmt = db.prepare('UPDATE device_evidence SET repair_request_id = ? WHERE id = ? AND tenant_id = ?')
      for (const evId of evidenceIds) {
        stmt.run(repairId, evId, session.tenantId)
      }
    }

    const repair = db.prepare('SELECT * FROM repair_requests WHERE id = ?').get(repairId)

    return NextResponse.json({ repair }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Create repair error:', error)
    return NextResponse.json({ error: 'Failed to create repair' }, { status: 500 })
  }
}