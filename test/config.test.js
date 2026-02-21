import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/utils/config.js';

describe('DEFAULT_CONFIG', () => {
  it('has required top-level fields', () => {
    assert.ok(DEFAULT_CONFIG.projectName);
    assert.ok(DEFAULT_CONFIG.docsDir);
    assert.ok(DEFAULT_CONFIG.generatedDir);
    assert.ok(DEFAULT_CONFIG.architectureFile);
    assert.ok(DEFAULT_CONFIG.agentConfigFile);
    assert.ok(DEFAULT_CONFIG.scanPaths);
    assert.ok(Array.isArray(DEFAULT_CONFIG.categories));
    assert.ok(DEFAULT_CONFIG.baselines);
  });

  it('has all baseline fields as null or number', () => {
    const b = DEFAULT_CONFIG.baselines;
    assert.equal(typeof b.largeFileThreshold, 'number');
    assert.equal(b.largeFileCount, null);
    assert.equal(b.todoCount, null);
    assert.equal(b.highVulnCount, null);
    assert.equal(b.deadExportCount, null);
  });

  it('categories have required fields', () => {
    for (const cat of DEFAULT_CONFIG.categories) {
      assert.ok(cat.id, `Missing id in category`);
      assert.ok(cat.name, `Missing name in category ${cat.id}`);
      assert.ok(cat.filePattern, `Missing filePattern in category ${cat.id}`);
      assert.ok(cat.patternType, `Missing patternType in category ${cat.id}`);
      assert.ok(cat.docTarget, `Missing docTarget in category ${cat.id}`);
      assert.ok(['exact', 'startsWith', 'regex'].includes(cat.patternType),
        `Invalid patternType in category ${cat.id}`);
    }
  });

  it('additionalAgentConfigs is an empty array by default', () => {
    assert.ok(Array.isArray(DEFAULT_CONFIG.additionalAgentConfigs));
    assert.equal(DEFAULT_CONFIG.additionalAgentConfigs.length, 0);
  });
});
