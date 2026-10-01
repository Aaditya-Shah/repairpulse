'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header, PageContainer, Section, Card, CardContent, StatusBadge, DataCard, RepairTimeline } from '@/components/ui/layout'
import { Button } from '@/components/ui/base'
import { formatRelativeTime, formatDuration, formatCurrency } from '@/lib/utils'
import { Box, Truck, CreditCard, MessageCircle, Plus, RefreshCw, Filter, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Repair {
  id: string
  status: string
  reported_problem: string
  device?: { category: string; brand: string; model: string }
  estimated_minutes?: number
  estimated_low?: number
  estimated_high?: number
  triage_status?: string
  ai_confidence?: number
  assigned_vendor_id?: string
  vendor_name?: string
  vendor_email?: string
  updated_at: string
  created_at: string
}

export default function CustomerDashboard() {
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchRepairs = async () => {
    try {
      const res = await fetch('/api/repairs')
      if (res.ok) {
        const data = await res.json()
        setRepairs(data.repairs || [])
      }
    } catch (error) {
      console.error('Failed to fetch repairs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepairs()
  }, [])

  const filteredRepairs = filter === 'all' 
    ? repairs 
    : repairs.filter(r => r.status.toLowerCase() === filter.toLowerCase())

  const statusOptions = ['all', 'REQUESTED', 'AI_TRIAGED', 'VENDOR_REVIEW', 'CONFIRMED', 'RECEIVED', 'DIAGNOSIS', 'REPAIR', 'TESTING', 'READY', 'DELIVERY', 'COMPLETED', 'CANCELLED']

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-rp-primary border-t-transparent"></div>
        </div>
      </PageContainer>
    )
  }

  const stats = [
    { label: 'Active Repairs', value: repairs.filter(r => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status)).length, icon: Box },
    { label: 'Completed', value: repairs.filter(r => r.status === 'COMPLETED').length, icon: CheckCircle2 },
    { label: 'Awaiting Vendor', value: repairs.filter(r => ['REQUESTED', 'AI_TRIAGED', 'VENDOR_REVIEW'].includes(r.status)).length, icon: AlertTriangle },
    { label: 'In Transit', value: repairs.filter(r => ['PICKUP_PENDING', 'IN_TRANSIT', 'DELIVERY'].includes(r.status)).length, icon: Truck },
  ]

  return (
    <div>
      <Header 
        role="customer" 
        title="My Repairs" 
        subtitle={`Track and manage all your repair requests`}
        actions={
          <Link href="/customer/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Repair</Button>
          </Link>
        }
      />
      <PageContainer>
        <Section title="Overview" description="Quick summary of your repair activity">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <DataCard
                key={i}
                title={stat.label}
                value={stat.value}
                icon={<stat.icon className="w-5 h-5" />}
              />
            ))}
          </div>
        </Section>

        <Section title="Your Repairs" description={`Showing ${filteredRepairs.length} of ${repairs.length} repairs`}>
          <div className="flex flex-wrap gap-2 mb-6">
            {statusOptions.map(status => (
              <Button
                key={status}
                variant={filter === status.toLowerCase() ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(status.toLowerCase())}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          {filteredRepairs.length === 0 ? (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-rp-muted mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-rp-text mb-2">No repairs found</h3>
              <p className="text-rp-muted">Create your first repair request to get started</p>
              <Link href="/customer/new" className="mt-4 inline-block">
                <Button><Plus className="w-4 h-4 mr-2" /> New Repair</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRepairs.map(repair => (
                <Card key={repair.id} variant="outlined" onClick={() => setSelectedRepair(repair)} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={repair.status} />
                          <span className="text-sm text-rp-muted">{formatRelativeTime(repair.updated_at)}</span>
                        </div>
                        <p className="font-medium text-rp-text truncate">{repair.reported_problem}</p>
                        {repair.device && (
                          <p className="text-sm text-rp-muted mt-1">
                            {repair.device.category} · {repair.device.brand} {repair.device.model}
                          </p>
                        )}
                        {repair.triage_status && (
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <Badge variant={repair.triage_status === 'LIKELY_SERVICEABLE' ? 'success' : repair.triage_status === 'NEEDS_MANUAL_INSPECTION' ? 'warning' : 'danger'}>
                              {repair.triage_status.replace(/_/g, ' ')}
                            </Badge>
                            {repair.ai_confidence && (
                              <span className="text-rp-muted">Confidence: {Math.round(repair.ai_confidence * 100)}%</span>
                            )}
                            {repair.estimated_minutes && (
                              <span className="text-rp-muted">
                                Est: {formatDuration(repair.estimated_low || repair.estimated_minutes)} - {formatDuration(repair.estimated_high || repair.estimated_minutes)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {repair.assigned_vendor_id && (
                          <div className="text-right text-sm">
                            <p className="font-medium text-rp-text">{repair.vendor_name || 'Vendor'}</p>
                            <p className="text-rp-muted">{repair.vendor_email}</p>
                          </div>
                        )}
                        <MessageCircle className="w-5 h-5 text-rp-muted hover:text-rp-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </PageContainer>
    </div>
  )
}