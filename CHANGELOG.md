# Changelog

All notable changes to `@mossrussell/agent-guard` will be documented in this file.

## [0.2.0] — 2026-02-20

### Added
- **Non-interactive init**: `agent-guard init --yes` for scriptable, agent-friendly setup
- **Framework presets**: Next.js, Express.js, and Generic Node.js presets with auto-detection
- **Multi-agent config**: Write standing instructions to multiple AI agent config files simultaneously (CLAUDE.md, .cursorrules, .windsurfrules, .github/copilot-instructions.md)
- **Programmatic API**: `src/index.js` exports core functions for advanced integrations
- **Test suite**: 32 unit tests covering all pure functions
- **ESLint configuration**: Linting for ESM and CJS source files
- **Framework-adaptive architecture skeleton**: Generated ARCHITECTURE.md adapts to chosen framework

### Fixed
- Standing instructions no longer duplicate on `agent-guard init` re-runs
- `--verbose` flag now threads through `agent-guard check` command
- CLI command input sanitized with whitelist (security)
- Workflow config fields (`triggerPaths`, `schedule`, `labels`) now actually applied to generated YAML
- `package-lock.json` corrected from stale `@savvy` scope

### Changed
- Husky moved from `dependencies` to optional `peerDependencies` (zero runtime deps)
- Removed all internal Savvy provenance comments
- Architecture skeleton tech stack is now configurable, not hardcoded to Next.js

### Removed
- Empty `src/templates/` and `templates/docs/` directories

## [0.1.0] — 2026-02-19

### Added
- Initial release: 4-layer self-healing documentation system
- Pre-commit hook with Claude Code prompt generation
- Generated inventories (API routes, Prisma models, env vars)
- GitHub Actions workflows (docs audit, refactor audit)
- Interactive setup wizard
