/**
 * Config loader — reads and validates agent-docs.config.json
 *
 * This is the single source of truth for all configurable values.
 * Every script, hook, and workflow reads paths, categories, and baselines from here.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/** Default config — used by `init` command and as fallback for missing fields */
export const DEFAULT_CONFIG = {
  $schema: './agent-docs.schema.json',
  projectName: 'My Project',
  techStack: {
    framework: 'Next.js 14 (App Router)',
    language: 'TypeScript',
  },
  docsDir: 'docs/',
  generatedDir: 'docs/_generated/',
  architectureFile: 'docs/ARCHITECTURE.md',
  agentConfigFile: '.cursorrules',
  additionalAgentConfigs: [],  // e.g., ['CLAUDE.md', '.github/copilot-instructions.md']
  autoFix: {
    generators: true,           // Auto-run inventory generators at commit time
    narrative: {
      enabled: true,            // Attempt AI-powered narrative updates
      engine: 'claude-code',    // Engine to use ('claude-code' or 'api')
      review: false,            // Show diff + confirm before staging AI changes
      narrativeTriggers: ['api-routes', 'prisma', 'env'],  // Category IDs that fire narrative updates
      additionalNarrativeTargets: ['README.md'],  // EXTRA files beyond architectureFile
      // New API engine fields (only used when engine === 'api')
      model: 'claude-sonnet-4-20250514',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      maxTokens: 32000,
      timeout: 120000,
    },
  },
  scanPaths: {
    apiRoutes: 'src/app/api/',
    pageRoutes: 'src/app/',
    prismaSchema: null, // null = Prisma not in use, skip model scanning
    envFile: '.env.example',
    sourceDir: 'src/',
  },
  categories: [
    {
      id: 'env',
      name: 'Environment Variables',
      emoji: '🔑',
      filePattern: '.env.example',
      patternType: 'exact',
      docTarget: 'Environment Variables section',
      genCommand: 'npm run gen:env',
    },
    {
      id: 'api-routes',
      name: 'API Routes',
      emoji: '📡',
      filePattern: '^src/app/api/.+/route\\.ts$',
      patternType: 'regex',
      docTarget: 'API Routes section',
      genCommand: 'npm run gen:api-routes',
    },
    {
      id: 'page-routes',
      name: 'Page Routes',
      emoji: '📄',
      filePattern: '^src/app/.+/page\\.tsx$',
      patternType: 'regex',
      docTarget: 'Page Routes section',
      genCommand: null,
    },
  ],
  baselines: {
    largeFileThreshold: 500,
    largeFileCount: null,   // null = not yet detected, auto-detect on first run
    todoCount: null,
    highVulnCount: null,
    deadExportCount: null,
  },
  workflows: {
    docsAudit: {
      enabled: true,
      triggerPaths: [
        'src/app/api/**',
        'src/app/*/page.tsx',
        '.env.example',
      ],
    },
    refactorAudit: {
      enabled: true,
      schedule: '0 8 * * 0',
      labels: ['refactoring', 'automated-audit'],
    },
  },
  integrations: {
    github: {
      issueLabels: {
        docsAudit: ['documentation', 'automated-audit'],
        refactorAudit: ['refactoring', 'automated-audit'],
      },
    },
  },
  envCategories: [
    { prefix: 'NEXTAUTH_', category: 'Auth (NextAuth)' },
    { prefix: 'DATABASE_', category: 'Database' },
    { prefix: 'NEXT_PUBLIC_', category: 'Next.js Public' },
  ],
};

/**
 * Load and validate config from disk.
 * Merges user config with defaults so missing fields are safe.
 */
export function loadConfig(configPath) {
  const absolutePath = resolve(configPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}\nRun "agent-guard init" to create one.`);
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (err) {
    throw new Error(`Invalid JSON in ${absolutePath}: ${err.message}`);
  }

  // Deep merge with defaults — user values override defaults
  const config = deepMerge(structuredClone(DEFAULT_CONFIG), raw);

  // Resolve relative paths against config file location
  const projectRoot = dirname(absolutePath);
  config._projectRoot = projectRoot;
  config._configPath = absolutePath;

  return config;
}

/** Simple deep merge. Arrays are replaced, not concatenated. */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
