import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

describe('pre-commit-doc-check exports', () => {
  // Note: require will NOT trigger main() due to the require.main guard
  const hook = require('../templates/scripts/pre-commit-doc-check.cjs');

  it('exports _test object with expected functions', () => {
    assert.ok(hook._test, 'should export _test');
    assert.equal(typeof hook._test.getStagedFiles, 'function');
    assert.equal(typeof hook._test.categorize, 'function');
  });
});

describe('isClaudeCodeRunning', () => {
  const { isClaudeCodeRunning } = require('../templates/scripts/_claude-engine.cjs');

  it('returns false when no Claude env vars set', () => {
    const origClaude = process.env.CLAUDECODE;
    const origEntry = process.env.CLAUDE_CODE_ENTRYPOINT;
    delete process.env.CLAUDECODE;
    delete process.env.CLAUDE_CODE_ENTRYPOINT;

    assert.equal(isClaudeCodeRunning(), false);

    // Restore
    if (origClaude !== undefined) process.env.CLAUDECODE = origClaude;
    if (origEntry !== undefined) process.env.CLAUDE_CODE_ENTRYPOINT = origEntry;
  });

  it('returns true when CLAUDECODE is set', () => {
    const orig = process.env.CLAUDECODE;
    process.env.CLAUDECODE = '1';

    assert.equal(isClaudeCodeRunning(), true);

    if (orig !== undefined) process.env.CLAUDECODE = orig;
    else delete process.env.CLAUDECODE;
  });

  it('returns true when CLAUDE_CODE_ENTRYPOINT is set', () => {
    const origClaude = process.env.CLAUDECODE;
    const origEntry = process.env.CLAUDE_CODE_ENTRYPOINT;
    delete process.env.CLAUDECODE;
    process.env.CLAUDE_CODE_ENTRYPOINT = 'cli';

    assert.equal(isClaudeCodeRunning(), true);

    if (origClaude !== undefined) process.env.CLAUDECODE = origClaude;
    else delete process.env.CLAUDECODE;
    if (origEntry !== undefined) process.env.CLAUDE_CODE_ENTRYPOINT = origEntry;
    else delete process.env.CLAUDE_CODE_ENTRYPOINT;
  });
});

describe('config validation', () => {
  it('unknown hook mode falls back to advisory', () => {
    const config = { autoFix: { hook: { mode: 'BLOCK' } } };
    const rawMode = config.autoFix?.hook?.mode || 'advisory';
    const mode = ['advisory', 'blocking'].includes(rawMode) ? rawMode : 'advisory';
    assert.equal(mode, 'advisory');
  });

  it('checkOnly as string "false" does not enable check-only', () => {
    const config = { autoFix: { hook: { checkOnly: 'false' } } };
    const checkOnly = config.autoFix?.hook?.checkOnly === true;
    assert.equal(checkOnly, false);
  });
});
