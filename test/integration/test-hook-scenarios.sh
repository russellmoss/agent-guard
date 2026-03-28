#!/usr/bin/env bash
# Integration test: verifies pre-commit hook exit codes across all behavior matrix scenarios.
# Do NOT use set -e — we need to capture non-zero exit codes.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
FAILURES=()

AG_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMPDIR_BASE="$(mktemp -d)"
REPO="$TMPDIR_BASE/test-repo"

# Save original env vars so we can restore them later
ORIG_CLAUDECODE="${CLAUDECODE:-}"
ORIG_CLAUDE_CODE_ENTRYPOINT="${CLAUDE_CODE_ENTRYPOINT:-}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
run_hook() {
  # Runs the hook script, captures exit code + stdout + stderr separately.
  # Uses env -u to strip Claude env vars from the child process unless explicitly set.
  local stdout_file="$TMPDIR_BASE/stdout.txt"
  local stderr_file="$TMPDIR_BASE/stderr.txt"
  # Build env command to unset Claude vars unless this scenario wants them
  local env_cmd=""
  if [ -z "${CLAUDECODE:-}" ] && [ -z "${CLAUDE_CODE_ENTRYPOINT:-}" ]; then
    env_cmd="env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT"
  fi
  $env_cmd node scripts/pre-commit-doc-check.cjs "$@" >"$stdout_file" 2>"$stderr_file"
  LAST_EXIT=$?
  LAST_STDOUT="$(cat "$stdout_file")"
  LAST_STDERR="$(cat "$stderr_file")"
}

assert_exit() {
  local expected=$1
  local scenario=$2
  if [ "$LAST_EXIT" -eq "$expected" ]; then
    echo -e "  ${GREEN}PASS${NC} exit code = $expected"
    return 0
  else
    echo -e "  ${RED}FAIL${NC} expected exit $expected, got $LAST_EXIT"
    echo -e "  ${RED}STDERR:${NC} $LAST_STDERR" | head -5
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILURES+=("$scenario: expected exit $expected, got $LAST_EXIT")
    return 1
  fi
}

assert_stderr_contains() {
  local pattern=$1
  local scenario=$2
  if echo "$LAST_STDERR" | grep -qi "$pattern"; then
    echo -e "  ${GREEN}PASS${NC} stderr contains \"$pattern\""
    return 0
  else
    echo -e "  ${RED}FAIL${NC} stderr missing \"$pattern\""
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILURES+=("$scenario: stderr missing \"$pattern\"")
    return 1
  fi
}

assert_stderr_not_contains() {
  local pattern=$1
  local scenario=$2
  if echo "$LAST_STDERR" | grep -qi "$pattern"; then
    echo -e "  ${RED}FAIL${NC} stderr unexpectedly contains \"$pattern\""
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILURES+=("$scenario: stderr unexpectedly contains \"$pattern\"")
    return 1
  else
    echo -e "  ${GREEN}PASS${NC} stderr does not contain \"$pattern\""
    return 0
  fi
}

assert_stdout_contains() {
  local pattern=$1
  local scenario=$2
  if echo "$LAST_STDOUT" | grep -qi "$pattern"; then
    echo -e "  ${GREEN}PASS${NC} stdout contains \"$pattern\""
    return 0
  else
    echo -e "  ${RED}FAIL${NC} stdout missing \"$pattern\""
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILURES+=("$scenario: stdout missing \"$pattern\"")
    return 1
  fi
}

reset_repo() {
  cd "$REPO" || exit 1
  git reset HEAD -- . 2>/dev/null
  git checkout -- . 2>/dev/null
  git clean -fd 2>/dev/null
  # Clear Claude env vars (human scenarios)
  unset CLAUDECODE
  unset CLAUDE_CODE_ENTRYPOINT
}

