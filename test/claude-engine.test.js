import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizePrompt, classifyError } = require('../templates/scripts/_claude-engine.cjs');

describe('claude-engine', () => {
  describe('sanitizePrompt', () => {
    it('removes null bytes', () => {
      assert.equal(sanitizePrompt('hello\0world'), 'helloworld');
    });

    it('normalizes CRLF to LF', () => {
      assert.equal(sanitizePrompt('line1\r\nline2'), 'line1\nline2');
    });

    it('preserves normal content', () => {
      const prompt = 'Update docs/ARCHITECTURE.md with the new API routes.';
      assert.equal(sanitizePrompt(prompt), prompt);
    });
  });

  describe('classifyError', () => {
    it('returns auth for authentication errors', () => {
      assert.equal(classifyError('Error: not authenticated'), 'auth');
      assert.equal(classifyError('Please login first'), 'auth');
      assert.equal(classifyError('401 unauthorized'), 'auth');
    });

    it('returns offline for network errors', () => {
      assert.equal(classifyError('Error: ENOTFOUND api.anthropic.com'), 'offline');
      assert.equal(classifyError('network error occurred'), 'offline');
    });

    it('returns unknown for other errors', () => {
      assert.equal(classifyError('something went wrong'), 'unknown');
      assert.equal(classifyError(''), 'unknown');
      assert.equal(classifyError(null), 'unknown');
    });
  });
});
