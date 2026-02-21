# Advisor Dashboard — Architecture Documentation

> Last updated: 2026-02-21
> Maintained by: agent-guard self-healing documentation system

---

## Section 1: Overview

Advisor Dashboard is a [describe your application here].
### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS / CSS Modules / etc.]
- **ORM**: Prisma
- **Deployment**: [Vercel / AWS / etc.]
### Repository Structure
```
src/
├── app/            # Next.js App Router pages and API routes
├── components/     # Shared React components
├── lib/            # Core business logic and utilities
└── config/         # Configuration constants
```

---

## Section 2: Database Models

> This section documents your Prisma schema models.
> Keep it in sync with `prisma/schema.prisma`.
> Auto-generated inventory: `docs/_generated/prisma-models.md`

### Models

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| _Add your models here_ | | |

---

## Section 3: API Routes

> This section documents your API route structure.
> Auto-generated inventory: `docs/_generated/api-routes.md`

### Route Groups

| Route Pattern | Methods | Purpose |
|---------------|---------|---------|
| _Add your routes here_ | | |

---

## Section 4: Authentication & Authorization

### Authentication Flow
_Describe how users authenticate (NextAuth, custom, OAuth, etc.)_

### Role Hierarchy
_Define your user roles and their permission levels_

| Role | Permissions | Notes |
|------|------------|-------|
| _Add roles here_ | | |

### Page Access Control
_Map which roles can access which pages_

| Page Route | Allowed Roles |
|------------|---------------|
| _Add pages here_ | |

---

## Section 5: Environment Variables

> This section documents your environment configuration.
> Source of truth: `.env.example`
> Auto-generated inventory: `docs/_generated/env-vars.md`

| Variable | Purpose | Required |
|----------|---------|----------|
| _Add your env vars here_ | | |

---

## Section 6: Deployment & Operations

### Deployment Pipeline
_Describe your deployment process_

### Monitoring
_Describe error tracking, logging, alerting_

### Scheduled Jobs
_List any cron jobs, scheduled functions, etc._

---

## Appendix: Documentation Maintenance

This document is maintained by the agent-guard self-healing documentation system.

**Layers:**
1. **Standing Instructions** — AI agent updates docs in real-time during coding sessions
2. **Generated Inventories** — Deterministic scripts produce `docs/_generated/*.md` from code
3. **Pre-commit Hook** — Detects doc-relevant code changes and generates remediation prompts
4. **CI/CD Audits** — GitHub Actions catch drift on push and run weekly health checks

See `agent-docs.config.json` for configuration.