patch_config_mode() {
  local mode=$1
  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('agent-docs.config.json','utf8'));
    if (!cfg.autoFix) cfg.autoFix = {};
    if (!cfg.autoFix.hook) cfg.autoFix.hook = {};
    cfg.autoFix.hook.mode = '$mode';
    fs.writeFileSync('agent-docs.config.json', JSON.stringify(cfg, null, 2));
  "
}

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}=== agent-guard Integration Tests ===${NC}"
echo "Project root: $AG_ROOT"
echo "Temp repo:    $REPO"
echo ""

# Clear Claude env vars for setup
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT

# Create temp repo and scaffold
mkdir -p "$REPO" && cd "$REPO" || exit 1
git init --initial-branch=main >/dev/null 2>&1
git config user.email "test@test.com"
git config user.name "Test"
# Prevent CRLF issues on Windows (files committed as-is)
git config core.autocrlf false

# Create initial commit so HEAD exists
echo "init" > .gitkeep
git add .gitkeep && git commit -m "init" >/dev/null 2>&1

# Link local agent-guard and scaffold
cd "$AG_ROOT" && npm link >/dev/null 2>&1
cd "$REPO" && npm link @mossrussell/agent-guard >/dev/null 2>&1
npx agent-guard init --yes >/dev/null 2>&1

# Set blocking mode + api engine with no key (so engine calls fail intentionally)
patch_config_mode "blocking"
node -e "
  const fs = require('fs');
  const cfg = JSON.parse(fs.readFileSync('agent-docs.config.json','utf8'));
  cfg.autoFix.narrative = cfg.autoFix.narrative || {};
  cfg.autoFix.narrative.engine = 'api';
  cfg.autoFix.narrative.apiKeyEnv = 'AGENT_GUARD_TEST_NO_KEY';
  fs.writeFileSync('agent-docs.config.json', JSON.stringify(cfg, null, 2));
"

# Commit the scaffolded files so they're not dirty
git add -A && git commit -m "scaffold" >/dev/null 2>&1

