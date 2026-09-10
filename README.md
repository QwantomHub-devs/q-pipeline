# QPipeline — QwantomHub Talent Pipeline Platform

[![CI](https://github.com/QwantomHub-devs/q-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/QwantomHub-devs/q-pipeline/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-336791.svg)](https://orm.drizzle.team/)
[![Paystack](https://img.shields.io/badge/Payouts-Paystack-09A5DB.svg)](https://paystack.com/)
[![License](https://img.shields.io/badge/License-Proprietary-purple.svg)]()

**QPipeline** is the master talent pipeline and evaluation platform for QwantomHub. It orchestrates the full candidate fellow lifecycle—from initial discover-stage signup, multi-module AI-assisted technical screening, rubric calibration, tier placement, cohort bootcamp management, mentor matching, bench farm management, automated payout disbursements, to contract e-signature onboarding.

---

## 🏗️ System Architecture

QPipeline is structured as a **Modular Monolith** built on Next.js 15 (App Router) with strict domain isolation in `/modules`:

```
/app                    — Next.js pages, App Router routes, and server actions
/modules
  /identity             — Fellow Profile & core identity spine (fellow_id)
  /auth                 — Clerk Authentication & RBAC role assertion helpers
  /intake               — Discover-stage applicant intake & funnel tracking
  /assessment           — Baseline Quiz, GitHub Actions coding screen, AI Review (Mod 1), Build Sandbox (Mod 2), Video Queue (Mod 3), Scoring Matrix Engine
  /learning             — Adaptive Learning Platform & course modules
  /bootcamp             — Bootcamp cohort management, tracks, & milestone submissions
  /mentorship           — Mentor matching, session scheduling, & double-blind feedback
  /matching             — Opportunity matching engine, FellowMatch tier validation
  /bench                — Farm-system bench fellow management & deployment tracking
  /placements           — Placement tracking, performance reviews, & SLA milestones
  /wallet               — Internal double-entry ledger & fellow balance reconciliation
  /payout               — Paystack bank resolution & automated payout scheduling
  /contracts            — Contract drafting, Documenso e-signature, & HMAC SHA-256 integrity
  /premium              — Premium global placement eligibility gate (Phase 4 display layer)
  /analytics            — Metabase Direct SQL BI analytics & performance metric views
  /admin                — Thin admin ops dashboard aggregator
  /storage              — Secure media/document storage layer
  /notifications        — SMS, WhatsApp, and Email notification dispatcher
  /audit                — Immutable compliance & security audit logger
/lib                    — Shared utilities (db client, RLS helpers, auth guards)
```

---

## ⚡ Key Features

* **Multi-Stage AI Fluency Assessment**:
  * **Baseline Screen**: Automated Google Quiz & GitHub Actions runner grading.
  * **Module 1 (AI Code Review)**: Planted bug identification, severity grading, and LLM pre-check evaluation.
  * **Module 2 (Timed Build Sandbox)**: 90-minute Codespace challenge, telemetry event logging, trap secret leak detection, and blind trust auto red-flag rules.
  * **Module 3 (Recorded Explanation)**: 3-minute video defense, candidate-specific post-hoc question assignment, and Hard Authenticity Gate verification.
  * **Scoring & Rubric Engine**: Automated composite score calculation and tier placement (`Tier 1 Global`, `Tier 2 Regional`, `Tier 3 Bench`, `Tier 4 Rejected`).
* **Automated Payout Disbursements**: Integrated with Paystack NUBAN bank account verification, transfer recipient creation, double-entry ledger reconciliation, and automated cron/one-shot payout execution.
* **Contracts & E-Signatures**: Admin contract drafting, fellow signature workflows, Documenso webhook ingestion, and SHA-256 HMAC cryptographic audit verification.
* **Strict Security (Rule 5)**: Server-side Zod payload validation, record-level authorization checks (`assertCanAccessFellowRecord`), and Supabase Row Level Security (RLS) policies on every database table.

---

## 🚀 Getting Started

### Prerequisites

* Node.js `20.x` or later
* Yarn `1.22.x` or `npm`
* PostgreSQL database instance (Supabase, Neon, or local Postgres)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/QwantomHub-devs/q-pipeline.git
   cd q-pipeline
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and populate the credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Synchronize Database Schema**:
   ```bash
   yarn db:push
   ```

5. **Start Development Server**:
   ```bash
   yarn dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & CI/CD

QPipeline enforces strict continuous integration using **Vitest** and **GitHub Actions**:

* **Run Unit & Integration Tests**:
  ```bash
  yarn test
  ```
  *(Executes 175 unit/integration test cases across 27 domain test files)*

* **Verify Production Build**:
  ```bash
  yarn build
  ```

* **GitHub Actions Pipeline**:
  Configured in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) to automatically run linting (`yarn lint`), TypeScript checks (`npx tsc --noEmit`), Vitest suite (`yarn test`), and production build compilation (`yarn build`) on every push or pull request to `main`.

---

## 📋 Completed Services Manifest (Services 1–25)

| Service | Domain | Description | Status |
|---|---|---|---|
| **Service 1** | Identity | Fellow Profile & identity spine (`fellow_id`) | ✅ Complete |
| **Service 2** | Auth | Clerk Authentication & RBAC role guards | ✅ Complete |
| **Service 3** | Intake | Discover-stage applicant intake & funnel tracking | ✅ Complete |
| **Service 4** | Notifications | SMS, WhatsApp, & Email notification dispatcher | ✅ Complete |
| **Service 5** | Admin | Admin/ops dashboard aggregator | ✅ Complete |
| **Service 6** | Storage | Document & media storage layer | ✅ Complete |
| **Service 7** | Audit | Immutable security & compliance audit log | ✅ Complete |
| **Service 8** | Learning | Adaptive Learning Platform & course modules | ✅ Complete |
| **Service 9** | Assessment | Fundamentals Coding Screen (Quiz & GitHub Actions) | ✅ Complete |
| **Service 10** | Assessment | AI Code Review Assessment Module 1 | ✅ Complete |
| **Service 11** | Assessment | Timed AI Build Sandbox Module 2 & Telemetry | ✅ Complete |
| **Service 12** | Assessment | Recorded Explanation Intake Module 3 & Video Queue | ✅ Complete |
| **Service 13** | Assessment | Scoring & Rubric Engine & Tier Matrix | ✅ Complete |
| **Service 14** | Bootcamp | Cohort management & milestone submissions | ✅ Complete |
| **Service 15** | Mentorship | Mentor matching & double-blind session feedback | ✅ Complete |
| **Service 16** | Matching | Opportunity Matching Engine & tier checks | ✅ Complete |
| **Service 17** | Bench | Bench farm-system management & deployment | ✅ Complete |
| **Service 18** | Wallet | Internal double-entry ledger & reconciliation | ✅ Complete |
| **Service 19** | Payout | Paystack bank account resolution & disbursements | ✅ Complete |
| **Service 20** | Analytics | Metabase Direct SQL BI analytics architecture | ✅ Complete |
| **Service 21** | Payout | Automated fellow payout scheduling & execution | ✅ Complete |
| **Service 22** | Contracts | Contract drafting, e-signature, & HMAC verification | ✅ Complete |
| **Service 23** | Placements | Placement tracking, reviews, & SLA performance | ✅ Complete |
| **Service 24** | Mentorship | Enhanced automated mentor matching engine | ✅ Complete |
| **Service 25** | Premium Gate | Premium Global Track eligibility gate | ✅ Complete |

---

## 📜 License

Proprietary — All rights reserved by **QwantomHub**.
