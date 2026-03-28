# agent-guard: Actual Implementation Reference

> **Purpose of this document**: This is the authoritative source of truth for explaining what agent-guard is, how it works, and what it solves. It is written for consumption by LLMs that need to understand the system in order to work with it, extend it, or explain it.

**Package**: [`@mossrussell/agent-guard`](https://www.npmjs.com/package/@mossrussell/agent-guard)
**Version**: 0.4.2
**Runtime dependencies**: Zero (Node 20+ built-ins only)
**License**: ISC

---

## What agent-guard Is

agent-guard is a self-healing documentation system for AI-assisted development. It keeps documentation synchronized with code automatically, preventing "Context Rot" — the steady degradation of documentation accuracy as code evolves.

The core insight: every codebase has two stories that diverge over time — the code itself (always current) and the documentation explaining it (increasingly stale). agent-guard closes that gap by making documentation updates reflexive, not retroactive.

---

## The Problem It Solves

When documentation drifts from reality:

- Onboarding docs describe APIs that no longer exist
- AI coding assistants hallucinate from stale context files
- Architecture decisions are lost or misrepresented
- Environment variable docs list removed or renamed vars
- New team members build incorrect mental models

agent-guard prevents this through four automated layers of defense that catch drift at every stage of the development workflow.

---

## The Four Layers of Defense

### Layer 1: Standing Instructions

AI agents (Claude Code, Cursor, Windsurf, Copilot) receive real-time context injected into their config files (`.cursorrules`, `CLAUDE.md`, etc.). These instructions tell the agent:

- Which file changes require documentation updates
- Which doc sections map to which code areas
- Which generator commands to run after specific changes

This means AI agents update docs inline while they're already coding — not as a separate step.

### Layer 2: Generated Inventories

Deterministic scripts extract truth directly from code. Three built-in generators:

| Generator | Scans | Outputs |
|-----------|-------|---------|
| API Routes | `route.ts` files in API directory | `docs/_generated/api-routes.md` |
| Prisma Models | `schema.prisma` | `docs/_generated/prisma-models.md` |
| Environment Variables | `.env.example` | `docs/_generated/env-vars.md` |

These are pure functions — same code always produces the same output. No AI involved, no randomness. This makes diffs meaningful and CI comparisons reliable.

### Layer 3: Pre-Commit Hook

A git pre-commit hook detects doc-relevant changes before commits land. It:

1. Gets staged files from git
2. Categorizes them against configured file patterns
3. Checks if documentation was also updated
4. If not — auto-fixes (runs generators + narrative engine) or prints a manual prompt

The hook **never blocks commits** (always exits 0). It's advisory, not gating.

### Layer 4: CI/CD Audits

Two GitHub Actions workflows:

- **Documentation Drift Audit** — Triggers on push to main. Re-runs generators and diffs output against committed files. Creates a GitHub Issue if drift is found.
- **Weekly Refactoring Audit** — Runs on schedule. Checks codebase health metrics (large files, TODOs, vulnerabilities, dead exports) against baselines. Creates an issue only if metrics **worsen**.

---

## Architecture & Directory Structure

```
agent-guard/
├── bin/
│   └── agent-guard.js              # CLI entry point and command router
├── src/
│   ├── index.js                    # Programmatic API exports
│   ├── commands/
│   │   ├── init.js                 # Interactive setup wizard
│   │   ├── detect.js               # Auto-detect health baselines
│   │   ├── gen.js                  # Run all inventory generators
│   │   ├── check.js                # Pre-commit check wrapper
│   │   └── sync.js                 # Full documentation sync
│   ├── generators/
│   │   ├── architecture.js         # Generates ARCHITECTURE.md skeleton
│   │   ├── standing-instructions.js # Generates AI agent config blocks
│   │   └── config-schema.js        # Generates JSON schema for IDE autocomplete
│   └── utils/
│       ├── config.js               # Config loader + DEFAULT_CONFIG
│       └── presets.js              # Framework presets (Next.js, Express, Generic)
├── templates/
│   ├── scripts/                    # Copied into user projects by `init`
│   │   ├── _config-reader.cjs      # Shared config reader (CommonJS)
│   │   ├── _claude-engine.cjs      # API + subprocess engine logic
│   │   ├── _terminal-output.cjs    # Terminal formatting (emoji, colors, tables)
│   │   ├── _audit-log.cjs          # Audit trail (500-entry rotation)
│   │   ├── generate-api-inventory.cjs
│   │   ├── generate-model-inventory.cjs
│   │   ├── generate-env-inventory.cjs
│   │   ├── pre-commit-doc-check.cjs  # Main hook logic
│   │   ├── prepare-commit-msg.cjs    # Appends "(docs auto-updated)" to commits
│   │   └── quality-check.cjs         # Validates generated markdown
│   ├── husky/
│   │   ├── pre-commit               # Git hook shell entry point
│   │   └── prepare-commit-msg       # Commit message hook
│   └── workflows/
│       ├── docs-audit.yml           # Push-triggered drift detection
│       └── refactor-audit.yml       # Weekly health check
├── test/                            # 32+ unit tests (Node built-in test runner)
├── docs/                            # Project's own documentation
│   └── _generated/                  # Output from inventory generators
├── package.json
├── CHANGELOG.md
└── README.md
```

### Key Architectural Decisions

1. **Zero runtime dependencies** — Uses only Node 20+ built-ins (native `fetch`, `fs`, `path`, `child_process`). Keeps installation lightweight and avoids supply-chain risk.
2. **ESM + CommonJS interop** — CLI and source in ESM (`type: "module"`), template scripts in CommonJS (`.cjs`) for compatibility when copied into user projects of any type.
3. **Config-driven categories** — No hardcoded file patterns. Users define categories with pattern matching (exact, startsWith, or regex) in their config file.
4. **Baselines over thresholds** — The refactor audit detects *regressions* from auto-detected baselines, not violations of arbitrary limits. This allows gradual cleanup.
5. **Deterministic generators** — Same input always produces same output. No randomness, no timestamps. Diffs are meaningful.
6. **Configurable commit blocking** — The pre-commit hook defaults to advisory (exit 0, never blocks). When configured as blocking (`autoFix.hook.mode: "blocking"`), it exits 1 when docs are stale, forcing the developer (or AI agent) to update documentation before the commit succeeds.
7. **Graceful degradation** — If no AI engine is available, falls back to printing a manual prompt. In blocking mode, engine failures degrade to advisory (exit 0) with a `.docs-stale` marker, so developers aren't blocked by infrastructure issues.

---

## Configuration System

### Config File

`agent-docs.config.json` — created by `agent-guard init`, lives in the project root.

```json
{
  "projectName": "My Project",
  "techStack": {
    "framework": "Next.js 14 (App Router)",
    "language": "TypeScript"
  },
  "docsDir": "docs/",
  "generatedDir": "docs/_generated/",
  "architectureFile": "docs/ARCHITECTURE.md",
  "agentConfigFile": ".cursorrules",
  "additionalAgentConfigs": ["CLAUDE.md"],
  "autoFix": {
    "generators": true,
    "narrative": {
      "enabled": true,
      "engine": "api",
      "model": "claude-sonnet-4-20250514",
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "maxTokens": 32000,
      "review": false,
      "narrativeTriggers": ["api-routes", "prisma", "env"],
      "additionalNarrativeTargets": ["README.md"]
    }
  },
  "scanPaths": {
    "apiRoutes": "src/app/api/",
    "prismaSchema": "prisma/schema.prisma",
    "envFile": ".env.example"
  },
  "categories": [
    {
      "id": "api-routes",
      "name": "API Routes",
      "emoji": "📡",
      "filePattern": "^src/app/api/.+/route\\.ts$",
      "patternType": "regex",
      "docTarget": "API Routes section",
      "genCommand": "npm run gen:api-routes"
    }
  ],
  "baselines": {
    "largeFileThreshold": 500,
    "largeFileCount": 5,
    "todoCount": 12,
    "highVulnCount": 0,
    "deadExportCount": 3
  },
  "workflows": {
    "docsAudit": { "enabled": true },
    "refactorAudit": { "enabled": true, "schedule": "0 8 * * 0" }
  }
}
```

### Config Loading

`src/utils/config.js` exports `loadConfig(configPath)`:

- Reads the JSON file
- Deep-merges with `DEFAULT_CONFIG` (all fields have sensible defaults)
- Resolves relative paths against the config file's directory
- Attaches `_projectRoot` and `_configPath` metadata to the result

### Framework Presets

`src/utils/presets.js` provides three presets auto-detected during `init`:

| Preset | API Scan Path | Key Categories |
|--------|--------------|----------------|
| Next.js (App Router) | `src/app/api/` | env, api-routes, page-routes |
| Express.js | `src/routes/` | env, routes, middleware |
| Generic Node.js | `src/` | env, source |

---

## The Narrative Engines

When code changes are detected at commit time, agent-guard can automatically update narrative documentation (ARCHITECTURE.md, README.md) using one of two AI engines.

### API Engine (Recommended, v0.4.0+)

- Calls `https://api.anthropic.com/v1/messages` directly using Node's native `fetch`
- Uses API key from `ANTHROPIC_API_KEY` env var or `.env` file
- Embeds file contents directly in the prompt (since it can't read disk)
- Speed: ~12 seconds per commit
- Cost: ~$0.13/commit, ~$0.29/sync, ~$12-15/month with active daily use
- Works on all platforms (no subprocess issues)
- Implementation: `invokeApiEngine()` in `templates/scripts/_claude-engine.cjs`

### Claude Code Subprocess Engine (Fallback)

- Spawns `claude -p -` with shell file redirection (not piping, which fails on Windows)
- Claude Code reads code from disk directly (full filesystem access)
- Speed: ~30-60 seconds (includes CLI startup overhead)
- Cost: Free with an active Claude Code session
- Requires `claude` CLI installed and authenticated
- Implementation: `invokeClaudeCode()` in `templates/scripts/_claude-engine.cjs`

### Prompt Mode (Final Fallback)

- When no engine is available, prints an actionable prompt to the terminal
- User can copy-paste into any AI assistant
- Hook still exits 0 — never blocks

### Response Format

Both engines instruct Claude to return updated files wrapped in XML markers:

```xml
<updated-file path="docs/ARCHITECTURE.md">
...full file content...
</updated-file>
```

The engine parses these markers, writes the files to disk, and stages them with `git add`.

---

## CLI Commands

| Command | Description | Requires Config |
|---------|-------------|:---:|
| `agent-guard init` | Interactive setup wizard. Creates config, copies scripts, sets up hooks and workflows. | No |
| `agent-guard init --yes` | Non-interactive setup using auto-detection. | No |
| `agent-guard init --force` | Re-copies template scripts (for upgrades). Preserves config. | No |
| `agent-guard detect` | Scans codebase and writes health baselines to config. | Yes |
| `agent-guard gen` | Runs all inventory generators. | Yes |
| `agent-guard check` | Runs the pre-commit doc check (same as what the hook runs). | Yes |
| `agent-guard sync` | Full documentation audit — regenerates all inventories and runs narrative engine across entire project. | Yes |

Global flags: `-c, --config <path>`, `-v, --verbose`, `--dry-run` (init only), `-h, --help`.

---

## Pre-Commit Hook Flow

This is the core runtime path. When a developer commits code:

```
git commit
  │
  ▼
.husky/pre-commit
  │
  ▼
scripts/pre-commit-doc-check.cjs
  │
  ├── Load config (deferred — only when main() runs)
  │
  ├── Derive hook config: mode, checkOnly, skipIfClaudeRunning
  │
  ├── Detect rebase/merge → auto-downgrade blocking to advisory
  │
  ├── Get staged files (git diff --cached --name-only)
  │
  ├── Categorize files against config.categories patterns
  │   (exact match | startsWith | regex)
  │
  ├── No doc-relevant files changed?
  │   └── Silent exit(0) — nothing to do
  │
  ├── Doc files already staged alongside code changes?
  │   └── Print ✅, exit(0) — user handled it
  │
  ├── Check-only mode? (--check-only flag or config)
  │   └── Report staleness, exit(blocking ? 1 : 0)
  │
  ├── Claude Code detected? (CLAUDECODE or CLAUDE_CODE_ENTRYPOINT env)
  │   ├── Docs current → exit(0) silently
  │   └── Docs stale → exit(1) with remediation instructions
  │
  ├── Dirty doc targets? (unstaged edits to doc files)
  │   └── Skip auto-fix, fall through to exit logic
  │
  └── Doc-relevant code changed but docs NOT updated:
      │
      ├── autoFix.generators enabled?
      │   └── Run all generators, git add output
      │
      ├── autoFix.narrative.enabled + engine available?
      │   ├── API engine → HTTP call to Anthropic (~12s)
      │   └── Claude Code → subprocess spawn (~30-60s)
      │   Parse <updated-file> markers, write files, git add
      │
      ├── Auto-fix succeeded → exit(0)
      │
      ├── Engine unavailable (API down, timeout, auth)?
      │   └── Degrade to advisory, write .docs-stale marker, exit(0)
      │
      └── Auto-fix failed (fixable reason)?
          ├── Advisory mode → print warning, exit(0)
          └── Blocking mode → print blocked message, exit(1)
```

### Self-Invocation Guard

When Claude Code triggers a commit, the hook detects this via `process.env.CLAUDECODE` or `process.env.CLAUDE_CODE_ENTRYPOINT` and skips ALL AI engines (both Claude Code subprocess and direct API calls). This prevents self-invocation deadlock and avoids surprise API costs. If docs are stale, the hook exits 1 with explicit remediation instructions telling Claude Code to run `npx agent-guard sync` or update docs manually before retrying.

### Engine Failure Degradation

When the AI engine is unavailable (API down, timeout, auth error) and the hook is in blocking mode, it degrades to advisory (exit 0) instead of blocking the commit. A `.agent-guard/.docs-stale` marker file is written so the next session can detect and fix the staleness. This prevents developers from being blocked by infrastructure issues they cannot fix.

### Future: Hook Shim Architecture

The current architecture copies template scripts into user projects. A future release will move to a thin hook shim (`npx agent-guard run-hook`) to eliminate the need for `agent-guard init --force` on upgrades. This is tracked as a planned improvement.

### Review Mode

When `config.autoFix.narrative.review = true`, the hook shows a diff of AI changes and prompts the user to confirm before staging. Reads from `/dev/tty` (or `//./CON` on Windows) for interactive input. Skipped in CI or non-TTY environments.

### Audit Trail

Every hook invocation is logged to `.agent-guard/log.json` with a 500-entry rotation. Each entry records: timestamp, commit hash, mode, engine used, and which files were generated or updated. New mode values include `check-only`, `blocked`, and `skipped-self-invocation`.

---

## Standing Instructions

Generated by `src/generators/standing-instructions.js` and appended to AI agent config files.

The output is a markdown block containing:

- A table mapping file patterns to doc targets and generator commands
- Rules: update docs in the same session, run generators after relevant changes, don't edit `_generated/` manually, don't skip small updates

Example generated table:

```markdown
| If You Changed...                      | Update This              | And Run...              |
|----------------------------------------|--------------------------|-------------------------|
| Files matching `^src/app/api/...`      | API Routes section       | `npm run gen:api-routes`|
| `prisma/schema.prisma`                 | Database Models section  | `npm run gen:models`    |
| `.env.example`                         | Environment Variables    | —                       |
```

Supported agent config files:
- `.cursorrules` / `.cursor/rules` (Cursor)
- `CLAUDE.md` (Claude Code)
- `.windsurfrules` (Windsurf)
- `.github/copilot-instructions.md` (GitHub Copilot)

---

## CI/CD Workflows

### Documentation Drift Audit (`docs-audit.yml`)

- **Trigger**: Push to main on doc-relevant file paths
- **Process**: Installs deps, runs `npm run gen:all`, diffs `docs/_generated/` against HEAD, runs quality check
- **Output**: Creates a GitHub Issue with label `['documentation', 'automated-audit']` if drift is found, including both a quick-fix option and an AI prompt option

### Weekly Refactoring Audit (`refactor-audit.yml`)

- **Trigger**: Weekly cron (default: Sundays 8 AM UTC) + manual dispatch
- **Metrics**: Large file count, TODO/HACK/FIXME count, npm audit high/critical vulns, dead exports (via knip)
- **Comparison**: Reads baselines from `agent-docs.config.json` (set by `agent-guard detect`)
- **Output**: Creates a GitHub Issue only if metrics **worsen** beyond baseline, flagged with "NEW REGRESSION"

---

## How It Gets Installed Into a Project

```bash
npx @mossrussell/agent-guard init
```

This wizard:

1. Detects framework (Next.js, Express, Generic) from `package.json`
2. Detects Prisma usage
3. Detects existing agent config files
4. Creates `agent-docs.config.json`
5. Copies template scripts to `scripts/`
6. Sets up husky hooks (`.husky/pre-commit`, `.husky/prepare-commit-msg`)
7. Copies GitHub Actions workflows to `.github/workflows/`
8. Generates `docs/ARCHITECTURE.md` skeleton
9. Appends standing instructions to agent config files
10. Adds `gen:*` scripts to `package.json`

After setup, the system operates automatically on every commit with no ongoing manual intervention required.

---

## The Value Proposition

| Without agent-guard | With agent-guard |
|---------------------|------------------|
| Docs drift silently from reality | Drift is caught at commit time and in CI |
| AI assistants hallucinate from stale context | Standing instructions keep AI context current |
| Generated inventories require manual re-runs | Inventories auto-regenerate on every commit |
| Architecture docs are written once, then abandoned | Narrative docs are auto-updated by AI on each relevant change |
| New team members build wrong mental models | Documentation always reflects actual code state |
| "We'll update the docs later" (never happens) | Docs update is part of the commit, not a separate task |

---

## Technical Summary for LLMs

If you are an LLM reading this to understand how to work with or within a project that uses agent-guard:

1. **Check for `agent-docs.config.json`** in the project root — this tells you agent-guard is active and shows its configuration.
2. **Read the standing instructions** in your agent config file (`.cursorrules`, `CLAUDE.md`, etc.) — they tell you exactly which code changes need doc updates and what commands to run.
3. **Never edit files in `docs/_generated/`** — these are produced by deterministic generators and will be overwritten.
4. **Do update narrative docs** (`ARCHITECTURE.md`, `README.md`) when you change code that affects documented behavior.
5. **Run the appropriate `gen:*` command** after changing API routes, Prisma models, or environment variables.
6. **The pre-commit hook will catch you** if you forget — but it's better to update docs proactively in the same session.
7. **agent-guard never blocks commits** — it's advisory. But CI will flag drift that slips through.
