import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSyncPrompt } from '../src/commands/sync.js';

describe('agent-guard sync', () => {
  const baseConfig = {
    projectName: 'Test Project',
    architectureFile: 'docs/ARCHITECTURE.md',
    techStack: { framework: 'Next.js 14' },
    autoFix: {
      narrative: {
        additionalNarrativeTargets: ['README.md'],
      },
    },
    scanPaths: {
      apiRoutes: 'src/app/api/',
      prismaSchema: 'prisma/schema.prisma',
      envFile: '.env.example',
      sourceDir: 'src/',
    },
    categories: [
      { name: 'API Routes', filePattern: 'src/app/api/' },
      { name: 'Environment Variables', filePattern: '.env.example' },
    ],
  };

  it('includes project name', () => {
    const prompt = buildSyncPrompt(baseConfig);
    assert.ok(prompt.includes('Test Project'));
  });

  it('includes all scan paths', () => {
    const prompt = buildSyncPrompt(baseConfig);
    assert.ok(prompt.includes('src/app/api/'));
    assert.ok(prompt.includes('prisma/schema.prisma'));
    assert.ok(prompt.includes('.env.example'));
  });

  it('includes narrative targets', () => {
    const prompt = buildSyncPrompt(baseConfig);
    assert.ok(prompt.includes('docs/ARCHITECTURE.md'));
    assert.ok(prompt.includes('README.md'));
  });

  it('includes categories', () => {
    const prompt = buildSyncPrompt(baseConfig);
    assert.ok(prompt.includes('API Routes'));
    assert.ok(prompt.includes('Environment Variables'));
  });

  it('includes safety rules', () => {
    const prompt = buildSyncPrompt(baseConfig);
    assert.ok(prompt.includes('Do NOT modify any source code'));
    assert.ok(prompt.includes('Do NOT modify .cursorrules'));
  });

  it('states this is a full sync', () => {
    const prompt = buildSyncPrompt(baseConfig);
    assert.ok(prompt.includes('complete sync'));
  });

  it('uses architectureFile from config, not hardcoded', () => {
    const custom = { ...baseConfig, architectureFile: 'custom/ARCH.md' };
    const prompt = buildSyncPrompt(custom);
    assert.ok(prompt.includes('custom/ARCH.md'));
    assert.ok(!prompt.includes('docs/ARCHITECTURE.md'));
  });
});
