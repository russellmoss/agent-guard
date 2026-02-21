# agent-guard

**Self-healing documentation for AI-assisted development.**

Stop your architecture docs from rotting. `agent-guard` installs a 4-layer defense system that catches documentation drift at every stage — during AI coding sessions, at commit time, at push time, and on a weekly schedule.

---

## The Problem: Context Rot

When AI coding agents (Claude Code, Cursor, Copilot, etc.) build features, the rate of code change dramatically outpaces documentation updates. Over weeks, your `ARCHITECTURE.md` drifts from reality:

- API routes get added but never documented
- Database models grow but the docs still list the original three
- Environment variables proliferate with no record of what they do
- The AI agent reads stale docs, hallucinates based on false context, and writes code that conflicts with undocumented modules

We call this **Context Rot** — the compounding degradation of the information your AI agent relies on to make decisions. The worse the rot, the worse the agent's output, which creates more undocumented code, which accelerates the rot.

`agent-guard` breaks this cycle.

---

## How It Works: 4 Layers of Defense

### Layer 1: Standing Instructions
Instructions injected into your AI agent's config file (`.cursorrules`, `.cursor/rules`, etc.) with a lookup table: "if you changed X, update Y." The agent updates docs in real-time during the same session it changes code.

*Estimated compliance: ~60-70%. That's why the other layers exist.*

### Layer 2: Generated Inventories
Deterministic Node.js scripts that scan your codebase and produce markdown inventories of API routes, database models, and environment variables. These are facts derived from code — they **cannot drift** because they're regenerated from source.

### Layer 3: Pre-commit Hook
A Husky-powered git hook that fires on every commit. It categorizes your staged files, detects when documentation-relevant code changed without corresponding doc updates, and generates a ready-to-paste AI agent prompt telling it exactly what to fix.

*Advisory only — never blocks commits.*

### Layer 4: CI/CD Audits
Two GitHub Actions workflows:
- **Documentation Drift Audit** — triggers on push to main, regenerates inventories, diffs against committed versions, and creates a GitHub Issue if they're out of sync.
- **Weekly Refactoring Audit** — runs on a cron schedule, checks for large files, TODO accumulation, npm vulnerabilities, and dead exports (via [knip](https://knip.dev)). Creates an issue only when metrics worsen beyond your baselines.

---

## Quick Start

### 1. Initialize

```bash
npx agent-guard init
```

The wizard walks you through:
- Project name
- Whether you use Prisma
- Your AI agent config file path
- Custom file categories to monitor

This creates:
- `agent-docs.config.json` — your configuration (with JSON Schema for IDE autocomplete)
- `docs/ARCHITECTURE.md` — opinionated skeleton with numbered sections
- `scripts/generate-*.cjs` — inventory generator scripts
- `scripts/pre-commit-doc-check.js` — commit hook logic
- `.husky/pre-commit` — git hook
- `.github/workflows/*.yml` — CI/CD audit workflows
- Standing instructions appended to your AI agent config

### 2. Auto-detect Baselines

```bash
npx agent-guard detect
```

Scans your codebase and writes current metrics (large file count, TODOs, vulnerabilities, dead exports) to `agent-docs.config.json`. The weekly audit uses these as baselines — it only creates issues when things get **worse**.

### 3. Generate Initial Inventories

```bash
npm run gen:all
```

Produces `docs/_generated/api-routes.md`, `env-vars.md`, and optionally `prisma-models.md`.

### 4. Commit and Go

```bash
git add -A
git commit -m "feat: add agent-guard self-healing documentation system"
```

The pre-commit hook fires on this very commit, confirming it's wired up correctly.

---

## Configuration Reference

All configuration lives in `agent-docs.config.json`. The file references `agent-docs.schema.json` for IDE autocomplete.

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `projectName` | string | Your project's display name |
| `scanPaths.apiRoutes` | string | Directory containing `route.ts` files (default: `src/app/api/`) |
| `scanPaths.prismaSchema` | string \| null | Path to Prisma schema, or `null` to skip |
| `scanPaths.envFile` | string | Path to env template (default: `.env.example`) |
| `categories` | array | File change categories monitored by the pre-commit hook |
| `baselines` | object | Metrics baselines — `null` values are auto-detected by `agent-guard detect` |

### Custom Categories

Add project-specific monitoring categories to the `categories` array:

```json
{
  "id": "permissions",
  "name": "Permissions / Roles",
  "emoji": "🔐",
  "filePattern": "src/lib/permissions.ts",
  "patternType": "exact",
  "docTarget": "Authentication & Authorization section",
  "genCommand": null
}
```

Pattern types: `exact` (full path match), `startsWith` (prefix), `regex` (JavaScript RegExp).

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `agent-guard init` | Interactive setup wizard |
| `agent-guard detect` | Auto-detect baselines and update config |
| `agent-guard gen` | Run all inventory generators |
| `agent-guard check` | Run pre-commit doc check (called by Husky) |

### Flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be created without writing files |
| `--verbose` | Verbose output |
| `--config <path>` | Custom config file path (default: `agent-docs.config.json`) |

---

## Requirements

- **Node.js** >= 20
- **Git** (for Husky pre-commit hooks)
- **GitHub Actions** (for CI/CD audit workflows)
- **knip** (optional, for dead export detection in weekly audits — `npm i -D knip`)

---

## How This Was Built

This system was extracted from a production Next.js dashboard where AI-generated code caused severe documentation drift — 67% of API routes undocumented, 82% of database models missing from docs, 66% of environment variables untracked.

The 4-layer approach was designed through iterative failure: Layer 1 alone catches ~60-70% of drift. Adding Layer 3 (pre-commit) catches most of the rest at commit time. Layer 4 (CI) serves as a safety net for anything that slips through. Together, they reduce documentation drift to near-zero.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `npm run lint && npm test` in `packages/agent-guard/`
5. Open a PR

### Development Setup

```bash
git clone https://github.com/yourusername/agent-guard
cd agent-guard/packages/agent-guard
npm install
npm link  # makes `agent-guard` available globally for testing
```

### Testing Against a Real Project

```bash
cd /path/to/your/nextjs-project
npm link agent-guard
agent-guard init --dry-run  # verify without writing files
```

---

## License

MIT
