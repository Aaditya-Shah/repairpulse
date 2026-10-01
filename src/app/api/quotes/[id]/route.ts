import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { calculateFinalAmount } from '@/lib/pricing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const db = getDb()

    const quote = db.prepare(`
      SELECT q.*, rr.reported_problem, rr.status as repair_status
      FROM quotes q
      JOIN repair_requests rr ON q.repair_request_id = rr.id
      WHERE q.id = ? AND q.tenant_id = ?
    `).get(id, session.tenantId)

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (session.role === 'customer' && quote.created_by !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ quote })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const db = getDb()
    const body = await request.json()
    const { action, ...data } = body

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND tenant_id = ?').get(id, session.tenantId)
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const repair = db.prepare('SELECT * FROM repair_requests WHERE id = ?').get(quote.repair_request_id)
    if (!repair) {
      return NextResponse.json({ error: 'Associated repair not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    switch (action) {
      case 'vendor_confirm': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can confirm quotes' }, { status: 403 })
        }
        if (quote.status !== 'AI_ESTIMATE' && quote.status !== 'DRAFT') {
          return NextResponse.json({ error: 'Quote not in confirmable state' }, { status: 400 })
        }

        db.prepare(`
          UPDATE quotes 
          SET status = 'VENDOR_CONFIRMED', vendor_estimate_min = ?, vendor_estimate_max = ?, 
              final_amount = ?, updated_at = ?
          WHERE id = ?
        `).run(data.vendorEstimateMin, data.vendorEstimateMax, data.finalAmount || quote.vendor_estimate_max || quote.ai_estimate_max, now, id)
        break
      }

      case 'customer_approve': {
        if (session.role !== 'customer' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only customers can approve quotes' }, { status: 403 })
        }
        if (quote.created_by !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (quote.status !== 'VENDOR_CONFIRMED') {
          return NextResponse.json({ error: 'Quote must be vendor confirmed first' }, { status: 400 })
        }

        const finalAmount = await calculateFinalAmount({ final_amount: quote.final_amount || quote.vendor_estimate_max || quote.ai_estimate_max } as any)
        
        db.prepare(`
          UPDATE quotes 
          SET status = 'CUSTOMER_APPROVED', final_amount = ?, approved_at = ?, updated_at = ?
          WHERE id = ?
        `).run(finalAmount, now, now, id)

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'CONFIRMED', updated_at = ?
          WHERE id = ?
        `).run(now, quote.repair_request_id)
        break
      }

      case 'supersede': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can supersede quotes' }, { status: 403 })
        }
        if (quote.status === 'PAYMENT' || quote.status === 'CANCELLED') {
          return NextResponse.json({ error: 'Cannot supersede this quote' }, { status: 400 })
        }

        const newVersion = quote.version + 1
        const newQuoteId = generateId()

        db.prepare(`
          INSERT INTO quotes (
            id, tenant_id, repair_request_id, version, previous_quote_id, change_reason,
            status, ai_estimate_min, ai_estimate_max, vendor_estimate_min, vendor_estimate_max,
            final_amount, currency, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'AI_ESTIMATE', ?, ?, ?, ?, ?, 'INR', ?, ?)
        `).run(
          newQuoteId, session.tenantId, quote.repair_request_id, newVersion, quote.id, data.changeReason,
          data.aiEstimateMin, data.aiEstimateMax, data.vendorEstimateMin, data.vendorEstimateMax,
          data.finalAmount || quote.ai_estimate_max, session.userId, now
        )

        db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run('SUPERSEDED', id)
        break
      }

      case 'cancel': {
        if (quote.status === 'PAYMENT' || quote.status === 'CUSTOMER_APPROVED') {
          return NextResponse.json({ error: 'Cannot cancel approved/paid quote' }, { status: 400 })
        }

        db.prepare('UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?').run('CANCELLED', now, id)
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const updated = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id)
    return NextResponse.json({ quote: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Update quote error:', error)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}

import { generateId } from '@/lib/utils'