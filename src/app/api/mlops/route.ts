import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'
import { detectDrift, evaluateModelOnBenchmark, checkPromotionGuardrails, promoteModel, createModelVersion, createBenchmark, getModelHealth } from '@/lib/mlops'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth('vendor', 'admin')
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health': {
        const health = await getModelHealth(session.tenantId)
        return NextResponse.json(health)
      }
      case 'drift': {
        const drift = db.prepare('SELECT * FROM drift_reports WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10').all(session.tenantId)
        return NextResponse.json({ drift })
      }
      case 'models': {
        const models = db.prepare('SELECT * FROM model_versions WHERE tenant_id = ? ORDER BY created_at DESC').all(session.tenantId)
        return NextResponse.json({ models })
      }
      case 'benchmarks': {
        const benchmarks = db.prepare('SELECT * FROM benchmarks WHERE tenant_id = ? ORDER BY created_at DESC').all(session.tenantId)
        return NextResponse.json({ benchmarks })
      }
      default: {
        const health = await getModelHealth(session.tenantId)
        return NextResponse.json(health)
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to fetch MLOps data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('admin')
    const db = getDb()
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'detect_drift': {
        const drift = await detectDrift(session.tenantId)
        return NextResponse.json({ drift })
      }

      case 'evaluate_model': {
        const { modelVersionId, benchmarkId } = data
        if (!modelVersionId) {
          return NextResponse.json({ error: 'Model version ID required' }, { status: 400 })
        }
        const metrics = await evaluateModelOnBenchmark(session.tenantId, modelVersionId, benchmarkId)
        return NextResponse.json({ metrics })
      }

      case 'check_promotion': {
        const { modelVersionId } = data
        if (!modelVersionId) {
          return NextResponse.json({ error: 'Model version ID required' }, { status: 400 })
        }
        const result = await checkPromotionGuardrails(session.tenantId, modelVersionId)
        return NextResponse.json(result)
      }

      case 'promote_model': {
        const { modelVersionId } = data
        if (!modelVersionId) {
          return NextResponse.json({ error: 'Model version ID required' }, { status: 400 })
        }
        await promoteModel(session.tenantId, modelVersionId)
        return NextResponse.json({ success: true })
      }

      case 'create_model_version': {
        const { version, datasetVersion, benchmarkId, featureSchemaVersion, metrics } = data
        if (!version || !datasetVersion || !benchmarkId || !featureSchemaVersion || !metrics) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const modelId = await createModelVersion(session.tenantId, version, datasetVersion, benchmarkId, featureSchemaVersion, metrics)
        return NextResponse.json({ modelId })
      }

      case 'create_benchmark': {
        const { datasetVersion, featureSchemaVersion, rowHash, eligibilityRule } = data
        if (!datasetVersion || !featureSchemaVersion || !rowHash || !eligibilityRule) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const benchmarkId = await createBenchmark(session.tenantId, datasetVersion, featureSchemaVersion, rowHash, eligibilityRule)
        return NextResponse.json({ benchmarkId })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('MLOps error:', error)
    return NextResponse.json({ error: 'MLOps operation failed' }, { status: 500 })
  }
}