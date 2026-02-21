import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { logEntry, readLog, getLogPaths, MAX_ENTRIES } = require('../templates/scripts/_audit-log.cjs');

const TEST_ROOT = join(import.meta.dirname, '.tmp-audit-test');

describe('audit-log', () => {
  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('creates log file if it does not exist', () => {
    logEntry(TEST_ROOT, { mode: 'skip' });
    const { logFile } = getLogPaths(TEST_ROOT);
    assert.ok(existsSync(logFile));
  });

  it('appends multiple entries', () => {
    logEntry(TEST_ROOT, { mode: 'auto-fix', engine: 'claude-code' });
    logEntry(TEST_ROOT, { mode: 'prompt' });
    const { logFile } = getLogPaths(TEST_ROOT);
    const log = JSON.parse(readFileSync(logFile, 'utf8'));
    assert.equal(log.length, 2);
    assert.equal(log[0].mode, 'auto-fix');
    assert.equal(log[1].mode, 'prompt');
  });

  it('trims to MAX_ENTRIES', () => {
    const { logDir } = getLogPaths(TEST_ROOT);
    mkdirSync(logDir, { recursive: true });
    // Write a log that's already at max
    const existing = Array.from({ length: MAX_ENTRIES }, (_, i) => ({
      timestamp: new Date().toISOString(),
      mode: 'skip',
      index: i,
    }));
    const { logFile } = getLogPaths(TEST_ROOT);
    const fs = require('fs');
    fs.writeFileSync(logFile, JSON.stringify(existing), 'utf8');

    logEntry(TEST_ROOT, { mode: 'auto-fix' });
    const log = JSON.parse(readFileSync(logFile, 'utf8'));
    assert.equal(log.length, MAX_ENTRIES);
    assert.equal(log[log.length - 1].mode, 'auto-fix');
  });

  it('handles corrupted JSON gracefully', () => {
    const { logDir, logFile } = getLogPaths(TEST_ROOT);
    mkdirSync(logDir, { recursive: true });
    const fs = require('fs');
    fs.writeFileSync(logFile, '{corrupted json!!!', 'utf8');

    logEntry(TEST_ROOT, { mode: 'prompt' });
    const log = JSON.parse(readFileSync(logFile, 'utf8'));
    assert.equal(log.length, 1);
    assert.equal(log[0].mode, 'prompt');
  });

  it('readLog returns empty array for missing file', () => {
    const result = readLog('/nonexistent/path/log.json');
    assert.deepEqual(result, []);
  });
});
