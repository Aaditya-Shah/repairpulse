'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/base'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/base'
import { Card, CardContent } from '@/components/ui/layout'
import {
  Cpu, Shield, Bot, Activity, Truck, Users, 
  BarChart, Zap, CheckCircle, ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Triage',
    description: 'Local LM Studio with Nemotron 3 Nano analyzes device issues and provides repair estimates with confidence scores.',
  },
  {
    icon: Activity,
    title: 'Dashboard Illusion Detection',
    description: 'MLOps pipeline tracks overall, common-job, and new-device MAE separately to catch hidden model failures.',
  },
  {
    icon: Shield,
    title: 'Evidence-Grounded AI',
    description: 'MCP layer provides safe, structured access to live data. LLM explains evidence—never invents it.',
  },
  {
    icon: Users,
    title: 'Multi-Role Platform',
    description: 'Dedicated panels for customers, repairists, delivery partners, and admins with proper authorization.',
  },
  {
    icon: Truck,
    title: 'Integrated Logistics',
    description: 'Pickup/delivery partner marketplace with deterministic server-side payout calculations.',
  },
  {
    icon: BarChart,
    title: 'Model Health Monitoring',
    description: 'Frozen benchmarks, drift detection, delayed label handling, and guardrail-protected promotions.',
  },
]

