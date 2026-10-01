import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'
import { estimatePayoutForPickup } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = 'SELECT pj.*, rr.reported_problem, d.brand, d.model FROM pickup_jobs pj JOIN repair_requests rr ON pj.repair_request_id = rr.id JOIN devices d ON rr.device_id = d.id WHERE pj.tenant_id = ?'
    const params: unknown[] = [session.tenantId]

    if (session.role === 'partner') {
      query += ' AND (partner_id = ? OR status = ?)'
      params.push(session.userId, 'AVAILABLE')
    } else if (session.role === 'customer') {
      query += ' AND rr.customer_id = ?'
      params.push(session.userId)
    } else if (session.role === 'vendor') {
      query += ' AND rr.assigned_vendor_id = ?'
      params.push(session.userId)
    }

    if (status) {
      query += ' AND pj.status = ?'
      params.push(status)
    }

    query += ' ORDER BY pj.created_at DESC LIMIT ?'
    params.push(limit)

    const pickups = db.prepare(query).all(...params)
    return NextResponse.json({ pickups })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch pickups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const db = getDb()
    const body = await request.json()

    const { repairId, pickupAddress, deliveryAddress, distanceKm, city } = body

    if (!repairId || !pickupAddress || !deliveryAddress) {
      return NextResponse.json({ error: 'Repair ID, pickup and delivery addresses are required' }, { status: 400 })
    }

    const repair = db.prepare('SELECT * FROM repair_requests WHERE id = ? AND tenant_id = ?').get(repairId, session.tenantId)
    if (!repair) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 })
    }

    if (repair.status !== 'CONFIRMED' && repair.status !== 'READY') {
      return NextResponse.json({ error: 'Repair not ready for pickup' }, { status: 400 })
    }

    const existing = db.prepare('SELECT * FROM pickup_jobs WHERE repair_request_id = ? AND status NOT IN (?, ?)').get(repairId, 'DELIVERED', 'CANCELLED')
    if (existing) {
      return NextResponse.json({ error: 'Pickup job already exists for this repair' }, { status: 400 })
    }

    const payoutEstimate = distanceKm ? await estimatePayoutForPickup(session.tenantId, pickupAddress, deliveryAddress, distanceKm, city || 'default') : null

    const pickupId = generateId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO pickup_jobs (
        id, tenant_id, repair_request_id, status, pickup_address, delivery_address,
        distance_km, estimated_payout, created_at
      ) VALUES (?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?)
    `).run(pickupId, session.tenantId, repairId, pickupAddress, deliveryAddress, distanceKm || null, payoutEstimate?.finalPayout || null, now)

    const pickup = db.prepare('SELECT * FROM pickup_jobs WHERE id = ?').get(pickupId)
    return NextResponse.json({ pickup, payoutEstimate }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to create pickup job' }, { status: 500 })
  }
}