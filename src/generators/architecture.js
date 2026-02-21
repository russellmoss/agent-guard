/**
 * Generates an opinionated ARCHITECTURE.md skeleton.
 *
 * The section numbering and titles are designed to align with the pre-commit
 * hook's category definitions. When a user defines categories in their config,
 * each category's `docTarget` should reference one of these section titles.
 */

export function generateArchitectureSkeleton(config) {
  const projectName = config.projectName || 'My Project';
  const now = new Date().toISOString().slice(0, 10);
  const usePrisma = config.scanPaths?.prismaSchema !== null;

  // Build section list dynamically from config categories + fixed sections
  const sections = [];
  let sectionNum = 1;

  // Section 1 is always the overview
  sections.push({
    num: sectionNum++,
    title: 'Overview',
    content: [
      `${projectName} is a [describe your application here].`,
      '',
      '### Tech Stack',
      '- **Framework**: Next.js 14 (App Router)',
      '- **Language**: TypeScript',
      '- **Styling**: [Tailwind CSS / CSS Modules / etc.]',
      usePrisma ? '- **ORM**: Prisma' : '',
      '- **Deployment**: [Vercel / AWS / etc.]',
      '',
      '### Repository Structure',
      '```',
      'src/',
      '├── app/            # Next.js App Router pages and API routes',
      '├── components/     # Shared React components',
      '├── lib/            # Core business logic and utilities',
      '└── config/         # Configuration constants',
      '```',
    ].filter(Boolean),
  });

  // Section 2: Database Models (only if Prisma)
  if (usePrisma) {
    sections.push({
      num: sectionNum++,
      title: 'Database Models',
      content: [
        '> This section documents your Prisma schema models.',
        '> Keep it in sync with `prisma/schema.prisma`.',
        '> Auto-generated inventory: `docs/_generated/prisma-models.md`',
        '',
        '### Models',
        '',
        '| Model | Purpose | Key Relations |',
        '|-------|---------|---------------|',
        '| _Add your models here_ | | |',
      ],
    });
  }

  // Section: API Routes (always included)
  sections.push({
    num: sectionNum++,
    title: 'API Routes',
    content: [
      '> This section documents your API route structure.',
      '> Auto-generated inventory: `docs/_generated/api-routes.md`',
      '',
      '### Route Groups',
      '',
      '| Route Pattern | Methods | Purpose |',
      '|---------------|---------|---------|',
      '| _Add your routes here_ | | |',
    ],
  });

  // Section: Authentication & Authorization
  sections.push({
    num: sectionNum++,
    title: 'Authentication & Authorization',
    content: [
      '### Authentication Flow',
      '_Describe how users authenticate (NextAuth, custom, OAuth, etc.)_',
      '',
      '### Role Hierarchy',
      '_Define your user roles and their permission levels_',
      '',
      '| Role | Permissions | Notes |',
      '|------|------------|-------|',
      '| _Add roles here_ | | |',
      '',
      '### Page Access Control',
      '_Map which roles can access which pages_',
      '',
      '| Page Route | Allowed Roles |',
      '|------------|---------------|',
      '| _Add pages here_ | |',
    ],
  });

  // Section: Environment Variables (always included)
  sections.push({
    num: sectionNum++,
    title: 'Environment Variables',
    content: [
      '> This section documents your environment configuration.',
      `> Source of truth: \`${config.scanPaths?.envFile || '.env.example'}\``,
      '> Auto-generated inventory: `docs/_generated/env-vars.md`',
      '',
      '| Variable | Purpose | Required |',
      '|----------|---------|----------|',
      '| _Add your env vars here_ | | |',
    ],
  });

  // Add sections for any custom categories that have unique docTargets
  const coveredTargets = new Set([
    'Database Models section',
    'API Routes section',
    'Environment Variables section',
    'Page Routes section',   // covered by Auth section's Page Access Control
    'Authentication section', // covered above
  ]);

  for (const cat of config.categories || []) {
    const target = cat.docTarget || '';
    // Check if this category's docTarget is already covered
    const isCovered = [...coveredTargets].some(
      (t) => target.toLowerCase().includes(t.toLowerCase().replace(' section', ''))
    );
    if (!isCovered && target) {
      sections.push({
        num: sectionNum++,
        title: target.replace(/ section$/i, ''),
        content: [
          `> This section covers: ${cat.name}`,
          `> Monitored file pattern: \`${cat.filePattern}\``,
          '',
          '_Fill in details about this part of your system._',
        ],
      });
      coveredTargets.add(target);
    }
  }

  // Deployment & Operations (always last numbered section)
  sections.push({
    num: sectionNum++,
    title: 'Deployment & Operations',
    content: [
      '### Deployment Pipeline',
      '_Describe your deployment process_',
      '',
      '### Monitoring',
      '_Describe error tracking, logging, alerting_',
      '',
      '### Scheduled Jobs',
      '_List any cron jobs, scheduled functions, etc._',
    ],
  });

  // Build the final markdown
  const lines = [
    `# ${projectName} — Architecture Documentation`,
    '',
    `> Last updated: ${now}`,
    `> Maintained by: agent-guard self-healing documentation system`,
    '',
    '---',
    '',
  ];

  for (const section of sections) {
    lines.push(`## Section ${section.num}: ${section.title}`);
    lines.push('');
    lines.push(...section.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Appendix: Documentation System
  lines.push('## Appendix: Documentation Maintenance');
  lines.push('');
  lines.push('This document is maintained by the agent-guard self-healing documentation system.');
  lines.push('');
  lines.push('**Layers:**');
  lines.push('1. **Standing Instructions** — AI agent updates docs in real-time during coding sessions');
  lines.push('2. **Generated Inventories** — Deterministic scripts produce `docs/_generated/*.md` from code');
  lines.push('3. **Pre-commit Hook** — Detects doc-relevant code changes and generates remediation prompts');
  lines.push('4. **CI/CD Audits** — GitHub Actions catch drift on push and run weekly health checks');
  lines.push('');
  lines.push(`See \`agent-docs.config.json\` for configuration.`);
  lines.push('');

  return lines.join('\n');
}
