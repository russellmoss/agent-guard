import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateArchitectureSkeleton } from '../src/generators/architecture.js';

describe('generateArchitectureSkeleton', () => {
  const baseConfig = {
    projectName: 'Test Project',
    architectureFile: 'docs/ARCHITECTURE.md',
    techStack: { framework: 'Express.js', language: 'JavaScript' },
    categories: [],
    scanPaths: { prismaSchema: null },
  };

  it('includes project name in title', () => {
    const result = generateArchitectureSkeleton(baseConfig);
    assert.ok(result.includes('# Test Project'));
  });

  it('uses techStack from config', () => {
    const result = generateArchitectureSkeleton(baseConfig);
    assert.ok(result.includes('Express.js'));
    assert.ok(!result.includes('App Router'));
  });

  it('includes Prisma section when prismaSchema is set', () => {
    const config = { ...baseConfig, scanPaths: { prismaSchema: 'prisma/schema.prisma' } };
    const result = generateArchitectureSkeleton(config);
    assert.ok(result.includes('Database Models'));
  });

  it('excludes Prisma section when prismaSchema is null', () => {
    const result = generateArchitectureSkeleton(baseConfig);
    assert.ok(!result.includes('Database Models'));
  });

  it('always includes API Routes section', () => {
    const result = generateArchitectureSkeleton(baseConfig);
    assert.ok(result.includes('API Routes'));
  });

  it('always includes Deployment & Operations section', () => {
    const result = generateArchitectureSkeleton(baseConfig);
    assert.ok(result.includes('Deployment & Operations'));
  });

  it('includes appendix about agent-guard', () => {
    const result = generateArchitectureSkeleton(baseConfig);
    assert.ok(result.includes('agent-guard'));
  });

  it('adds custom category sections', () => {
    const config = {
      ...baseConfig,
      categories: [{
        id: 'perms',
        name: 'Permissions',
        docTarget: 'Permissions section',
        filePattern: 'src/perms.ts',
        patternType: 'exact',
      }],
    };
    const result = generateArchitectureSkeleton(config);
    assert.ok(result.includes('Permissions'));
  });
});