const stats = [
  { value: '3x', label: 'Faster triage with AI' },
  { value: '99.9%', label: 'Uptime guarantee' },
  { value: '50%', label: 'Reduced schedule risk' },
  { value: '100%', label: 'Audit trail coverage' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-rp-bg-soft">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-rp-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rp-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">RP</span>
            </div>
            <span className="font-heading font-bold text-xl text-rp-text">RepairPulse</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-rp-muted hover:text-rp-text transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-rp-muted hover:text-rp-text transition-colors">How it Works</Link>
            <Link href="#architecture" className="text-rp-muted hover:text-rp-text transition-colors">Architecture</Link>
            <Link href="/auth/login" className="text-rp-muted hover:text-rp-text transition-colors">Sign In</Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        <section className="relative overflow-hidden bg-gradient-to-b from-rp-primary/5 via-white to-white">
          <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="info" className="mb-6 inline-flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Overnight AI Hackathon Project
              </Badge>
              <h1 className="font-heading text-5xl lg:text-7xl font-bold text-rp-text tracking-tight mb-6">
                Smarter Predictions.<br />
                <span className="text-rp-primary">Smoother Schedules.</span>
              </h1>
              <p className="text-xl text-rp-muted mb-10 max-w-2xl mx-auto">
                RepairPulse solves the <strong>Dashboard Illusion</strong>—where aggregate model metrics hide 
                catastrophic failures on newer devices. AI-assisted triage, evidence-grounded explanations, 
                and MLOps guardrails make repair operations safer and more predictable.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#architecture">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Architecture
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center animate-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="font-heading text-4xl lg:text-5xl font-bold text-rp-primary mb-2">{stat.value}</div>
                  <div className="text-rp-muted text-lg">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-24 lg:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl font-bold text-rp-text mb-4">Built for Repair Operations</h2>
              <p className="text-rp-muted text-xl max-w-2xl mx-auto">
                Every feature connects AI prediction to actual repair business outcomes.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <Card key={i} variant="outlined" className="animate-in h-full" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-rp-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-rp-primary" />
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-rp-text mb-2">{feature.title}</h3>
                    <p className="text-rp-muted">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24 lg:py-32 px-6 bg-rp-bg">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl font-bold text-rp-text mb-4">How RepairPulse Works</h2>
              <p className="text-rp-muted text-xl max-w-2xl mx-auto">
                From customer intake to model health monitoring—the complete loop.
              </p>
            </div>
            
            <div className="space-y-8">
              {[
                { step: 1, title: 'Customer Creates Repair', desc: 'Select device, describe issue, optional photo upload. AI triage provides instant estimate with confidence.' },
                { step: 2, title: 'Vendor Reviews & Confirms', desc: 'Repairist sees evidence, AI estimate, and confirms or requests physical inspection. No silent AI approvals.' },
                { step: 3, title: 'Physical Inspection', desc: 'Vendor inspects device. If mismatch found, re-quote is generated. Customer approves final price.' },
                { step: 4, title: 'Repair & Tracking', desc: 'Real-time stages: Diagnosis → Parts → Repair → Testing → Ready. Customer gets updates.' },
                { step: 5, title: 'Pickup/Delivery', desc: 'Partner marketplace with deterministic payouts. OTP verification at handoff.' },
                { step: 6, title: 'MLOps Feedback Loop', desc: 'Actual durations update benchmarks. Drift detection alerts. Guardrails prevent unsafe model changes.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-6 animate-in">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rp-primary flex items-center justify-center font-heading text-xl font-bold text-white">
                    {step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold text-rp-text">{title}</h3>
                    <p className="text-rp-muted mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="architecture" className="py-24 lg:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading text-4xl font-bold text-rp-text mb-4">System Architecture</h2>
              <p className="text-rp-muted text-xl max-w-2xl mx-auto">
                Five cooperating planes with clear boundaries and explicit authorization.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card variant="outlined">
                <CardContent className="pt-6">
                  <h3 className="font-heading text-xl font-semibold text-rp-text mb-4 flex items-center gap-2">
                    <Cpu className="w-6 h-6 text-rp-primary" />
                    Experience Plane
                  </h3>
                  <ul className="space-y-2 text-rp-muted">
                    <li>• Customer Panel — Create repairs, track stages, chat support</li>
                    <li>• Vendor Panel — Review evidence, confirm quotes, manage repairs</li>
                    <li>• Partner Panel — Accept pickups, track earnings</li>
                    <li>• Admin Panel — Platform health, MLOps, security, audit</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent className="pt-6">
                  <h3 className="font-heading text-xl font-semibold text-rp-text mb-4 flex items-center gap-2">
                    <Bot className="w-6 h-6 text-rp-primary" />
                    Intelligence Plane
                  </h3>
                  <ul className="space-y-2 text-rp-muted">
                    <li>• LM Studio (Nemotron 3 Nano 4B) — Primary reasoning</li>
                    <li>• AI Gateway — Provider abstraction & fallback</li>
                    <li>• MCP Layer — Safe evidence tools for LLM</li>
                    <li>• Optional: Gemini, Sarvam, OmniRoute, Hugging Face</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent className="pt-6">
                  <h3 className="font-heading text-xl font-semibold text-rp-text mb-4 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-rp-primary" />
                    Reliability Plane
                  </h3>
                  <ul className="space-y-2 text-rp-muted">
                    <li>• Frozen Benchmarks — Same test sample for all models</li>
                    <li>• Slice Metrics — Overall, common-job, new-device MAE</li>
                    <li>• Drift Detection — PSI on device mix, symptoms, complexity</li>
                    <li>• Guardrails — Block promotion if common-job regresses</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent className="pt-6">
                  <h3 className="font-heading text-xl font-semibold text-rp-text mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-rp-primary" />
                    Security & Transaction
                  </h3>
                  <ul className="space-y-2 text-rp-muted">
                    <li>• IDOR protection — Resource ID ≠ authorization</li>
                    <li>• XSS safe — All AI output validated & sanitized</li>
                    <li>• Stripe Test Mode — Server-side amounts, webhook verified</li>
                    <li>• No shell/SQL/HTTP proxy tools in MCP</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <Card variant="outlined">
              <CardContent className="pt-6">
                <h3 className="font-heading text-xl font-semibold text-rp-text mb-6">Data Flow</h3>
                <div className="overflow-x-auto">
                  <pre className="text-sm text-rp-muted font-mono bg-rp-bg-soft p-4 rounded-lg">
{`Customer → Vercel API → Auth/Tenant → Business Logic
                    ↓
         ┌────────────┬────────────┬────────────┐
         ▼            ▼            ▼
      PostgreSQL   Object       Stripe
      (SQLite)     Storage      Test Mode
         │
         ▼
    AI Gateway → MCP → LM Studio
         │
         ▼
   MLOps / Scheduling / Payout`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-24 lg:py-32 px-6 bg-rp-primary text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-4xl font-bold mb-6">Ready to eliminate the Dashboard Illusion?</h2>
            <p className="text-rp-primary/80 text-xl mb-10">
              Deploy RepairPulse in your repair operation. Core features work offline with local LM Studio.
            </p>
            <Link href="/auth/register">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-rp-card border-t border-rp-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rp-primary flex items-center justify-center">
                  <span className="text-white font-bold">RP</span>
                </div>
                <span className="font-heading font-bold text-lg text-rp-text">RepairPulse</span>
              </Link>
              <p className="text-rp-muted text-sm">Smarter Predictions. Smoother Schedules.</p>
            </div>
            <div>
              <h4 className="font-semibold text-rp-text mb-4">Product</h4>
              <ul className="space-y-2 text-rp-muted text-sm">
                <li><Link href="#features" className="hover:text-rp-text">Features</Link></li>
                <li><Link href="#architecture" className="hover:text-rp-text">Architecture</Link></li>
                <li><Link href="/auth/register" className="hover:text-rp-text">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-rp-text mb-4">Company</h4>
              <ul className="space-y-2 text-rp-muted text-sm">
                <li>Team NEXHUNTER</li>
                <li>Overnight AI Hackathon</li>
                <li>MLOps + LLMs + MCP</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-rp-text mb-4">Legal</h4>
              <ul className="space-y-2 text-rp-muted text-sm">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-rp-border text-center text-rp-muted text-sm">
            Built for the NIMBUS | REPAIR PULSE Hackathon by Team NEXHUNTER
          </div>
        </footer>
      </footer>
    </div>
  )
}

import { Badge } from '@/components/ui/base'
import { Card, CardContent } from '@/components/ui/layout'
import { ArrowRight } from 'lucide-react'