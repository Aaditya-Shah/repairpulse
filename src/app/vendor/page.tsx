'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header, PageContainer, Section, Card, CardContent, StatusBadge, DataCard, RepairTimeline } from '@/components/ui/layout'
import { Button } from '@/components/ui/base'
import { formatRelativeTime, formatDuration, formatCurrency } from '@/lib/utils'
import { Box, Truck, AlertTriangle, Users, Activity, DollarSign, Plus, Filter, Search, Clock, Wrench, MessageSquare } from 'lucide-react'

interface Repair {
  id: string
  status: string
  reported_problem: string
  normalized_problem?: string
  device?: { category: string; brand: string; model: string }
  estimated_minutes?: number
  estimated_low?: number
  estimated_high?: number
  triage_status?: string
  ai_confidence?: number
  assigned_vendor_id?: string
  customer_name?: string
  customer_email?: string
  updated_at: string
  created_at: string
}

export default function VendorDashboard() {
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

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

  const filteredRepairs = repairs.filter(r => {
    const matchesFilter = filter === 'all' || r.status.toLowerCase() === filter.toLowerCase()
    const matchesSearch = search === '' || 
      r.reported_problem.toLowerCase().includes(search.toLowerCase()) ||
      r.device?.brand.toLowerCase().includes(search.toLowerCase()) ||
      r.device?.model.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const statusOptions = ['all', 'REQUESTED', 'AI_TRIAGED', 'VENDOR_REVIEW', 'CONFIRMED', 'RECEIVED', 'DIAGNOSIS', 'REPAIR', 'TESTING', 'READY', 'DELIVERY', 'COMPLETED']

  const stats = [
    { label: 'Pending Review', value: repairs.filter(r => ['REQUESTED', 'AI_TRIAGED', 'VENDOR_REVIEW'].includes(r.status)).length, icon: AlertTriangle, variant: 'warning' },
    { label: 'Active Repairs', value: repairs.filter(r => ['RECEIVED', 'DIAGNOSIS', 'PARTS_PENDING', 'REPAIR', 'TESTING'].includes(r.status)).length, icon: Wrench, variant: 'info' },
    { label: 'Ready/Delivered', value: repairs.filter(r => ['READY', 'DELIVERY'].includes(r.status)).length, icon: Truck, variant: 'success' },
    { label: 'Completed Today', value: repairs.filter(r => r.status === 'COMPLETED' && new Date(r.updated_at).toDateString() === new Date().toDateString()).length, icon: CheckCircle2, variant: 'default' },
  ]

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-rp-primary border-t-transparent"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <div>
      <Header 
        role="vendor" 
        title="Today's Dashboard" 
        subtitle={`Manage repairs, track progress, and optimize schedules`}
        actions={
          <Link href="/vendor/ai">
            <Button variant="secondary" size="sm"><Activity className="w-4 h-4 mr-2" /> AI Assistant</Button>
          </Link>
        }
      />
      <PageContainer>
        <Section title="Quick Stats" description="Real-time overview of your repair queue">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <DataCard
                key={i}
                title={stat.label}
                value={stat.value}
                icon={<stat.icon className="w-5 h-5" />}
                variant={stat.variant as any}
              />
            ))}
          </div>
        </Section>

        <Section title="Repair Queue" description={`Showing ${filteredRepairs.length} of ${repairs.length} repairs`}>
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <div className="flex flex-wrap gap-2">
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
            <div className="flex-1" />
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rp-muted" />
              <input
                type="text"
                placeholder="Search repairs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-rp-border bg-white text-rp-text focus:outline-none focus:ring-2 focus:ring-rp-primary"
              />
            </div>
          </div>

          {filteredRepairs.length === 0 ? (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-rp-muted mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-rp-text mb-2">No repairs found</h3>
              <p className="text-rp-muted">Adjust filters or search to find repairs</p>
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
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          {repair.triage_status && (
                            <Badge variant={
                              repair.triage_status === 'LIKELY_SERVICEABLE' ? 'success' : 
                              repair.triage_status === 'NEEDS_MANUAL_INSPECTION' ? 'warning' : 'danger'
                            }>
                              {repair.triage_status.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {repair.ai_confidence && (
                            <Badge variant="info">Confidence: {Math.round(repair.ai_confidence * 100)}%</Badge>
                          )}
                          {repair.estimated_minutes && (
                            <Badge variant="neutral">
                              Est: {formatDuration(repair.estimated_low || repair.estimated_minutes)} - {formatDuration(repair.estimated_high || repair.estimated_minutes)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-rp-muted">
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {repair.customer_name || 'Customer'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Updated {formatRelativeTime(repair.updated_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/vendor/repairs/${repair.id}`}>
                          <Button variant="outline" size="sm">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {selectedRepair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-rp-border flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold">Repair #{selectedRepair.id.slice(0, 8)}</h2>
                <Button variant="ghost" onClick={() => setSelectedRepair(null)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedRepair.status} />
                  <span className="text-sm text-rp-muted">{formatRelativeTime(selectedRepair.updated_at)}</span>
                </div>
                <p className="text-lg font-medium">{selectedRepair.reported_problem}</p>
                {selectedRepair.device && (
                  <p className="text-rp-muted">{selectedRepair.device.category} · {selectedRepair.device.brand} {selectedRepair.device.model}</p>
                )}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-rp-muted">AI Confidence</p>
                    <p className="font-semibold">{selectedRepair.ai_confidence ? Math.round(selectedRepair.ai_confidence * 100) + '%' : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-muted">Estimated Duration</p>
                    <p className="font-semibold">{selectedRepair.estimated_minutes ? formatDuration(selectedRepair.estimated_low || selectedRepair.estimated_minutes) + ' - ' + formatDuration(selectedRepair.estimated_high || selectedRepair.estimated_minutes) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-muted">Triage</p>
                    <p className="font-semibold">{selectedRepair.triage_status?.replace(/_/g, ' ') || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedRepair.status === 'VENDOR_REVIEW' && (
                    <>
                      <Button onClick={() => { /* confirm */ setSelectedRepair(null) }}>Confirm Repair</Button>
                      <Button variant="outline" onClick={() => { /* inspection */ setSelectedRepair(null) }}>Request Inspection</Button>
                      <Button variant="danger" onClick={() => { /* reject */ setSelectedRepair(null) }}>Reject</Button>
                    </>
                  )}
                  {selectedRepair.status === 'RECEIVED' && (
                    <Button onClick={() => { /* advance to DIAGNOSIS */ setSelectedRepair(null) }}>Start Diagnosis</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  )
}

import { CheckCircle2 } from 'lucide-react'
import { X } from 'lucide-react'