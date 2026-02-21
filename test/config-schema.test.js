import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateConfigSchema } from '../src/generators/config-schema.js';
import { DEFAULT_CONFIG } from '../src/utils/config.js';

describe('generateConfigSchema', () => {
  const schema = generateConfigSchema();

  it('is valid JSON Schema draft-07', () => {
    assert.equal(schema.$schema, 'http://json-schema.org/draft-07/schema#');
    assert.equal(schema.type, 'object');
  });

  it('requires projectName and categories', () => {
    assert.ok(schema.required.includes('projectName'));
    assert.ok(schema.required.includes('categories'));
  });

  it('covers all DEFAULT_CONFIG top-level keys', () => {
    const configKeys = Object.keys(DEFAULT_CONFIG).filter(k => k !== '_projectRoot' && k !== '_configPath');
    const schemaKeys = Object.keys(schema.properties);
    for (const key of configKeys) {
      assert.ok(schemaKeys.includes(key), `Schema missing key: ${key}`);
    }
  });

  it('sets additionalProperties to false at root', () => {
    assert.equal(schema.additionalProperties, false);
  });

  it('defines category items with required fields', () => {
    const catSchema = schema.properties.categories.items;
    assert.ok(catSchema.required.includes('id'));
    assert.ok(catSchema.required.includes('name'));
    assert.ok(catSchema.required.includes('filePattern'));
    assert.ok(catSchema.required.includes('patternType'));
    assert.ok(catSchema.required.includes('docTarget'));
  });

  it('autoFix schema has correct structure', () => {
    const af = schema.properties.autoFix;
    assert.ok(af, 'autoFix in schema');
    assert.equal(af.type, 'object');
    assert.ok(af.properties.generators);
    assert.ok(af.properties.narrative);
    assert.ok(af.properties.narrative.properties.narrativeTriggers);
    assert.ok(af.properties.narrative.properties.additionalNarrativeTargets);
  });
});
