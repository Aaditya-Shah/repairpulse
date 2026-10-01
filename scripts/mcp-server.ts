#!/usr/bin/env tsx
/**
 * MCP Server for RepairPulse
 * Provides safe, read-only tools for AI evidence access
 * Run: npx tsx scripts/mcp-server.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getDb } from '@/lib/database'

const server = new McpServer({
  name: 'repairpulse-mcp',
  version: '1.0.0',
})

// Tool: Get repair request
server.tool(
  'get_repair_request',
  'Get repair request details by ID',
  { repairId: z.string().describe('Repair request ID') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    const repair = db.prepare(`
      SELECT rr.*, d.category, d.brand, d.model, d.serial_number_hash
      FROM repair_requests rr
      JOIN devices d ON rr.device_id = d.id
      WHERE rr.id = ? AND rr.tenant_id = ?
    `).get(repairId, tenantId)
    
    if (!repair) {
      throw new Error('Repair not found')
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(repair, null, 2) }] }
  }
)

// Tool: Get device evidence
server.tool(
  'get_device_evidence',
  'Get device evidence (photos, videos) for a repair',
  { repairId: z.string().describe('Repair request ID') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    const evidence = db.prepare(`
      SELECT * FROM device_evidence WHERE repair_request_id = ?
    `).all(repairId)
    
    return { content: [{ type: 'text', text: JSON.stringify(evidence, null, 2) }] }
  }
)

// Tool: Get repair status
server.tool(
  'get_repair_status',
  'Get current repair status and key metrics',
  { repairId: z.string().describe('Repair request ID') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    const status = db.prepare(`
      SELECT status, triage_status, ai_confidence, estimated_minutes, 
             estimated_low, estimated_high, assigned_vendor_id, updated_at
      FROM repair_requests WHERE id = ? AND tenant_id = ?
    `).get(repairId, tenantId)
    
    if (!status) {
      throw new Error('Repair not found')
    }
    
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
  }
)

// Tool: Get customer safe summary
server.tool(
  'get_customer_safe_summary',
  'Get safe summary for customer communication',
  { repairId: z.string().describe('Repair request ID') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    const summary = db.prepare(`
      SELECT rr.*, d.category, d.brand, d.model
      FROM repair_requests rr
      JOIN devices d ON rr.device_id = d.id
      WHERE rr.id = ? AND rr.tenant_id = ?
    `).get(repairId, tenantId)
    
    if (!summary) {
      throw new Error('Repair not found')
    }
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          device: `${summary.brand} ${summary.model} (${summary.category})`,
          problem: summary.reported_problem,
          status: summary.status,
          estimatedDuration: summary.estimated_minutes,
          triageStatus: summary.triage_status,
        }, null, 2) 
      }] 
    }
  }
)

// Tool: Get vendor capacity
server.tool(
  'get_vendor_capacity',
  'Get vendor workload and capacity',
  { vendorId: z.string().optional().describe('Vendor ID (optional, defaults to current user)') },
  async ({ vendorId }, { tenantId, userId }) => {
    const db = getDb()
    const targetVendorId = vendorId || userId
    
    const capacity = db.prepare(`
      SELECT COUNT(*) as active_count FROM repair_requests 
      WHERE tenant_id = ? AND assigned_vendor_id = ? 
      AND status IN ('VENDOR_REVIEW', 'CONFIRMED', 'RECEIVED', 'DIAGNOSIS', 'REPAIR', 'TESTING')
    `).get(tenantId, targetVendorId)
    
    return { content: [{ type: 'text', text: JSON.stringify(capacity, null, 2) }] }
  }
)

// Tool: Get quote context
server.tool(
  'get_quote_context',
  'Get quote details for a repair',
  { repairId: z.string().describe('Repair request ID') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    const quote = db.prepare(`
      SELECT * FROM quotes WHERE repair_request_id = ? AND tenant_id = ? ORDER BY version DESC LIMIT 1
    `).get(repairId, tenantId)
    
    return { content: [{ type: 'text', text: JSON.stringify(quote || null, null, 2) }] }
  }
)

// Tool: Get schedule risk
server.tool(
  'get_schedule_risk',
  'Get schedule cascade risk for repairs',
  { repairId: z.string().optional().describe('Specific repair ID (optional)') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    let query = 'SELECT * FROM schedule_risks WHERE tenant_id = ?'
    const params: unknown[] = [tenantId]
    
    if (repairId) {
      query += ' AND repair_request_id = ?'
      params.push(repairId)
    }
    
    query += ' ORDER BY created_at DESC LIMIT 10'
    
    const risks = db.prepare(query).all(...params)
    return { content: [{ type: 'text', text: JSON.stringify(risks, null, 2) }] }
  }
)

// Tool: Get model health
server.tool(
  'get_model_health',
  'Get MLOps model health: champion, candidates, drift',
  { },
  async (_, { tenantId }) => {
    const db = getDb()
    
    const champion = db.prepare(`
      SELECT * FROM model_versions WHERE tenant_id = ? AND status = 'champion' ORDER BY created_at DESC LIMIT 1
    `).get(tenantId)
    
    const candidates = db.prepare(`
      SELECT * FROM model_versions WHERE tenant_id = ? AND status = 'candidate' ORDER BY created_at DESC LIMIT 5
    `).all(tenantId)
    
    const drift = db.prepare(`
      SELECT * FROM drift_reports WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(tenantId)
    
    const labelStatus = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN actual_duration IS NOT NULL THEN 1 ELSE 0 END) as labeled,
        SUM(CASE WHEN actual_duration IS NULL AND status = 'COMPLETED' THEN 1 ELSE 0 END) as pending
      FROM repair_requests WHERE tenant_id = ?
    `).get(tenantId)
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ champion, candidates, drift, labelStatus }, null, 2) 
      }] 
    }
  }
)

// Tool: Get drift report
server.tool(
  'get_drift_report',
  'Get latest data drift detection report',
  { },
  async (_, { tenantId }) => {
    const db = getDb()
    const drift = db.prepare(`
      SELECT * FROM drift_reports WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(tenantId)
    
    return { content: [{ type: 'text', text: JSON.stringify(drift || { message: 'No drift report available' }, null, 2) }] }
  }
)

// Tool: Compare models
server.tool(
  'compare_models',
  'Compare champion vs candidate model on frozen benchmark',
  { modelVersionId: z.string().describe('Candidate model version ID') },
  async ({ modelVersionId }, { tenantId }) => {
    const db = getDb()
    const model = db.prepare('SELECT * FROM model_versions WHERE id = ? AND tenant_id = ?').get(modelVersionId, tenantId)
    if (!model) throw new Error('Model version not found')
    
    const benchmark = db.prepare('SELECT * FROM benchmarks WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1').get(tenantId)
    
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          model: JSON.parse(model.metrics),
          benchmark: benchmark?.id,
          sameBenchmark: model.benchmark_id === benchmark?.id,
        }, null, 2) 
      }] 
    }
  }
)

// Tool: Get label status
server.tool(
  'get_label_status',
  'Get label pending status for repairs',
  { repairId: z.string().optional().describe('Specific repair ID (optional)') },
  async ({ repairId }, { tenantId }) => {
    const db = getDb()
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN actual_duration IS NOT NULL THEN 1 ELSE 0 END) as labeled,
        SUM(CASE WHEN actual_duration IS NULL AND status = 'COMPLETED' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM repair_requests WHERE tenant_id = ?
    `
    const params: unknown[] = [tenantId]
    
    if (repairId) {
      query = query.replace('WHERE tenant_id = ?', 'WHERE tenant_id = ? AND id = ?')
      params.push(repairId)
    }
    
    const status = db.prepare(query).get(...params)
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
  }
)

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
console.error('RepairPulse MCP Server running on stdio')