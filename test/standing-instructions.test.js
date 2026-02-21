import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateStandingInstructions } from '../src/generators/standing-instructions.js';

describe('generateStandingInstructions', () => {
  const baseConfig = {
    architectureFile: 'docs/ARCHITECTURE.md',
    generatedDir: 'docs/_generated/',
    categories: [
      {
        id: 'env',
        name: 'Environment Variables',
        filePattern: '.env.example',
        patternType: 'exact',
        docTarget: 'Environment Variables section',
        genCommand: 'npm run gen:env',
      },
    ],
  };

  it('includes standing instructions header', () => {
    const result = generateStandingInstructions(baseConfig);
    assert.ok(result.includes('## Documentation Maintenance — Standing Instructions'));
  });

  it('includes category in lookup table', () => {
    const result = generateStandingInstructions(baseConfig);
    assert.ok(result.includes('Environment Variables'));
    assert.ok(result.includes('.env.example'));
  });

  it('includes gen commands', () => {
    const result = generateStandingInstructions(baseConfig);
    assert.ok(result.includes('npm run gen:env'));
    assert.ok(result.includes('npm run gen:all'));
  });

  it('includes What NOT to Do section', () => {
    const result = generateStandingInstructions(baseConfig);
    assert.ok(result.includes('What NOT to Do'));
  });

  it('references architecture file path', () => {
    const result = generateStandingInstructions(baseConfig);
    assert.ok(result.includes('docs/ARCHITECTURE.md'));
  });
});
