import { getDb } from '@/lib/database'
import { generateId } from '@/lib/utils'
import bcrypt from 'bcryptjs'

async function main() {
  const db = await getDb()

  console.log('Seeding demo data...')

  // Get demo tenant
  const tenant = await db.get('SELECT * FROM tenants WHERE slug = ?', 'demo')
  if (!tenant) {
    console.error('Demo tenant not found. Run init-db first.')
    process.exit(1)
  }

  const tenantId = tenant.id
  const now = new Date().toISOString()

  // Hash password for all demo users
  const passwordHash = bcrypt.hashSync('demo123', 12)

  // Create demo users
  const users = [
    { id: generateId(), email: 'customer@demo.com', displayName: 'Demo Customer', role: 'customer', phone: '+91 98765 43210' },
    { id: generateId(), email: 'vendor@demo.com', displayName: 'Demo Repairist', role: 'vendor', phone: '+91 98765 43211' },
    { id: generateId(), email: 'partner@demo.com', displayName: 'Demo Partner', role: 'partner', phone: '+91 98765 43212' },
    { id: generateId(), email: 'admin@demo.com', displayName: 'Demo Admin', role: 'admin', phone: '+91 98765 43213' },
    { id: generateId(), email: 'vendor2@demo.com', displayName: 'Repair Expert', role: 'vendor', phone: '+91 98765 43214' },
    { id: generateId(), email: 'vendor3@demo.com', displayName: 'Quick Fix', role: 'vendor', phone: '+91 98765 43215' },
    { id: generateId(), email: 'partner2@demo.com', displayName: 'Fast Delivery', role: 'partner', phone: '+91 98765 43216' },
    { id: generateId(), email: 'partner3@demo.com', displayName: 'City Courier', role: 'partner', phone: '+91 98765 43217' },
  ]

  for (const user of users) {
    const existing = await db.get('SELECT * FROM users WHERE email = ?', user.email)
    if (!existing) {
      await db.run(`
        INSERT INTO users (id, email, password_hash, display_name, role, tenant_id, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, user.id, user.email, passwordHash, user.displayName, user.role, tenantId, user.phone, now)
      console.log(`Created user: ${user.email} (${user.role})`)
    }
  }

  const customerUser = await db.get('SELECT * FROM users WHERE email = ? AND role = ?', 'customer@demo.com', 'customer')
  const vendorUser = await db.get('SELECT * FROM users WHERE email = ? AND role = ?', 'vendor@demo.com', 'vendor')
  const partnerUser = await db.get('SELECT * FROM users WHERE email = ? AND role = ?', 'partner@demo.com', 'partner')

  // Create devices for customer
  const devices = [
    { category: 'laptop', brand: 'Apple', model: 'MacBook Pro 14" M3', serial: 'MBP14M3001' },
    { category: 'phone', brand: 'Samsung', model: 'Galaxy S24 Ultra', serial: 'SAMS24U001' },
    { category: 'tablet', brand: 'Apple', model: 'iPad Pro 12.9" M2', serial: 'IPADPM2001' },
    { category: 'laptop', brand: 'Dell', model: 'XPS 13 Plus', serial: 'DELLXPS001' },
    { category: 'phone', brand: 'Google', model: 'Pixel 8 Pro', serial: 'GOOGLEP8P001' },
  ]

  for (const device of devices) {
    const deviceId = generateId()
    await db.run(`
      INSERT INTO devices (id, tenant_id, customer_id, category, brand, model, serial_number_hash, warranty_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `, deviceId, tenantId, customerUser.id, device.category, device.brand, device.model, device.serial, now)
  }

  console.log('Created devices for customer')

  // Create some repair requests with different statuses
  const repairScenarios = [
    { deviceIdx: 0, problem: 'Screen cracked after drop', status: 'COMPLETED', triage: 'LIKELY_SERVICEABLE', confidence: 0.85, estimated: 90, actual: 85 },
    { deviceIdx: 1, problem: 'Battery draining fast', status: 'REPAIR', triage: 'LIKELY_SERVICEABLE', confidence: 0.92, estimated: 45, actual: null },
    { deviceIdx: 2, problem: 'Water damage - not charging', status: 'DIAGNOSIS', triage: 'NEEDS_MANUAL_INSPECTION', confidence: 0.65, estimated: 120, actual: null },
    { deviceIdx: 3, problem: 'Keyboard keys not working', status: 'VENDOR_REVIEW', triage: 'LIKELY_SERVICEABLE', confidence: 0.78, estimated: 60, actual: null },
    { deviceIdx: 4, problem: 'Camera glass shattered', status: 'AI_TRIAGED', triage: 'LIKELY_SERVICEABLE', confidence: 0.88, estimated: 40, actual: null },
  ]

  const allDevices = await db.all('SELECT * FROM devices WHERE customer_id = ?', customerUser.id)

  for (let i = 0; i < repairScenarios.length; i++) {
    const scenario = repairScenarios[i]
    const device = allDevices[scenario.deviceIdx]
    if (!device) continue

    const repairId = generateId()
    await db.run(`
      INSERT INTO repair_requests (
        id, tenant_id, customer_id, device_id, reported_problem, normalized_problem,
        status, triage_status, ai_confidence, estimated_minutes, estimated_low, estimated_high,
        physical_inspection_required, assigned_vendor_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, repairId, tenantId, customerUser.id, device.id, scenario.problem,
      scenario.problem.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      scenario.status, scenario.triage, scenario.confidence,
      scenario.estimated, Math.round(scenario.estimated * 0.7), Math.round(scenario.estimated * 1.3),
      scenario.triage === 'NEEDS_MANUAL_INSPECTION' ? 1 : 0,
      scenario.status !== 'AI_TRIAGED' && scenario.status !== 'REQUESTED' ? vendorUser.id : null,
      now, now
    )

    // Add status history
    await db.run(`
      INSERT INTO repair_status_history (id, repair_request_id, status, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, generateId(), repairId, scenario.status, `Status: ${scenario.status}`, now)

    // Create quotes for confirmed repairs
    if (['CONFIRMED', 'REPAIR', 'TESTING', 'READY', 'COMPLETED'].includes(scenario.status)) {
      const quoteId = generateId()
      const quoteMin = Math.round(scenario.estimated * 80)
      const quoteMax = Math.round(scenario.estimated * 120)
      await db.run(`
        INSERT INTO quotes (id, tenant_id, repair_request_id, version, status, ai_estimate_min, ai_estimate_max, vendor_estimate_min, vendor_estimate_max, final_amount, currency, created_by, created_at)
        VALUES (?, ?, ?, 1, 'CUSTOMER_APPROVED', ?, ?, ?, ?, ?, 'INR', ?, ?)
      `, quoteId, tenantId, repairId, quoteMin, quoteMax, quoteMin, quoteMax, Math.round((quoteMin + quoteMax) / 2), vendorUser.id, now)
    }

    // Create pickup jobs for completed/completed repairs
    if (['READY', 'COMPLETED'].includes(scenario.status)) {
      const pickupId = generateId()
      await db.run(`
        INSERT INTO pickup_jobs (id, tenant_id, repair_request_id, partner_id, status, pickup_address, delivery_address, distance_km, estimated_payout, created_at)
        VALUES (?, ?, ?, ?, 'DELIVERED', '123 Customer St, Mumbai', '456 Vendor Ave, Mumbai', 8.5, 350, ?)
      `, pickupId, tenantId, repairId, partnerUser.id, now)
    }
  }

  console.log('Created repair requests with various statuses')

  // Create model versions
  const modelVersions = [
    { version: 'v17', status: 'champion', overallMae: 18.0, commonJobMae: 10.0, newDeviceMae: 50.0, commonJobCount: 800, newDeviceCount: 200, labelPending: 45, medianLabelLag: 720, p90LabelLag: 2880, newDeviceShare: 0.2 },
    { version: 'v18', status: 'candidate', overallMae: 17.3, commonJobMae: 12.1, newDeviceMae: 38.0, commonJobCount: 850, newDeviceCount: 220, labelPending: 38, medianLabelLag: 600, p90LabelLag: 2400, newDeviceShare: 0.205 },
  ]

  for (const mv of modelVersions) {
    const modelId = generateId()
    const metrics = {
      overallMae: mv.overallMae,
      overallRmse: mv.overallMae * 1.3,
      commonJobMae: mv.commonJobMae,
      newDeviceMae: mv.newDeviceMae,
      commonJobCount: mv.commonJobCount,
      newDeviceCount: mv.newDeviceCount,
      labelPendingCount: mv.labelPending,
      medianLabelLag: mv.medianLabelLag,
      p90LabelLag: mv.p90LabelLag,
      newDeviceShare: mv.newDeviceShare,
    }
    await db.run(`
      INSERT INTO model_versions (id, tenant_id, version, dataset_version, benchmark_id, feature_schema_version, metrics, status, created_at)
      VALUES (?, ?, ?, 'dataset-v3', 'benchmark-42', '3', ?, ?, ?)
    `, modelId, tenantId, mv.version, JSON.stringify(metrics), mv.status, now)
  }

  console.log('Created model versions')

  // Create benchmark
  await db.run(`
    INSERT INTO benchmarks (id, tenant_id, dataset_version, feature_schema_version, row_hash, eligibility_rule, created_at)
    VALUES ('benchmark-42', ?, 'dataset-v3', '3', 'sha256:abc123', 'completed jobs with actual_duration not null', ?)
  `, tenantId, now)

  console.log('Created benchmark')

  // Create drift report
  const driftId = generateId()
  await db.run(`
    INSERT INTO drift_reports (
      id, tenant_id, reference_window_start, reference_window_end,
      current_window_start, current_window_end,
      device_category_psi, device_family_psi, new_device_proportion_shift,
      repair_type_psi, complexity_psi, symptom_distribution_psi,
      missingness_shift, technician_mix_psi, service_area_psi,
      overall_drift_score, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, driftId, tenantId,
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    new Date().toISOString(),
    0.15, 0.22, 0.12, 0.08, 0.11, 0.09, 0.03, 0.05, 0.07, 0.14, now
  )

  console.log('Created drift report')

  // Create schedule risks
  for (let i = 0; i < 3; i++) {
    const riskId = generateId()
    const repair = await db.get('SELECT id FROM repair_requests WHERE status IN (?, ?, ?) LIMIT 1', 'REPAIR', 'TESTING', 'READY')
    if (repair) {
      await db.run(`
        INSERT INTO schedule_risks (id, tenant_id, repair_request_id, technician_id, predicted_finish, next_window_start, next_window_end, breach_probability, severity, cause, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'high', 'New-device repair overrun causing cascade delay', ?)
      `, riskId, tenantId, repair.id, vendorUser.id, 
        new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        0.85, now)
    }
  }

  console.log('Created schedule risks')

  console.log('Seeding complete!')
  console.log('Demo credentials:')
  console.log('  customer@demo.com / demo123')
  console.log('  vendor@demo.com / demo123')
  console.log('  partner@demo.com / demo123')
  console.log('  admin@demo.com / demo123')

  process.exit(0)
}

main().catch(err => {
  console.error('Seeding failed:', err)
  process.exit(1)
})