import { getDb } from './database'
import type { PayoutCalculation, PayoutResult, Quote, RepairRequest } from '@/types'

export const PRICING_DEFAULTS = {
  currency: 'INR',
  serviceFeePercent: 10,
  pickupFeePerKm: 15,
  deliveryFeePerKm: 15,
  taxPercent: 18,
  partnerMargin: 0.4,
  minimumPayout: 100,
  vehicleEfficiencyKmPerLitre: 20,
  baseFuelPrice: 100,
  baseTimeCostPerMinute: 2,
  handlingFee: 50,
  tollsPerKm: 2,
  pppFactorByCity: {
    'mumbai': 1.3,
    'delhi': 1.25,
    'bangalore': 1.2,
    'hyderabad': 1.15,
    'chennai': 1.15,
    'pune': 1.1,
    'kolkata': 1.1,
    'ahmedabad': 1.05,
    'default': 1.0,
  },
}

export async function calculateAIEstimate(repair: RepairRequest): Promise<{ min: number; max: number }> {
  const baseMinutes = repair.estimated_minutes || 60
  const uncertainty = 0.3
  
  const baseRate = 500
  const partsEstimate = estimatePartsCost(repair)
  
  const laborCost = baseMinutes * baseRate
  const totalBase = laborCost + partsEstimate
  
  const min = Math.round(totalBase * (1 - uncertainty))
  const max = Math.round(totalBase * (1 + uncertainty))
  
  return { min, max }
}

function estimatePartsCost(repair: RepairRequest): number {
  const categoryParts: Record<string, number> = {
    laptop: 3000,
    phone: 1500,
    tablet: 2000,
    desktop: 4000,
    watch: 1000,
    headphones: 800,
    default: 2000,
  }
  
  return categoryParts[repair.device?.category?.toLowerCase()] || categoryParts.default
}

export async function calculateVendorQuote(
  aiMin: number,
  aiMax: number,
  vendorAdjustment: { min?: number; max?: number } = {}
): Promise<{ min: number; max: number }> {
  return {
    min: vendorAdjustment.min ?? aiMin,
    max: vendorAdjustment.max ?? aiMax,
  }
}

export async function calculateFinalAmount(quote: Quote): Promise<number> {
  const baseAmount = quote.final_amount || quote.vendor_estimate_max || quote.ai_estimate_max
  const serviceFee = Math.round(baseAmount * (PRICING_DEFAULTS.serviceFeePercent / 100))
  const tax = Math.round((baseAmount + serviceFee) * (PRICING_DEFAULTS.taxPercent / 100))
  
  return baseAmount + serviceFee + tax
}

export function calculatePayout(input: PayoutCalculation): PayoutResult {
  const {
    distanceKm,
    cityPppFactor,
    localFuelPrice,
    vehicleEfficiencyKmPerLitre,
    travelTimeMinutes,
    pickupComplexity,
    deliveryComplexity,
    waitingTimeMinutes,
    approvedTaxesFees,
    partnerMargin,
    minimumPayout,
  } = input

  const fuelCost = (distanceKm / vehicleEfficiencyKmPerLitre) * localFuelPrice
  const timeCost = (travelTimeMinutes + waitingTimeMinutes) * PRICING_DEFAULTS.baseTimeCostPerMinute
  const tolls = distanceKm * PRICING_DEFAULTS.tollsPerKm
  
  const baseCost = fuelCost + timeCost + tolls + PRICING_DEFAULTS.handlingFee
  const adjustedCost = baseCost * cityPppFactor
  const priceBeforeAdjustments = adjustedCost / (1 - partnerMargin)
  
  const finalPayout = Math.max(minimumPayout, priceBeforeAdjustments + approvedTaxesFees)

  return {
    fuelCost,
    baseCost,
    adjustedCost,
    priceBeforeAdjustments,
    finalPayout,
    breakdown: {
      fuel: fuelCost,
      time: timeCost,
      tolls,
      handling: PRICING_DEFAULTS.handlingFee,
      pppAdjustment: adjustedCost - baseCost,
      margin: priceBeforeAdjustments - adjustedCost,
      taxes: approvedTaxesFees,
    },
  }
}

export async function estimatePayoutForPickup(
  tenantId: string,
  pickupAddress: string,
  deliveryAddress: string,
  distanceKm: number,
  city: string
): Promise<PayoutResult> {
  const cityPppFactor = PRICING_DEFAULTS.pppFactorByCity[city.toLowerCase()] || PRICING_DEFAULTS.pppFactorByCity.default
  
  return calculatePayout({
    distanceKm,
    cityPppFactor,
    localFuelPrice: PRICING_DEFAULTS.baseFuelPrice,
    vehicleEfficiencyKmPerLitre: PRICING_DEFAULTS.vehicleEfficiencyKmPerLitre,
    travelTimeMinutes: distanceKm * 3,
    pickupComplexity: 1,
    deliveryComplexity: 1,
    waitingTimeMinutes: 10,
    approvedTaxesFees: 0,
    partnerMargin: PRICING_DEFAULTS.partnerMargin,
    minimumPayout: PRICING_DEFAULTS.minimumPayout,
  })
}

export async function getPricingConfig(tenantId: string) {
  const db = getDb()
  
  const config = db.prepare('SELECT * FROM pricing_config WHERE tenant_id = ?').get(tenantId)
  
  return config ? { ...PRICING_DEFAULTS, ...JSON.parse(config.config_json) } : PRICING_DEFAULTS
}

export async function setPricingConfig(tenantId: string, config: Partial<typeof PRICING_DEFAULTS>) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM pricing_config WHERE tenant_id = ?').get(tenantId)
  const current = existing ? JSON.parse(existing.config_json) : PRICING_DEFAULTS
  const merged = { ...current, ...config }
  
  if (existing) {
    db.prepare('UPDATE pricing_config SET config_json = ? WHERE tenant_id = ?').run(JSON.stringify(merged), tenantId)
  } else {
    db.prepare('INSERT INTO pricing_config (tenant_id, config_json) VALUES (?, ?)').run(tenantId, JSON.stringify(merged))
  }
  
  return merged
}