import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as agentGuard from '../src/index.js';

describe('Programmatic API (src/index.js)', () => {
  it('exports loadConfig', () => {
    assert.equal(typeof agentGuard.loadConfig, 'function');
  });

  it('exports DEFAULT_CONFIG', () => {
    assert.ok(agentGuard.DEFAULT_CONFIG);
    assert.ok(agentGuard.DEFAULT_CONFIG.projectName);
  });

  it('exports generateArchitectureSkeleton', () => {
    assert.equal(typeof agentGuard.generateArchitectureSkeleton, 'function');
  });

  it('exports generateStandingInstructions', () => {
    assert.equal(typeof agentGuard.generateStandingInstructions, 'function');
  });

  it('exports generateConfigSchema', () => {
    assert.equal(typeof agentGuard.generateConfigSchema, 'function');
  });
});
