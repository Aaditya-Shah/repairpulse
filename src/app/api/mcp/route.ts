import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callMCPTool } from '@/lib/ai-gateway'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { toolName, arguments: args } = body

    if (!toolName) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 })
    }

    const allowedTools = [
      'get_repair_request',
      'get_device_evidence',
      'get_repair_status',
      'get_customer_safe_summary',
      'get_vendor_capacity',
      'get_quote_context',
      'get_schedule_risk',
      'get_model_health',
      'get_drift_report',
      'compare_models',
      'get_label_status',
    ]

    if (!allowedTools.includes(toolName)) {
      return NextResponse.json({ error: 'Tool not allowed' }, { status: 403 })
    }

    const result = await callMCPTool(session.tenantId, session.userId, toolName, args || {})

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('MCP error:', error)
    return NextResponse.json({ error: 'MCP tool call failed' }, { status: 500 })
  }
}