import { getDb } from './database'
import { generateId } from './utils'
import type { ModelMetrics, DriftReport, ModelVersion, Benchmark } from '@/types'

export function calculatePSI(expected: number[], actual: number[], buckets = 10): number {
  if (expected.length === 0 || actual.length === 0) return 0
  
  const minVal = Math.min(...expected, ...actual)
  const maxVal = Math.max(...expected, ...actual)
  const range = maxVal - minVal || 1
  
  const expectedHist = new Array(buckets).fill(0)
  const actualHist = new Array(buckets).fill(0)
  
  for (const v of expected) {
    const idx = Math.min(buckets - 1, Math.floor(((v - minVal) / range) * buckets))
    expectedHist[idx]++
  }
  
  for (const v of actual) {
    const idx = Math.min(buckets - 1, Math.floor(((v - minVal) / range) * buckets))
    actualHist[idx]++
  }
  
  const expectedTotal = expected.length
  const actualTotal = actual.length
  
  let psi = 0
  for (let i = 0; i < buckets; i++) {
    const e = (expectedHist[i] / expectedTotal) || 0.0001
    const a = (actualHist[i] / actualTotal) || 0.0001
    psi += (a - e) * Math.log(a / e)
  }
  
  return psi
}

export function calculateCategoricalPSI(
  expected: Record<string, number>,
  actual: Record<string, number>
): number {
  const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)])
  const expectedTotal = Object.values(expected).reduce((a, b) => a + b, 0)
  const actualTotal = Object.values(actual).reduce((a, b) => a + b, 0)
  
  let psi = 0
  for (const key of allKeys) {
    const e = ((expected[key] || 0) / expectedTotal) || 0.0001
    const a = ((actual[key] || 0) / actualTotal) || 0.0001
    psi += (a - e) * Math.log(a / e)
  }
  
  return psi
}

