import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, listPresets, getPreset } from '../src/utils/presets.js';

describe('Presets', () => {
  it('has nextjs, express, and generic presets', () => {
    assert.ok(PRESETS.nextjs);
    assert.ok(PRESETS.express);
    assert.ok(PRESETS.generic);
  });

  it('listPresets returns all presets', () => {
    const list = listPresets();
    assert.equal(list.length, Object.keys(PRESETS).length);
    for (const item of list) {
      assert.ok(item.key);
      assert.ok(item.label);
    }
  });

  it('getPreset returns correct preset', () => {
    assert.deepEqual(getPreset('nextjs'), PRESETS.nextjs);
    assert.equal(getPreset('nonexistent'), null);
  });

  it('every preset has required fields', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      assert.ok(preset.label, `${key} missing label`);
      assert.ok(preset.techStack, `${key} missing techStack`);
      assert.ok(preset.scanPaths, `${key} missing scanPaths`);
      assert.ok(Array.isArray(preset.categories), `${key} categories not array`);
      assert.ok(Array.isArray(preset.envCategories), `${key} envCategories not array`);
      assert.ok(Array.isArray(preset.workflowTriggerPaths), `${key} workflowTriggerPaths not array`);
    }
  });

  it('every preset category has required fields', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      for (const cat of preset.categories) {
        assert.ok(cat.id, `${key} category missing id`);
        assert.ok(cat.name, `${key} category missing name`);
        assert.ok(cat.filePattern, `${key} category missing filePattern`);
        assert.ok(['exact', 'startsWith', 'regex'].includes(cat.patternType),
          `${key} category ${cat.id} has invalid patternType`);
      }
    }
  });
});
