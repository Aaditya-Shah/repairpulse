import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(then)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    REQUESTED: 'bg-rp-muted',
    AI_TRIAGED: 'bg-blue-100 text-blue-800',
    VENDOR_REVIEW: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    MANUAL_INSPECTION: 'bg-orange-100 text-orange-800',
    PICKUP_PENDING: 'bg-purple-100 text-purple-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
    DIAGNOSIS: 'bg-cyan-100 text-cyan-800',
    PARTS_PENDING: 'bg-amber-100 text-amber-800',
    REPAIR: 'bg-indigo-100 text-indigo-800',
    TESTING: 'bg-violet-100 text-violet-800',
    READY: 'bg-emerald-100 text-emerald-800',
    DELIVERY: 'bg-sky-100 text-sky-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    AVAILABLE: 'bg-green-100 text-green-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    ARRIVED: 'bg-yellow-100 text-yellow-800',
    OTP_VERIFIED: 'bg-purple-100 text-purple-800',
    PICKED_UP: 'bg-indigo-100 text-indigo-800',
    IN_TRANSIT: 'bg-cyan-100 text-cyan-800',
    DELIVERED: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getRepairStatusOrder(status: string): number {
  const order: Record<string, number> = {
    REQUESTED: 1,
    AI_TRIAGED: 2,
    VENDOR_REVIEW: 3,
    MANUAL_INSPECTION: 4,
    CONFIRMED: 5,
    PICKUP_PENDING: 6,
    RECEIVED: 7,
    DIAGNOSIS: 8,
    PARTS_PENDING: 9,
    REPAIR: 10,
    TESTING: 11,
    READY: 12,
    DELIVERY: 13,
    COMPLETED: 14,
    REJECTED: 15,
    CANCELLED: 16,
  }
  return order[status] || 99
}

export function canTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    REQUESTED: ['AI_TRIAGED', 'CANCELLED'],
    AI_TRIAGED: ['VENDOR_REVIEW', 'REJECTED', 'MANUAL_INSPECTION'],
    VENDOR_REVIEW: ['CONFIRMED', 'REJECTED', 'MANUAL_INSPECTION'],
    MANUAL_INSPECTION: ['CONFIRMED', 'REJECTED'],
    CONFIRMED: ['PICKUP_PENDING', 'RECEIVED', 'CANCELLED'],
    PICKUP_PENDING: ['RECEIVED', 'CANCELLED'],
    RECEIVED: ['DIAGNOSIS', 'CANCELLED'],
    DIAGNOSIS: ['PARTS_PENDING', 'REPAIR', 'CANCELLED'],
    PARTS_PENDING: ['REPAIR', 'CANCELLED'],
    REPAIR: ['TESTING', 'DIAGNOSIS', 'CANCELLED'],
    TESTING: ['REPAIR', 'READY', 'CANCELLED'],
    READY: ['DELIVERY', 'COMPLETED', 'CANCELLED'],
    DELIVERY: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    REJECTED: [],
    CANCELLED: [],
  }
  return transitions[from]?.includes(to) || false
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

export function sanitizeHtml(input: string): string {
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone)
}