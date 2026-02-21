import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { appendAutoFixMessage } = require('../templates/scripts/prepare-commit-msg.cjs');

describe('prepare-commit-msg', () => {
  it('appends suffix to normal commit message', () => {
    const result = appendAutoFixMessage('feat: add new API route');
    assert.ok(result.includes('docs auto-updated by agent-guard'));
    assert.ok(result.startsWith('feat: add new API route'));
  });

  it('prevents double-append', () => {
    const msg = 'fix: something\n\n(docs auto-updated by agent-guard)\n';
    const result = appendAutoFixMessage(msg);
    const count = (result.match(/docs auto-updated/g) || []).length;
    assert.equal(count, 1);
  });

  it('trims trailing whitespace before appending', () => {
    const result = appendAutoFixMessage('message   \n\n');
    assert.ok(result.startsWith('message'));
    assert.ok(!result.includes('   \n'));
  });

  it('handles empty message', () => {
    const result = appendAutoFixMessage('');
    assert.ok(result.includes('docs auto-updated by agent-guard'));
  });
});
