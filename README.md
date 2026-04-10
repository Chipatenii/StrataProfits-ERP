# StrataForge Business Suite

> **v2.0.0** — ERP for Service Businesses

A comprehensive, remote-first business operating system that brings together CRM, project management, task tracking, time logging, finance, HR, and client collaboration in one platform. Built for agencies and service-based teams.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Local Development](#local-development)
  - [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)

---

## Overview

StrataForge Business Suite is designed to bridge the gap between sales, project delivery, and finance for remote-first teams. Instead of juggling multiple tools, everything from client acquisition to final invoice lives in one place.

The platform provides role-based access so each person sees exactly what's relevant to them:

- **Admins** get a full birds-eye view — CRM pipeline, team workload, finance reports, HR, and audit logs.
- **Team members** (developers, designers, marketers, etc.) focus on their assigned tasks, time tracking, SOPs, and daily check-ins.
- **Virtual Assistants** can manage clients, deals, meetings, and send invoice reminders within their permitted scope.
- **Bookkeepers** handle invoices, payments, expenses, and financial reporting.
- **Clients** have a dedicated portal to view their projects, quotes, and invoices.

---

## Features

### CRM & Sales
- **Client Management** — track clients with value tiers (Standard, Premium, High Value) and lifecycle stages (Lead → Active → Dormant → Past)
- **Deals Pipeline** — Kanban-style sales pipeline with stages: New Lead, Qualified, Proposal Sent, Negotiation, Won, Lost
- **Quotes** — create, send, and convert proposals to invoices; supports line items, tax, discounts, and adjustments
- **Meetings** — schedule and track client meetings (In-Person, Zoom, Google Meet, Phone Call) with approval workflows

### Projects & Tasks
- **Projects** — organize work by client with active/completed/archived status
- **Deliverables** — structure projects into phases and billable deliverables (fixed or hourly billing)
- **Tasks** — assign tasks with priority, due dates, estimated hours, and approval workflows
- **Task Templates** — reusable task sets for Dev, Design, and Marketing service types

### Time & Productivity
- **Time Tracking** — clock in/out per task with billable flags and manager approval
- **Daily Check-ins** — async stand-up format (what I did / what I'm doing / blockers) for remote teams
- **Performance Leaderboard** — completed tasks and earnings per team member

### Finance
- **Invoices** — generate professional invoices with line items, tax, discounts, and order numbers; export to PDF
- **Payments** — record payments by cash, bank transfer, mobile money, or card; auto-generate receipts
- **Expenses** — submit and approve team expenses (Transport, Data, Office Space, Meals, Other)
- **Financial Reports** — revenue, expenses, and profit summaries with monthly breakdowns

### HR & People
- **Team Management** — manage profiles, roles, hourly rates, and avatars
- **Time Off Requests** — vacation, sick, personal, and unpaid leave with approval flow
- **Performance Reviews** — structured review cycles with ratings, strengths, goals, and improvement areas
- **Onboarding** — per-role onboarding task checklists with progress tracking

### Collaboration & Knowledge
- **SOPs** — create and manage Standard Operating Procedures with categories, tags, and linked resources
- **File Drive** — company-wide file storage with folder structure (powered by Supabase Storage)
- **Comments** — threaded comments on tasks, projects, deals, and meetings
- **Notifications** — in-app notifications for approvals, assignments, and activity

### Administration
- **Approval Workflows** — configurable approval routing for tasks, time logs, expenses, invoices, quotes, and meetings
- **Activity Audit Log** — full audit trail of all actions across the platform
- **Organization Settings** — company profile, banking details, mobile money configuration
- **Client Portal** — separate authenticated portal for clients to view their projects, quotes, and invoices

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Components | Shadcn/UI (Radix UI primitives) |
| Styling | Tailwind CSS v4 |
| Backend & Auth | Supabase (PostgreSQL, Row-Level Security, Auth) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| PDF Generation | jsPDF |
| Email | Resend |
| Data Fetching | SWR |
| Analytics | Vercel Analytics |

---

## Roles & Permissions

The platform uses a fine-grained, role-based permission system. Each role has a specific set of read/write permissions across all modules.

| Role | Key Access |
|---|---|
| `admin` | Full access to all modules including audit logs and user management |
| `virtual_assistant` | CRM, deals, quotes, meetings, SOPs, files, HR (read) |
| `book_keeper` | Invoices, payments, expenses, financial reports |
| `sales` | Clients, deals, meetings, quotes (read), tasks |
| `marketing` | Clients (read), projects, tasks, files, meetings |
| `developer` | Projects, tasks, time logs, SOPs, files |
| `social_media_manager` | Projects, tasks, time logs, SOPs, files |
| `graphic_designer` | Projects, tasks, time logs, SOPs, files |
| `team_member` | Own tasks, own time logs, files, HR (read) |
| `client` | Own projects, own invoices, own quotes |

All role permissions are defined in [`lib/permissions.ts`](lib/permissions.ts).

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account (for email)

### Environment Variables

Create a `.env.local` file in the root of the project:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Finance defaults (optional)
NEXT_PUBLIC_DEFAULT_TAX_RATE=0
NEXT_PUBLIC_DEFAULT_DISCOUNT_RATE=0
```

### Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Database Setup

All database migration scripts live in the [`scripts/`](scripts/) folder.

**Fresh deployment** — run the consolidated bundle against your Supabase project:

```
scripts/production_bundle.sql
```

**Seeding an admin user:**

```bash
node scripts/seed-admin.js
```

See [`scripts/DEPLOYMENT_GUIDE.md`](scripts/DEPLOYMENT_GUIDE.md) for incremental migration instructions if you are upgrading an existing database.

---

## Project Structure

```
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # REST API route handlers
│   ├── auth/               # Authentication pages (login, signup)
│   ├── client-portal/      # Client-facing portal
│   ├── dashboard/          # Main app dashboard
│   ├── files/              # File drive page
│   ├── projects/           # Project detail pages
│   ├── reports/            # Reports page
│   └── setup/              # Initial organization setup
├── components/             # Shared React components
├── hooks/                  # Custom React hooks
├── lib/                    # Core utilities and configuration
│   ├── config.ts           # App-wide configuration (APP_CONFIG)
│   ├── permissions.ts      # Role-based permission definitions
│   ├── navigation.ts       # Navigation items per role
│   ├── types.ts            # Shared TypeScript types
│   ├── schemas.ts          # Zod validation schemas
│   ├── supabase/           # Supabase client helpers (server, client, admin)
│   └── ...                 # Formatting, PDF, email, and other utilities
├── scripts/                # Database migration SQL files and deployment guide
├── styles/                 # Global CSS
└── middleware.ts           # Auth middleware (route protection)
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

---

&copy; 2026 StrataForge. All rights reserved.
