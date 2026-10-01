export type UserRole = 'customer' | 'vendor' | 'partner' | 'admin'

export type RepairStatus =
  | 'REQUESTED'
  | 'AI_TRIAGED'
  | 'VENDOR_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'MANUAL_INSPECTION'
  | 'PICKUP_PENDING'
  | 'RECEIVED'
  | 'DIAGNOSIS'
  | 'PARTS_PENDING'
  | 'REPAIR'
  | 'TESTING'
  | 'READY'
  | 'DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'

export type QuoteStatus = 'DRAFT' | 'AI_ESTIMATE' | 'VENDOR_CONFIRMED' | 'CUSTOMER_APPROVED' | 'PAYMENT' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELLED'

export type PaymentStatus = 'CREATED' | 'PENDING' | 'REQUIRES_ACTION' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'

export type PickupStatus = 'AVAILABLE' | 'ACCEPTED' | 'ARRIVED' | 'OTP_VERIFIED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED'

export type Serviceability = 'LIKELY_SERVICEABLE' | 'NEEDS_MANUAL_INSPECTION' | 'LIKELY_UNSERVICEABLE'

export type LabelState = 'KNOWN' | 'PENDING' | 'NOT_APPLICABLE' | 'INVALID'

export interface User {
  id: string
  email: string
  phone?: string
  displayName: string
  role: UserRole
  tenantId: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface Tenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
  currency: string
  country: string
  timezone: string
  createdAt: Date
}

export interface Device {
  id: string
  tenantId: string
  customerId: string
  category: string
  brand: string
  model: string
  serialNumberHash?: string
  warrantyStatus?: string
  currentCondition?: string
  createdAt: Date
}

export interface DeviceEvidence {
  id: string
  deviceId: string
  repairRequestId?: string
  type: 'photo' | 'video' | 'document'
  url: string
  mimeType: string
  size: number
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface RepairRequest {
  id: string
  tenantId: string
  customerId: string
  deviceId: string
  reportedProblem: string
  normalizedProblem?: string
  status: RepairStatus
  triageStatus?: Serviceability
  aiConfidence?: number
  estimatedMinutes?: number
  estimatedLow?: number
  estimatedHigh?: number
  physicalInspectionRequired: boolean
  assignedVendorId?: string
  assignedTechnicianId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Quote {
  id: string
  tenantId: string
  repairRequestId: string
  version: number
  previousQuoteId?: string
  changeReason?: string
  status: QuoteStatus
  aiEstimateMin: number
  aiEstimateMax: number
  vendorEstimateMin?: number
  vendorEstimateMax?: number
  finalAmount?: number
  currency: string
  createdBy: string
  createdAt: Date
  approvedAt?: Date
}

export interface Payment {
  id: string
  tenantId: string
  quoteId: string
  customerId: string
  amount: number
  currency: string
  status: PaymentStatus
  stripePaymentIntentId?: string
  stripeClientSecret?: string
  idempotencyKey: string
  createdAt: Date
  updatedAt: Date
}

export interface PickupJob {
  id: string
  tenantId: string
  repairRequestId: string
  partnerId?: string
  status: PickupStatus
  pickupAddress: string
  deliveryAddress: string
  distanceKm?: number
  estimatedPayout?: number
  actualPayout?: number
  otpCode?: string
  acceptedAt?: Date
  pickedUpAt?: Date
  deliveredAt?: Date
  createdAt: Date
}

export interface ModelVersion {
  id: string
  tenantId: string
  version: string
  datasetVersion: string
  benchmarkId: string
  featureSchemaVersion: string
  metrics: ModelMetrics
  status: 'candidate' | 'champion' | 'archived'
  createdAt: Date
  promotedAt?: Date
}

export interface ModelMetrics {
  overallMae: number
  overallRmse: number
  commonJobMae: number
  newDeviceMae: number
  commonJobCount: number
  newDeviceCount: number
  labelPendingCount: number
  medianLabelLag: number
  p90LabelLag: number
  newDeviceShare: number
}

export interface Benchmark {
  id: string
  tenantId: string
  datasetVersion: string
  featureSchemaVersion: string
  rowHash: string
  eligibilityRule: string
  createdAt: Date
}

export interface DriftReport {
  id: string
  tenantId: string
  referenceWindowStart: Date
  referenceWindowEnd: Date
  currentWindowStart: Date
  currentWindowEnd: Date
  deviceCategoryPsi: number
  deviceFamilyPsi: number
  newDeviceProportionShift: number
  repairTypePsi: number
  complexityPsi: number
  symptomDistributionPsi: number
  missingnessShift: number
  technicianMixPsi: number
  serviceAreaPsi: number
  overallDriftScore: number
  createdAt: Date
}

export interface ScheduleRisk {
  id: string
  tenantId: string
  repairRequestId: string
  technicianId: string
  predictedFinish: Date
  nextWindowStart: Date
  nextWindowEnd: Date
  breachProbability: number
  severity: 'low' | 'medium' | 'high'
  cause: string
  createdAt: Date
}

export interface AITrace {
  id: string
  tenantId: string
  actorId: string
  actorRole: UserRole
  task: string
  provider: string
  model: string
  latencyMs: number
  success: boolean
  fallbackUsed: boolean
  toolCalls: string[]
  evidenceRefs: string[]
  createdAt: Date
}

export interface MCPToolCall {
  id: string
  tenantId: string
  actorId: string
  toolName: string
  arguments: Record<string, unknown>
  result: Record<string, unknown>
  success: boolean
  error?: string
  createdAt: Date
}

export interface AuditEvent {
  id: string
  tenantId: string
  actorId?: string
  actorRole?: UserRole
  action: string
  resourceType: string
  resourceId?: string
  metadata: Record<string, unknown>
  ipHash?: string
  createdAt: Date
}

export interface AIOutputContract {
  device: {
    category: string
    brand: string
    model: string
    confidence: number
  }
  issue: {
    normalized: string
  }
  triage: {
    serviceability: Serviceability
    confidence: number
    reasons: string[]
  }
  duration: {
    estimateMinutes: number
    lowerMinutes: number
    upperMinutes: number
  }
}

export interface PayoutCalculation {
  distanceKm: number
  cityPppFactor: number
  localFuelPrice: number
  vehicleEfficiencyKmPerLitre: number
  travelTimeMinutes: number
  pickupComplexity: number
  deliveryComplexity: number
  waitingTimeMinutes: number
  approvedTaxesFees: number
  partnerMargin: number
  minimumPayout: number
}

export interface PayoutResult {
  fuelCost: number
  baseCost: number
  adjustedCost: number
  priceBeforeAdjustments: number
  finalPayout: number
  breakdown: {
    fuel: number
    time: number
    tolls: number
    handling: number
    pppAdjustment: number
    margin: number
    taxes: number
  }
}