import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const db = getDb()

    const pickup = db.prepare(`
      SELECT pj.*, rr.reported_problem, rr.status as repair_status,
             d.brand, d.model, d.category,
             u.display_name as customer_name, u.phone as customer_phone
      FROM pickup_jobs pj
      JOIN repair_requests rr ON pj.repair_request_id = rr.id
      JOIN devices d ON rr.device_id = d.id
      JOIN users u ON rr.customer_id = u.id
      WHERE pj.id = ? AND pj.tenant_id = ?
    `).get(id, session.tenantId)

    if (!pickup) {
      return NextResponse.json({ error: 'Pickup job not found' }, { status: 404 })
    }

    if (session.role === 'partner' && pickup.partner_id !== session.userId && pickup.status !== 'AVAILABLE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (session.role === 'customer') {
      const repair = db.prepare('SELECT customer_id FROM repair_requests WHERE id = ?').get(pickup.repair_request_id)
      if (repair?.customer_id !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ pickup })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch pickup' }, { status: 500 })
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

    const pickup = db.prepare('SELECT * FROM pickup_jobs WHERE id = ? AND tenant_id = ?').get(id, session.tenantId)
    if (!pickup) {
      return NextResponse.json({ error: 'Pickup job not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    switch (action) {
      case 'accept': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can accept' }, { status: 403 })
        }
        if (pickup.status !== 'AVAILABLE') {
          return NextResponse.json({ error: 'Job not available' }, { status: 400 })
        }

        db.prepare(`
          UPDATE pickup_jobs 
          SET status = 'ACCEPTED', partner_id = ?, accepted_at = ?, updated_at = ?
          WHERE id = ?
        `).run(session.userId, now, now, id)
        break
      }

      case 'arrive': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can mark arrival' }, { status: 403 })
        }
        if (pickup.partner_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not your job' }, { status: 403 })
        }
        if (pickup.status !== 'ACCEPTED') {
          return NextResponse.json({ error: 'Job not accepted yet' }, { status: 400 })
        }

        db.prepare(`
          UPDATE pickup_jobs 
          SET status = 'ARRIVED', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'verify_otp': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can verify OTP' }, { status: 403 })
        }
        if (pickup.partner_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not your job' }, { status: 403 })
        }
        if (pickup.status !== 'ARRIVED') {
          return NextResponse.json({ error: 'Must arrive first' }, { status: 400 })
        }

        const { otp } = data
        if (!pickup.otp_code || pickup.otp_code !== otp) {
          return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
        }

        db.prepare(`
          UPDATE pickup_jobs 
          SET status = 'OTP_VERIFIED', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      case 'pickup': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can pickup' }, { status: 403 })
        }
        if (pickup.partner_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not your job' }, { status: 403 })
        }
        if (pickup.status !== 'OTP_VERIFIED') {
          return NextResponse.json({ error: 'OTP not verified' }, { status: 400 })
        }

        db.prepare(`
          UPDATE pickup_jobs 
          SET status = 'PICKED_UP', picked_up_at = ?, updated_at = ?
          WHERE id = ?
        `).run(now, now, id)
        break
      }

      case 'deliver': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can deliver' }, { status: 403 })
        }
        if (pickup.partner_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not your job' }, { status: 403 })
        }
        if (pickup.status !== 'IN_TRANSIT') {
          return NextResponse.json({ error: 'Must be in transit first' }, { status: 400 })
        }

        db.prepare(`
          UPDATE pickup_jobs 
          SET status = 'DELIVERED', delivered_at = ?, actual_payout = ?, updated_at = ?
          WHERE id = ?
        `).run(now, data.actualPayout || pickup.estimated_payout, now, id)

        const repair = db.prepare('SELECT * FROM repair_requests WHERE id = ?').get(pickup.repair_request_id)
        if (repair && (repair.status === 'READY' || repair.status === 'DELIVERY')) {
          db.prepare('UPDATE repair_requests SET status = ?, updated_at = ? WHERE id = ?').run('COMPLETED', now, repair.id)
        }
        break
      }

      case 'start_transit': {
        if (session.role !== 'partner' && session.role !== 'admin') {
          return NextResponse.json({ error: 'Only partners can start transit' }, { status: 403 })
        }
        if (pickup.partner_id !== session.userId && session.role !== 'admin') {
          return NextResponse.json({ error: 'Not your job' }, { status: 403 })
        }
        if (pickup.status !== 'PICKED_UP') {
          return NextResponse.json({ error: 'Must pickup first' }, { status: 400 })
        }

        db.prepare(`
          UPDATE pickup_jobs 
          SET status = 'IN_TRANSIT', updated_at = ?
          WHERE id = ?
        `).run(now, id)
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const updated = db.prepare('SELECT * FROM pickup_jobs WHERE id = ?').get(id)
    return NextResponse.json({ pickup: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Update pickup error:', error)
    return NextResponse.json({ error: 'Failed to update pickup' }, { status: 500 })
  }
}