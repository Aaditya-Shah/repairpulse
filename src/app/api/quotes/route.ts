import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'
import { calculateFinalAmount } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const repairId = searchParams.get('repairId')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = 'SELECT * FROM quotes WHERE tenant_id = ?'
    const params: unknown[] = [session.tenantId]

    if (repairId) {
      query += ' AND repair_request_id = ?'
      params.push(repairId)
    }

    if (session.role === 'customer') {
      query += ' AND customer_id = ?'
      params.push(session.userId)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const quotes = db.prepare(query).all(...params)
    return NextResponse.json({ quotes })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const body = await request.json()

    const { repairId, aiEstimateMin, aiEstimateMax, vendorEstimateMin, vendorEstimateMax, status } = body

    if (!repairId) {
      return NextResponse.json({ error: 'Repair ID is required' }, { status: 400 })
    }

    const repair = db.prepare('SELECT * FROM repair_requests WHERE id = ? AND tenant_id = ?').get(repairId, session.tenantId)
    if (!repair) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 })
    }

    if (session.role === 'customer' && repair.customer_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingQuotes = db.prepare('SELECT MAX(version) as max_version FROM quotes WHERE repair_request_id = ?').get(repairId)
    const version = (existingQuotes?.max_version || 0) + 1
    const previousQuoteId = existingQuotes?.max_version 
      ? db.prepare('SELECT id FROM quotes WHERE repair_request_id = ? AND version = ?').get(repairId, existingQuotes.max_version)?.id
      : null

    const quoteId = generateId()
    const now = new Date().toISOString()

    const finalAmount = vendorEstimateMax || aiEstimateMax
    const calculatedFinal = finalAmount ? await calculateFinalAmount({ final_amount: finalAmount } as any) : null

    db.prepare(`
      INSERT INTO quotes (
        id, tenant_id, repair_request_id, version, previous_quote_id, change_reason,
        status, ai_estimate_min, ai_estimate_max, vendor_estimate_min, vendor_estimate_max,
        final_amount, currency, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?)
    `).run(
      quoteId, session.tenantId, repairId, version, previousQuoteId, body.changeReason,
      status || 'DRAFT', aiEstimateMin, aiEstimateMax, vendorEstimateMin, vendorEstimateMax,
      calculatedFinal, session.userId, now
    )

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(quoteId)
    return NextResponse.json({ quote }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Create quote error:', error)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}