export async function detectDrift(tenantId: string): Promise<DriftReport> {
  const db = getDb()
  
  const now = new Date()
  const currentWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const currentWindowEnd = now
  const referenceWindowStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const referenceWindowEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const refRepairs = db.prepare(`
    SELECT device_category, device_brand, repair_type, complexity, symptoms, technician_id, service_area, is_new_device
    FROM repair_requests
    WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
  `).all(tenantId, referenceWindowStart.toISOString(), referenceWindowEnd.toISOString())
  
  const curRepairs = db.prepare(`
    SELECT device_category, device_brand, repair_type, complexity, symptoms, technician_id, service_area, is_new_device
    FROM repair_requests
    WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
  `).all(tenantId, currentWindowStart.toISOString(), currentWindowEnd.toISOString())
  
  const refCats = countBy(refRepairs, 'device_category')
  const curCats = countBy(curRepairs, 'device_category')
  const deviceCategoryPsi = calculateCategoricalPSI(refCats, curCats)
  
  const refFamilies = countBy(refRepairs, 'device_brand')
  const curFamilies = countBy(curRepairs, 'device_brand')
  const deviceFamilyPsi = calculateCategoricalPSI(refFamilies, curFamilies)
  
  const refNewDevice = refRepairs.filter(r => r.is_new_device).length / (refRepairs.length || 1)
  const curNewDevice = curRepairs.filter(r => r.is_new_device).length / (curRepairs.length || 1)
  const newDeviceProportionShift = curNewDevice - refNewDevice
  
  const refTypes = countBy(refRepairs, 'repair_type')
  const curTypes = countBy(curRepairs, 'repair_type')
  const repairTypePsi = calculateCategoricalPSI(refTypes, curTypes)
  
  const refComplexity = countBy(refRepairs, 'complexity')
  const curComplexity = countBy(curRepairs, 'complexity')
  const complexityPsi = calculateCategoricalPSI(refComplexity, curComplexity)
  
  const refSymptoms = countBy(refRepairs, 'symptoms')
  const curSymptoms = countBy(curRepairs, 'symptoms')
  const symptomDistributionPsi = calculateCategoricalPSI(refSymptoms, curSymptoms)
  
  const refMissing = refRepairs.filter(r => !r.symptoms).length / (refRepairs.length || 1)
  const curMissing = curRepairs.filter(r => !r.symptoms).length / (curRepairs.length || 1)
  const missingnessShift = curMissing - refMissing
  
  const refTechs = countBy(refRepairs, 'technician_id')
  const curTechs = countBy(curRepairs, 'technician_id')
  const technicianMixPsi = calculateCategoricalPSI(refTechs, curTechs)
  
  const refAreas = countBy(refRepairs, 'service_area')
  const curAreas = countBy(curRepairs, 'service_area')
  const serviceAreaPsi = calculateCategoricalPSI(refAreas, curAreas)
  
  const overallDriftScore = (
    deviceCategoryPsi * 0.2 +
    deviceFamilyPsi * 0.15 +
    Math.abs(newDeviceProportionShift) * 10 * 0.2 +
    repairTypePsi * 0.1 +
    complexityPsi * 0.1 +
    symptomDistributionPsi * 0.1 +
    Math.abs(missingnessShift) * 5 * 0.05 +
    technicianMixPsi * 0.05 +
    serviceAreaPsi * 0.05
  )
  
  const reportId = generateId()
  db.prepare(`
    INSERT INTO drift_reports (
      id, tenant_id, reference_window_start, reference_window_end,
      current_window_start, current_window_end,
      device_category_psi, device_family_psi, new_device_proportion_shift,
      repair_type_psi, complexity_psi, symptom_distribution_psi,
      missingness_shift, technician_mix_psi, service_area_psi,
      overall_drift_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reportId, tenantId,
    referenceWindowStart.toISOString(), referenceWindowEnd.toISOString(),
    currentWindowStart.toISOString(), currentWindowEnd.toISOString(),
    deviceCategoryPsi, deviceFamilyPsi, newDeviceProportionShift,
    repairTypePsi, complexityPsi, symptomDistributionPsi,
    missingnessShift, technicianMixPsi, serviceAreaPsi,
    overallDriftScore
  )
  
  return {
    id: reportId,
    tenantId,
    referenceWindowStart,
    referenceWindowEnd,
    currentWindowStart,
    currentWindowEnd,
    deviceCategoryPsi,
    deviceFamilyPsi,
    newDeviceProportionShift,
    repairTypePsi,
    complexityPsi,
    symptomDistributionPsi,
    missingnessShift,
    technicianMixPsi,
    serviceAreaPsi,
    overallDriftScore,
    createdAt: new Date(),
  }
}

function countBy(items: any[], key: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const val = item[key] || 'unknown'
    counts[val] = (counts[val] || 0) + 1
  }
  return counts
}

export async function evaluateModelOnBenchmark(
  tenantId: string,
  modelVersionId: string,
  benchmarkId?: string
): Promise<ModelMetrics> {
  const db = getDb()
  
  const model = db.prepare('SELECT * FROM model_versions WHERE id = ? AND tenant_id = ?').get(modelVersionId, tenantId)
  if (!model) throw new Error('Model version not found')
  
  const benchmark = benchmarkId
    ? db.prepare('SELECT * FROM benchmarks WHERE id = ? AND tenant_id = ?').get(benchmarkId, tenantId)
    : db.prepare('SELECT * FROM benchmarks WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1').get(tenantId)
  
  if (!benchmark) throw new Error('No benchmark found')
  
  if (model.benchmark_id !== benchmark.id) {
    throw new Error('Benchmark mismatch: model and evaluation must use the same frozen benchmark')
  }
  
  const testData = db.prepare(`
    SELECT rr.*, d.category as device_category, d.brand as device_brand
    FROM repair_requests rr
    JOIN devices d ON rr.device_id = d.id
    WHERE rr.tenant_id = ? AND rr.status = 'COMPLETED' AND rr.actual_duration IS NOT NULL
    AND rr.created_at <= ?
    ORDER BY rr.created_at DESC
    LIMIT 1000
  `).all(tenantId, benchmark.created_at)
  
  const commonJobs = testData.filter(r => !r.is_new_device)
  const newDeviceJobs = testData.filter(r => r.is_new_device)
  
  const calculateMAE = (jobs: any[]) => {
    if (jobs.length === 0) return 0
    const errors = jobs.map(j => Math.abs(j.predicted_duration - j.actual_duration))
    return errors.reduce((a, b) => a + b, 0) / errors.length
  }
  
  const calculateRMSE = (jobs: any[]) => {
    if (jobs.length === 0) return 0
    const errors = jobs.map(j => Math.pow(j.predicted_duration - j.actual_duration, 2))
    return Math.sqrt(errors.reduce((a, b) => a + b, 0) / errors.length)
  }
  
  const labelPending = db.prepare(`
    SELECT COUNT(*) as count FROM repair_requests
    WHERE tenant_id = ? AND status = 'COMPLETED' AND actual_duration IS NULL
  `).get(tenantId) as { count: number }
  
  const labelLags = db.prepare(`
    SELECT (julianday(label_arrived_at) - julianday(completed_at)) * 24 * 60 as lag_minutes
    FROM repair_requests
    WHERE tenant_id = ? AND actual_duration IS NOT NULL AND label_arrived_at IS NOT NULL
  `).all(tenantId) as { lag_minutes: number }[]
  
  const sortedLags = labelLags.map(l => l.lag_minutes).sort((a, b) => a - b)
  const medianLabelLag = sortedLags[Math.floor(sortedLags.length / 2)] || 0
  const p90LabelLag = sortedLags[Math.floor(sortedLags.length * 0.9)] || 0
  
  const metrics: ModelMetrics = {
    overallMae: calculateMAE(testData),
    overallRmse: calculateRMSE(testData),
    commonJobMae: calculateMAE(commonJobs),
    newDeviceMae: calculateMAE(newDeviceJobs),
    commonJobCount: commonJobs.length,
    newDeviceCount: newDeviceJobs.length,
    labelPendingCount: labelPending.count,
    medianLabelLag,
    p90LabelLag,
    newDeviceShare: newDeviceJobs.length / (testData.length || 1),
  }
  
  db.prepare('UPDATE model_versions SET metrics = ? WHERE id = ?').run(JSON.stringify(metrics), modelVersionId)
  
  return metrics
}

export async function checkPromotionGuardrails(
  tenantId: string,
  candidateVersionId: string
): Promise<{ allowed: boolean; failures: string[] }> {
  const db = getDb()
  
  const candidate = db.prepare('SELECT * FROM model_versions WHERE id = ? AND tenant_id = ?').get(candidateVersionId, tenantId)
  if (!candidate) throw new Error('Candidate model not found')
  
  const champion = db.prepare('SELECT * FROM model_versions WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1')
    .get(tenantId, 'champion')
  
  const candidateMetrics = JSON.parse(candidate.metrics) as ModelMetrics
  const failures: string[] = []
  
  if (champion) {
    const championMetrics = JSON.parse(champion.metrics) as ModelMetrics
    
    if (candidateMetrics.commonJobMae > championMetrics.commonJobMae * 1.05) {
      failures.push('common_job_mae_regression')
    }
    
    if (candidateMetrics.overallMae > championMetrics.overallMae * 1.1) {
      failures.push('overall_mae_regression')
    }
    
    if (candidateMetrics.newDeviceMae > championMetrics.newDeviceMae * 1.1) {
      failures.push('new_device_mae_regression')
    }
  }
  
  if (candidateMetrics.labelPendingCount > 100) {
    failures.push('high_label_pending')
  }
  
  if (candidateMetrics.newDeviceShare > 0.5 && candidateMetrics.newDeviceCount < 50) {
    failures.push('insufficient_new_device_samples')
  }
  
  return { allowed: failures.length === 0, failures }
}

export async function promoteModel(tenantId: string, modelVersionId: string): Promise<void> {
  const db = getDb()
  
  const { allowed, failures } = await checkPromotionGuardrails(tenantId, modelVersionId)
  if (!allowed) {
    throw new Error(`Promotion blocked: ${failures.join(', ')}`)
  }
  
  db.prepare('UPDATE model_versions SET status = ? WHERE tenant_id = ? AND status = ?').run('archived', tenantId, 'champion')
  db.prepare('UPDATE model_versions SET status = ?, promoted_at = ? WHERE id = ?').run('champion', new Date().toISOString(), modelVersionId)
}

export async function createModelVersion(
  tenantId: string,
  version: string,
  datasetVersion: string,
  benchmarkId: string,
  featureSchemaVersion: string,
  metrics: ModelMetrics
): Promise<string> {
  const db = getDb()
  const modelId = generateId()
  
  db.prepare(`
    INSERT INTO model_versions (id, tenant_id, version, dataset_version, benchmark_id, feature_schema_version, metrics)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(modelId, tenantId, version, datasetVersion, benchmarkId, featureSchemaVersion, JSON.stringify(metrics))
  
  return modelId
}

export async function createBenchmark(
  tenantId: string,
  datasetVersion: string,
  featureSchemaVersion: string,
  rowHash: string,
  eligibilityRule: string
): Promise<string> {
  const db = getDb()
  const benchmarkId = generateId()
  
  db.prepare(`
    INSERT INTO benchmarks (id, tenant_id, dataset_version, feature_schema_version, row_hash, eligibility_rule)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(benchmarkId, tenantId, datasetVersion, featureSchemaVersion, rowHash, eligibilityRule)
  
  return benchmarkId
}

export async function getModelHealth(tenantId: string) {
  const db = getDb()
  
  const champion = db.prepare('SELECT * FROM model_versions WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1')
    .get(tenantId, 'champion')
  
  const candidates = db.prepare('SELECT * FROM model_versions WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 5')
    .all(tenantId, 'candidate')
  
  const latestDrift = db.prepare('SELECT * FROM drift_reports WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(tenantId)
  
  const labelStatus = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN actual_duration IS NOT NULL THEN 1 ELSE 0 END) as labeled,
      SUM(CASE WHEN actual_duration IS NULL AND status = 'COMPLETED' THEN 1 ELSE 0 END) as pending
    FROM repair_requests WHERE tenant_id = ?
  `).get(tenantId)
  
  return { champion, candidates, latestDrift, labelStatus }
}