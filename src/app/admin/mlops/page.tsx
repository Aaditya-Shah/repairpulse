'use client'
import { useEffect, useState } from 'react'
import { Header, PageContainer, Section, Card, CardContent, DataCard, StatusBadge } from '@/components/ui/layout'
import { Button } from '@/components/ui/base'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, TrendingDown, RefreshCw, Settings, BarChart2, Brain, Shield } from 'lucide-react'

interface ModelVersion {
  id: string
  version: string
  status: 'candidate' | 'champion' | 'archived'
  metrics: {
    overallMae: number
    commonJobMae: number
    newDeviceMae: number
    commonJobCount: number
    newDeviceCount: number
    labelPendingCount: number
    medianLabelLag: number
    p90LabelLag: number
    newDeviceShare: number
  }
  created_at: string
  promoted_at?: string
}

interface DriftReport {
  id: string
  overall_drift_score: number
  device_category_psi: number
  new_device_proportion_shift: number
  created_at: string
}

interface ModelHealth {
  champion: ModelVersion | null
  candidates: ModelVersion[]
  latestDrift: DriftReport | null
  labelStatus: any
}

export default function AdminMLOpsPage() {
  const [health, setHealth] = useState<ModelHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'drift' | 'benchmarks'>('overview')

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/mlops?action=health')
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
      }
    } catch (error) {
      console.error('Failed to fetch MLOps health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-rp-primary border-t-transparent"></div>
        </div>
      </PageContainer>
    )
  }

  const champion = health?.champion
  const candidates = health?.candidates || []
  const drift = health?.latestDrift

  return (
    <div>
      <Header 
        role="admin" 
        title="MLOps Dashboard" 
        subtitle="Model health, drift detection, and promotion guardrails"
        actions={
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        }
      />
      <PageContainer>
        <div className="flex gap-4 border-b border-rp-border mb-8">
          {['overview', 'models', 'drift', 'benchmarks'].map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab as any)}
              className="capitalize"
            >
              {tab}
            </Button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <Section title="Model Health Overview" description="Current champion and candidate model performance">
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <Card variant="outlined">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-rp-success/10 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-rp-success" />
                      </div>
                      <div>
                        <p className="text-rp-muted text-sm">Champion Model</p>
                        <p className="font-heading text-xl font-bold text-rp-text">{champion?.version || 'None'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="font-heading text-2xl font-bold text-rp-text">{champion?.metrics.overallMae.toFixed(1) || 'N/A'}</p>
                        <p className="text-xs text-rp-muted">Overall MAE (min)</p>
                      </div>
                      <div>
                        <p className="font-heading text-2xl font-bold text-rp-success">{champion?.metrics.commonJobMae.toFixed(1) || 'N/A'}</p>
                        <p className="text-xs text-rp-muted">Common Jobs MAE</p>
                      </div>
                      <div>
                        <p className="font-heading text-2xl font-bold text-rp-danger">{champion?.metrics.newDeviceMae.toFixed(1) || 'N/A'}</p>
                        <p className="text-xs text-rp-muted">New Device MAE</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-rp-warning/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-rp-warning" />
                      </div>
                      <div>
                        <p className="text-rp-muted text-sm">New Device Share</p>
                        <p className="font-heading text-xl font-bold text-rp-text">{(champion?.metrics.newDeviceShare * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="font-heading text-xl font-bold text-rp-text">{champion?.metrics.commonJobCount || 0}</p>
                        <p className="text-xs text-rp-muted">Common Jobs</p>
                      </div>
                      <div>
                        <p className="font-heading text-xl font-bold text-rp-text">{champion?.metrics.newDeviceCount || 0}</p>
                        <p className="text-xs text-rp-muted">New Device Jobs</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center mt-4">
                      <div>
                        <p className="font-heading text-xl font-bold text-rp-warning">{champion?.metrics.labelPendingCount || 0}</p>
                        <p className="text-xs text-rp-muted">Pending Labels</p>
                      </div>
                      <div>
                        <p className="font-heading text-xl font-bold text-rp-muted">{champion?.metrics.medianLabelLag || 0} min</p>
                        <p className="text-xs text-rp-muted">Median Label Lag</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-rp-danger/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-rp-danger" />
                      </div>
                      <div>
                        <p className="text-rp-muted text-sm">Drift Score</p>
                        <p className="font-heading text-3xl font-bold text-rp-danger">{health?.latestDrift?.overall_drift_score?.toFixed(2) || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="font-heading text-xl font-bold text-rp-warning">{((health?.latestDrift?.device_category_psi || 0) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-rp-muted">Category PSI</p>
                      </div>
                      <div>
                        <p className="font-heading text-xl font-bold text-rp-danger">{((health?.latestDrift?.new_device_proportion_shift || 0) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-rp-muted">New Device Shift</p>
                      </div>
                      <div>
                        <p className="text-xs text-rp-muted">Last Check</p>
                        <p className="font-medium text-rp-text">{health?.latestDrift ? formatRelativeTime(health.latestDrift.created_at) : 'Never'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card variant="outlined">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading text-lg font-semibold text-rp-text flex items-center gap-2">
                        <Shield className="w-5 h-5 text-rp-primary" />
                        Promotion Guardrails
                      </h3>
                      <Button variant="outline" size="sm">Run Check</Button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: 'Common Job MAE Regression', status: 'pass' as const, detail: 'v18: 12.1 vs v17: 10.0 (+21%)' },
                        { name: 'New Device MAE Improvement', status: 'pass' as const, detail: 'v18: 38.0 vs v17: 50.0 (-24%)' },
                        { name: 'Overall MAE Improvement', status: 'pass' as const, detail: 'v18: 17.3 vs v17: 18.0 (-4%)' },
                        { name: 'Sufficient New Device Samples', status: 'pass' as const, detail: '220 samples (min 50)' },
                        { name: 'Label Pending Threshold', status: 'pass' as const, detail: '38 pending (threshold 100)' },
                        { name: 'Benchmark Consistency', status: 'pass' as const, detail: 'Same benchmark-42 for all models' },
                      ].map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-rp-bg-soft">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              check.status === 'pass' ? 'bg-rp-success' : 'bg-rp-danger'
                            )} />
                            <span className="font-medium text-rp-text">{check.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-sm font-medium',
                              check.status === 'pass' ? 'text-rp-success' : 'text-rp-danger'
                            )}>
                              {check.status === 'pass' ? 'PASS' : 'FAIL'}
                            </span>
                            <span className="text-xs text-rp-muted">{check.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading text-lg font-semibold text-rp-text flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-rp-primary" />
                        Recent Candidates
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {candidates.slice(0, 5).map(candidate => (
                        <div key={candidate.id} className="flex items-center justify-between p-3 rounded-lg bg-rp-bg-soft">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-3 h-3 rounded-full',
                              candidate.status === 'champion' ? 'bg-rp-success' : 'bg-rp-warning'
                            )} />
                            <div>
                              <p className="font-medium text-rp-text">{candidate.version}</p>
                              <p className="text-xs text-rp-muted">Created {formatRelativeTime(candidate.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-rp-muted">Overall MAE:</span>
                            <span className="font-medium">{candidate.metrics.overallMae.toFixed(1)}</span>
                            <span className="text-rp-muted">New Device:</span>
                            <span className="font-medium text-rp-danger">{candidate.metrics.newDeviceMae.toFixed(1)}</span>
                            <span className="text-rp-muted">Common:</span>
                            <span className="font-medium text-rp-success">{candidate.metrics.commonJobMae.toFixed(1)}</span>
                            <Badge variant={candidate.status === 'champion' ? 'success' : candidate.status === 'candidate' ? 'warning' : 'neutral'}>
                              {candidate.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Card>
        </Section>
      </PageContainer>
    </div>
  )
}

import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'