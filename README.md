# RepairPulse

**Smarter Predictions. Smoother Schedules.**

Team NEXHUNTER — Aashish Sah · Ujwal Jha · Aaditya Shah

RepairPulse is an AI-assisted repair platform that solves the **Dashboard Illusion** — where aggregate model metrics hide catastrophic failures on newer devices. It connects customers, repairists, delivery partners, and administrators in one platform with proper authorization, MLOps guardrails, and evidence-grounded AI.

## Architecture Overview

```
                         REPAIRPULSE
                              │
             ┌────────────────┼────────────────┐
             │                │                │
        CUSTOMER          REPAIRIST/VENDOR   DELIVERY PARTNER
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                    ┌───────────────────┐
                    │   VERCEL / WEB    │
                    │ Next.js + React   │
                    │ API Routes + Auth │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     SQLite (local)    Object Storage      Stripe Test
     users/jobs/         device photos/      payments
     quotes/status       evidence
          │
          ├───────────────────┐
          ▼                   ▼
     MLOps / Monitoring    AI Gateway
     model versions        │
     drift + benchmark      ▼
     scheduling risk    ┌───────────────┐
                        │   MCP LAYER   │
                        │ safe tools &  │
                        │ live evidence │
                        └───────┬───────┘
                                │
                                ▼
                        ┌───────────────┐
                        │   LM Studio   │
                        │ Nemotron 3    │
                        │ Nano 4B       │
                        └───────────────┘
```

## Key Features

### Core Problem Solved: Dashboard Illusion
- **Overall MAE** might look healthy (18 min) while **New Device MAE** is critical (50 min)
- RepairPulse tracks slice metrics separately: Overall, Common Jobs, New Devices
- Frozen benchmarks ensure fair model comparisons
- Guardrails block promotion if common-job performance regresses

### Multi-Role Platform
| Role | Capabilities |
|------|-------------|
| **Customer** | Create repairs, upload photos, AI estimates, track stages, pay, chat support |
| **Repairist/Vendor** | Review evidence, AI triage, confirm/request inspection/reject, manage repairs |
| **Delivery Partner** | Accept pickups, OTP verification, track earnings |
| **Admin** | MLOps dashboard, drift detection, model promotion, audit logs |

### AI & MCP Integration
- **LM Studio** with Nemotron 3 Nano 4B as primary local LLM
- **MCP Layer** provides safe, read-only tools: `get_repair_status`, `get_drift_report`, `compare_models`, `get_schedule_risk`
- AI explains evidence — never invents it
- Provider abstraction with fallback (Gemini)

### MLOps Guardrails
- Frozen benchmarks: same test sample for all models
- Slice metrics: Overall MAE, Common Job MAE, New Device MAE
- Delayed labels: unknown stays unknown, never filled with zero
- Cancelled visits excluded from duration scoring
- Promotion blocked if common-job MAE regresses >5%

### Security by Design
- **IDOR protection**: Resource ID ≠ authorization; tenant + ownership checked
- **XSS safe**: All AI output validated & sanitized
- **No shell/SQL/HTTP proxy tools** in MCP
- **Stripe Test Mode**: Server-side amounts, webhook verified
- **Multi-tenant**: Row-level tenant isolation

## Quick Start

### Prerequisites
- Node.js 18+
- LM Studio running locally with Nemotron 3 Nano 4B
- Port 1234 for LM Studio API

### Installation

```bash
cd E:\HACKATHONF\repairpulse

# Install dependencies
npm install

# Initialize database
npm run db:init

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables (Optional)
Create `.env.local`:
```env
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_DEFAULT_MODEL=nvidia/nemotron-3-nano-4b
JWT_SECRET=your-secret-key-min-32-chars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Customer | customer@demo.com | demo123 |
| Vendor | vendor@demo.com | demo123 |
| Partner | partner@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

## Project Structure

```
repairpulse/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (auth, repairs, quotes, pickup, mlops, mcp)
│   │   ├── customer/      # Customer dashboard pages
│   │   ├── vendor/        # Vendor dashboard pages
│   │   ├── partner/       # Partner dashboard pages
│   │   ├── admin/         # Admin dashboard pages
│   │   └── auth/          # Auth pages
│   ├── components/
│   │   └── ui/            # Reusable UI components
│   ├── lib/
│   │   ├── database.ts    # SQLite database layer
│   │   ├── auth.ts        # JWT auth + NextAuth
│   │   ├── ai-gateway.ts  # LM Studio + MCP integration
│   │   ├── pricing.ts     # Pricing engine & payout calc
│   │   ├── mlops.ts       # Drift detection, model eval
│   │   └── utils.ts       # Shared utilities
│   └── types/
│       └── index.ts       # TypeScript types
├── scripts/
│   ├── init-db.ts         # Database initialization
│   └── seed.ts            # Demo data seeding
└── data/                  # SQLite database files
```

## Core Flows

### 1. Customer Creates Repair
```
Select Device → Describe Problem → Optional Photo → AI Triage → Estimate Range → Vendor Review
```

### 2. Vendor Confirms Repair
```
Review Evidence → AI Recommendation → Physical Inspection → Confirm / Inspect / Reject
```

### 3. MLOps Feedback Loop
```
Actual Duration → Frozen Benchmark → Slice Metrics → Drift Detection → Guardrails → Promotion Decision
```

### 3. Delivery & Payout
```
Partner Accepts → OTP Verify → Pickup → Transit → Deliver → Server-side Payout Calculation
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | - | User login |
| `/api/auth/register` | POST | - | User registration |
| `/api/auth/me` | GET | ✓ | Current session |
| `/api/repairs` | GET/POST | ✓ | List/create repairs |
| `/api/repairs/[id]` | GET/PATCH | ✓ | Get/update repair |
| `/api/quotes` | GET/POST | ✓ | List/create quotes |
| `/api/quotes/[id]` | PATCH | ✓ | Update quote |
| `/api/pickup` | GET/POST | ✓ | List/create pickups |
| `/api/mlops` | GET/POST | Admin | MLOps operations |
| `/api/mcp` | POST | ✓ | MCP tool calls |

## MCP Tools (Read-Only)

| Tool | Description |
|------|-------------|
| `get_repair_request` | Get repair details |
| `get_device_evidence` | Get photos/evidence |
| `get_repair_status` | Get current status |
| `get_drift_report` | Latest drift metrics |
| `compare_models` | Champion vs candidate |
| `get_schedule_risk` | Schedule cascade risk |
| `get_model_health` | Champion + candidates |

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Local Production Build
```bash
npm run build
npm start
```

## License

MIT License — Built for NIMBUS | REPAIR PULSE Hackathon by Team NEXHUNTER