echo -e "${YELLOW}--- Scenarios ---${NC}"
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 1: No doc-relevant changes → exit 0
# ---------------------------------------------------------------------------
SCENARIO="Scenario 1: No doc-relevant changes"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
echo "just a note" > notes.txt
git add notes.txt
run_hook
assert_exit 0 "$SCENARIO" && PASS_COUNT=$((PASS_COUNT + 1))
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 2: Doc-relevant code WITH doc updates → exit 0
# ---------------------------------------------------------------------------
SCENARIO="Scenario 2: Doc-relevant code with doc updates"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
mkdir -p src/app/api/test
echo "export async function GET() { return Response.json({}); }" > src/app/api/test/route.ts
echo "<!-- updated -->" >> docs/ARCHITECTURE.md
git add src/app/api/test/route.ts docs/ARCHITECTURE.md
run_hook
assert_exit 0 "$SCENARIO" && PASS_COUNT=$((PASS_COUNT + 1))
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 3: Doc-relevant code, no doc updates, blocking + check-only → exit 1
# Uses --check-only because without an API key, engine failure degrades to
# advisory per D1 (engine unavailable is not the developer's fault).
# Check-only mode cleanly detects staleness without engine dependency.
# ---------------------------------------------------------------------------
SCENARIO="Scenario 3: Stale docs in blocking mode (check-only)"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
mkdir -p src/app/api/users
echo "export async function GET() { return Response.json({}); }" > src/app/api/users/route.ts
git add src/app/api/users/route.ts
run_hook --check-only
S3_PASS=0
assert_exit 1 "$SCENARIO" || S3_PASS=1
assert_stderr_contains "blocked\|stale" "$SCENARIO" || S3_PASS=1
assert_stdout_contains "AGENT_GUARD_STALE" "$SCENARIO" || S3_PASS=1
[ $S3_PASS -eq 0 ] && PASS_COUNT=$((PASS_COUNT + 1))
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 4: Claude Code as committer, docs stale → skip AI + exit 1
# ---------------------------------------------------------------------------
SCENARIO="Scenario 4: Claude Code + stale docs"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
export CLAUDECODE=1
export CLAUDE_CODE_ENTRYPOINT=cli
mkdir -p src/app/api/health
echo "export async function GET() { return Response.json({ ok: true }); }" > src/app/api/health/route.ts
git add src/app/api/health/route.ts
run_hook
S4_PASS=0
assert_exit 1 "$SCENARIO" || S4_PASS=1
assert_stderr_contains "CLAUDE" "$SCENARIO" || S4_PASS=1
[ $S4_PASS -eq 0 ] && PASS_COUNT=$((PASS_COUNT + 1))
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 5: Claude Code as committer, docs current → exit 0
# ---------------------------------------------------------------------------
SCENARIO="Scenario 5: Claude Code + docs current"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
export CLAUDECODE=1
export CLAUDE_CODE_ENTRYPOINT=cli
mkdir -p src/app/api/status
echo "export async function GET() { return Response.json({ up: true }); }" > src/app/api/status/route.ts
echo "<!-- status endpoint added -->" >> docs/ARCHITECTURE.md
git add src/app/api/status/route.ts docs/ARCHITECTURE.md
run_hook
assert_exit 0 "$SCENARIO" && PASS_COUNT=$((PASS_COUNT + 1))
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 6: Advisory mode always exits 0 even when stale
# ---------------------------------------------------------------------------
SCENARIO="Scenario 6: Advisory mode + stale docs"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
patch_config_mode "advisory"
mkdir -p src/app/api/v2
echo "export async function GET() { return Response.json({}); }" > src/app/api/v2/route.ts
git add src/app/api/v2/route.ts
run_hook
assert_exit 0 "$SCENARIO" && PASS_COUNT=$((PASS_COUNT + 1))
patch_config_mode "blocking"
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 7: Check-only skips AI engines (advisory mode → exit 0)
# ---------------------------------------------------------------------------
SCENARIO="Scenario 7: Check-only mode (advisory)"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
patch_config_mode "advisory"
mkdir -p src/app/api/v3
echo "export async function GET() { return Response.json({}); }" > src/app/api/v3/route.ts
git add src/app/api/v3/route.ts
run_hook --check-only
S7_PASS=0
assert_exit 0 "$SCENARIO" || S7_PASS=1
assert_stderr_not_contains "Anthropic API" "$SCENARIO" || S7_PASS=1
assert_stderr_not_contains "Claude Code engine" "$SCENARIO" || S7_PASS=1
[ $S7_PASS -eq 0 ] && PASS_COUNT=$((PASS_COUNT + 1))
patch_config_mode "blocking"
echo ""

# ---------------------------------------------------------------------------
# SCENARIO 8: Rebase detection → auto-downgrade to advisory
# ---------------------------------------------------------------------------
SCENARIO="Scenario 8: Rebase detection"
echo -e "${YELLOW}$SCENARIO${NC}"
reset_repo
mkdir -p .git/rebase-merge
mkdir -p src/app/api/v4
echo "export async function GET() { return Response.json({}); }" > src/app/api/v4/route.ts
git add src/app/api/v4/route.ts
run_hook
assert_exit 0 "$SCENARIO" && PASS_COUNT=$((PASS_COUNT + 1))
rm -rf .git/rebase-merge
echo ""

# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------
echo ""
echo "Results: $PASS_COUNT/8 scenarios passed"
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ All integration tests passed${NC}"
else
  echo -e "${RED}✗ $FAIL_COUNT scenario(s) failed:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}- $f${NC}"
  done
fi

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
# Restore original env
if [ -n "$ORIG_CLAUDECODE" ]; then export CLAUDECODE="$ORIG_CLAUDECODE"; fi
if [ -n "$ORIG_CLAUDE_CODE_ENTRYPOINT" ]; then export CLAUDE_CODE_ENTRYPOINT="$ORIG_CLAUDE_CODE_ENTRYPOINT"; fi

cd "$AG_ROOT" && npm unlink @mossrussell/agent-guard 2>/dev/null
rm -rf "$TMPDIR_BASE"

exit $FAIL_COUNT
