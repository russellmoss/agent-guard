/**
 * Framework presets — sensible default configurations for common frameworks.
 *
 * Each preset provides categories, scan paths, env categories,
 * and architecture skeleton hints tailored to the framework.
 */

export const PRESETS = {
  nextjs: {
    label: 'Next.js (App Router)',
    techStack: {
      framework: 'Next.js 14 (App Router)',
      language: 'TypeScript',
    },
    scanPaths: {
      apiRoutes: 'src/app/api/',
      pageRoutes: 'src/app/',
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
    envCategories: [
      { prefix: 'NEXTAUTH_', category: 'Auth (NextAuth)' },
      { prefix: 'DATABASE_', category: 'Database' },
      { prefix: 'NEXT_PUBLIC_', category: 'Next.js Public' },
    ],
    workflowTriggerPaths: [
      'src/app/api/**',
      'src/app/*/page.tsx',
      '.env.example',
    ],
  },

  express: {
    label: 'Express.js',
    techStack: {
      framework: 'Express.js',
      language: 'JavaScript/TypeScript',
    },
    scanPaths: {
      apiRoutes: 'src/routes/',
      pageRoutes: null,
      sourceDir: 'src/',
    },
    categories: [
      {
        id: 'env',
        name: 'Environment Variables',
        emoji: '🔑',
        filePattern: '.env',
        patternType: 'exact',
        docTarget: 'Environment Variables section',
        genCommand: 'npm run gen:env',
      },
      {
        id: 'routes',
        name: 'Route Files',
        emoji: '📡',
        filePattern: 'src/routes/',
        patternType: 'startsWith',
        docTarget: 'API Routes section',
        genCommand: null,
      },
      {
        id: 'middleware',
        name: 'Middleware',
        emoji: '🔧',
        filePattern: 'src/middleware/',
        patternType: 'startsWith',
        docTarget: 'Middleware section',
        genCommand: null,
      },
    ],
    envCategories: [
      { prefix: 'DATABASE_', category: 'Database' },
      { prefix: 'JWT_', category: 'Authentication' },
      { prefix: 'REDIS_', category: 'Cache' },
    ],
    workflowTriggerPaths: [
      'src/routes/**',
      'src/middleware/**',
      '.env',
    ],
  },

  generic: {
    label: 'Generic Node.js',
    techStack: {
      framework: '[Your framework]',
      language: 'JavaScript/TypeScript',
    },
    scanPaths: {
      apiRoutes: 'src/',
      pageRoutes: null,
      sourceDir: 'src/',
    },
    categories: [
      {
        id: 'env',
        name: 'Environment Variables',
        emoji: '🔑',
        filePattern: '.env',
        patternType: 'exact',
        docTarget: 'Environment Variables section',
        genCommand: 'npm run gen:env',
      },
      {
        id: 'source',
        name: 'Source Files',
        emoji: '📦',
        filePattern: 'src/',
        patternType: 'startsWith',
        docTarget: 'Architecture section',
        genCommand: null,
      },
    ],
    envCategories: [
      { prefix: 'DATABASE_', category: 'Database' },
    ],
    workflowTriggerPaths: [
      'src/**',
      '.env',
    ],
  },
};

/** Return the preset keys as a list */
export function listPresets() {
  return Object.entries(PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
  }));
}

/** Get a preset by key, returns null if not found */
export function getPreset(key) {
  return PRESETS[key] || null;
}
