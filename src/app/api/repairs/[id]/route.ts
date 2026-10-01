import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { canTransition } from '@/lib/utils'
import { calculateAIEstimate } from '@/lib/pricing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const db = getDb()

    const repair = db.prepare(`
      SELECT rr.*, d.category, d.brand, d.model, d.serial_number_hash,
             u.display_name as customer_name, u.email as customer_email,
             v.display_name as vendor_name, v.email as vendor_email
      FROM repair_requests rr
      JOIN devices d ON rr.device_id = d.id
      JOIN users u ON rr.customer_id = u.id
      LEFT JOIN users v ON rr.assigned_vendor_id = v.id
      WHERE rr.id = ? AND rr.tenant_id = ?
    `).get(id, session.tenantId)

    if (!repair) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 })
    }

    if (session.role === 'customer' && repair.customer_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (session.role === 'vendor' && repair.assigned_vendor_id !== session.userId && 
        !['VENDOR_REVIEW', 'AI_TRIAGED'].includes(repair.status)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (session.role === 'partner') {
      const pickup = db.prepare('SELECT * FROM pickup_jobs WHERE repair_request_id = ? AND partner_id = ?').get(id, session.userId)
      if (!pickup) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const evidence = db.prepare('SELECT * FROM device_evidence WHERE repair_request_id = ?').all(id)
    const quotes = db.prepare('SELECT * FROM quotes WHERE repair_request_id = ? ORDER BY version DESC').all(id)
    const statusHistory = db.prepare('SELECT * FROM repair_status_history WHERE repair_request_id = ? ORDER BY created_at').all(id)

    return NextResponse.json({ 
      repair, 
      evidence, 
      quotes,
      statusHistory 
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Get repair error:', error)
    return NextResponse.json({ error: 'Failed to fetch repair' }, { status: 500 })
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

    const repair = db.prepare('SELECT * FROM repair_requests WHERE id = ? AND tenant_id = ?').get(id, session.tenantId)
    if (!repair) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    switch (action) {
      case 'ai_triage': {
        if (!['REQUESTED'].includes(repair.status)) {
          return NextResponse.json({ error: 'Invalid status for AI triage' }, { status: 400 })
        }
        
        const estimate = await calculateAIEstimate(repair)
        
        db.prepare(`
          UPDATE repair_requests 
          SET status = 'AI_TRIAGED', triage_status = ?, ai_confidence = ?, 
              estimated_minutes = ?, estimated_low = ?, estimated_high = ?,
              updated_at = ?
          WHERE id = ?
        `).run(data.triageStatus, data.confidence, estimate.min, estimate.min, estimate.max, now, id)
        break
      }

      case 'vendor_review': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can review' }, { status: 403 })
        }
        if (repair.status !== 'AI_TRIAGED' && repair.status !== 'VENDOR_REVIEW') {
          return NextResponse.json({ error: 'Invalid status for vendor review' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'VENDOR_REVIEW', assigned_vendor_id = ?, updated_at = ?
          WHERE id = ?
        `).run(session.userId, now, id)
        break
      }

      case 'confirm': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can confirm' }, { status: 403 })
        }
        if (repair.assigned_vendor_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not assigned to this vendor' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'CONFIRMED')) {
          return NextResponse.json({ error: `Cannot transition from ${repair.status} to CONFIRMED` }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'CONFIRMED', updated_at = ?
          WHERE id = ?
        `).run(now, id)

        db.prepare(`
          INSERT INTO repair_status_history (id, repair_request_id, status, note, created_at)
          VALUES (?, ?, 'CONFIRMED', 'Vendor confirmed repair', ?)
        `).run(generateId(), id, now)
        break
      }

      case 'request_inspection': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can request inspection' }, { status: 403 })
        }
        if (repair.assigned_vendor_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not assigned to this vendor' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'MANUAL_INSPECTION')) {
          return NextResponse.json({ error: 'Invalid status for inspection request' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'MANUAL_INSPECTION', physical_inspection_required = 1, updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'reject': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can reject' }, { status: 403 })
        }
        if (repair.assigned_vendor_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not assigned to this vendor' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'REJECTED')) {
          return NextResponse.json({ error: 'Invalid status for rejection' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'REJECTED', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'customer_approve': {
        if (session.role !== 'customer' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only customers can approve' }, { status: 403 })
        }
        if (repair.customer_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not your repair' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'CONFIRMED')) {
          return NextResponse.json({ error: 'Repair not ready for approval' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'CONFIRMED', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'start_pickup': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can start pickup' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'PICKUP_PENDING')) {
          return NextResponse.json({ error: 'Invalid status for pickup' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'PICKUP_PENDING', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'mark_received': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can mark received' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'RECEIVED')) {
          return NextResponse.json({ error: 'Invalid status for received' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'RECEIVED', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'advance_stage': {
        const { newStatus } = data
        const validTransitions: Record<string, string[]> = {
          'RECEIVED': ['DIAGNOSIS'],
          'DIAGNOSIS': ['PARTS_PENDING', 'REPAIR'],
          'PARTS_PENDING': ['REPAIR'],
          'REPAIR': ['TESTING', 'DIAGNOSIS'],
          'TESTING': ['REPAIR', 'READY'],
          'READY': ['DELIVERY', 'COMPLETED'],
          'DELIVERY': ['COMPLETED'],
        }

        if (!validTransitions[repair.status]?.includes(newStatus)) {
          return NextResponse.json({ error: `Invalid transition from ${repair.status} to ${newStatus}` }, { status: 400 })
        }

        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can advance stages' }, { status: 403 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = ?, updated_at = ?
          WHERE id = ?
        `).run(newStatus, now, id)

        db.prepare(`
          INSERT INTO repair_status_history (id, repair_request_id, status, note, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(generateId(), id, newStatus, data.note || `Advanced to ${newStatus}`, now)
        break
      }

      case 'complete': {
        if (session.role !== 'vendor' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only vendors can complete' }, { status: 403 })
        }
        if (!canTransition(repair.status, 'COMPLETED')) {
          return NextResponse.json({ error: 'Invalid status for completion' }, { status: 400 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'COMPLETED', updated_at = ?, actual_duration = ?
          WHERE id = ?
        `).run(now, data.actualDuration, id)
        break
      }

      case 'cancel': {
        if (!canTransition(repair.status, 'CANCELLED')) {
          return NextResponse.json({ error: 'Cannot cancel from current status' }, { status: 400 })
        }

        const allowed = session.role === 'admin' || 
                       (session.role === 'customer' && repair.customer_id === session.userId) ||
                       (session.role === 'vendor' && repair.assigned_vendor_id === session.userId)

        if (!allowed) {
          return NextResponse.json({ error: 'Not authorized to cancel' }, { status: 403 })
        }

        db.prepare(`
          UPDATE repair_requests 
          SET status = 'CANCELLED', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const updated = db.prepare('SELECT * FROM repair_requests WHERE id = ?').get(id)
    return NextResponse.json({ repair: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Update repair error:', error)
    return NextResponse.json({ error: 'Failed to update repair' }, { status: 500 })
  }
}

import { generateId } from '@/lib/utils'