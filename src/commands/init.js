/**
 * `agent-guard init` — Interactive setup wizard
 *
 * Creates:
 * 1. agent-docs.config.json — configuration file
 * 2. docs/ARCHITECTURE.md — opinionated skeleton with numbered sections
 * 3. docs/_generated/.gitkeep — output directory for inventory scripts
 * 4. scripts/generate-api-inventory.cjs — API route scanner
 * 5. scripts/generate-model-inventory.cjs — Prisma model scanner (if Prisma enabled)
 * 6. scripts/generate-env-inventory.cjs — env var scanner
 * 7. scripts/pre-commit-doc-check.js — pre-commit hook logic
 * 8. .husky/pre-commit — git hook entry point
 * 9. .github/workflows/docs-audit.yml — push-triggered doc drift audit
 * 10. .github/workflows/refactor-audit.yml — weekly codebase health audit
 * 11. Standing instructions appended to .cursorrules (or created)
 *
 * Also adds npm scripts to package.json and installs husky.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';
import { DEFAULT_CONFIG } from '../utils/config.js';
import { generateArchitectureSkeleton } from '../generators/architecture.js';
import { generateStandingInstructions } from '../generators/standing-instructions.js';

// Get the package's templates directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

/** Simple mustache-style template replacement for YAML workflows */
function processWorkflowTemplate(templatePath, config) {
  let content = readFileSync(templatePath, 'utf8');

  // Apply docs-audit trigger paths
  if (templatePath.endsWith('docs-audit.yml') && config.workflows?.docsAudit?.triggerPaths) {
    const pathLines = config.workflows.docsAudit.triggerPaths
      .map(p => `      - '${p}'`)
      .join('\n');
    // Replace the default paths block between the "paths:" line and "permissions:"
    content = content.replace(
      /    paths:\n(?:      - '[^']*'\n)*(?:      #[^\n]*\n)*/,
      `    paths:\n${pathLines}\n`
    );
  }

  // Apply refactor-audit schedule
  if (templatePath.endsWith('refactor-audit.yml') && config.workflows?.refactorAudit?.schedule) {
    content = content.replace(
      /cron: '[^']*'/,
      `cron: '${config.workflows.refactorAudit.schedule}'`
    );
  }

  // Apply refactor-audit labels
  if (templatePath.endsWith('refactor-audit.yml') && config.workflows?.refactorAudit?.labels) {
    const labelsStr = config.workflows.refactorAudit.labels.map(l => `'${l}'`).join(', ');
    content = content.replace(
      /labels: \[.*\]\s*$/m,
      `labels: [${labelsStr}]`
    );
  }

  // Apply docs-audit labels
  if (templatePath.endsWith('docs-audit.yml') && config.integrations?.github?.issueLabels?.docsAudit) {
    const labelsStr = config.integrations.github.issueLabels.docsAudit.map(l => `'${l}'`).join(', ');
    content = content.replace(
      /labels: \[.*\]\s*$/m,
      `labels: [${labelsStr}]`
    );
  }

  return content;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

export default async function init({ flags }) {
  const projectRoot = process.cwd();
  const dryRun = flags['dry-run'] || false;

  console.log('\n  agent-guard — Setup Wizard\n');

  // ── 1. Gather project info ───────────────────────────────────────────────

  const projectName = await ask('  Project name: ');
  const usePrisma = (await ask('  Using Prisma ORM? (y/n): ')).toLowerCase().startsWith('y');
  const agentTool = await ask('  AI agent config file (.cursorrules / .cursor/rules / other): ') || '.cursorrules';
  const docsDir = (await ask('  Docs directory (default: docs/): ')) || 'docs/';
  const envFile = (await ask('  Env example file (default: .env.example): ')) || '.env.example';

  // Ask about custom categories
  console.log('\n  Default categories: API Routes, Page Routes, Environment Variables');
  if (usePrisma) console.log('  + Prisma Schema (auto-added)');
  const addCustom = (await ask('  Add custom categories? (y/n): ')).toLowerCase().startsWith('y');

  const customCategories = [];
  if (addCustom) {
    console.log('\n  Enter custom categories (empty id to stop):');
    while (true) {
      const id = await ask('    Category id (e.g., permissions): ');
      if (!id) break;
      const name = await ask('    Display name (e.g., Permissions / Roles): ');
      const filePattern = await ask('    File pattern (e.g., src/lib/permissions.ts): ');
      const patternType = await ask('    Pattern type (exact / startsWith / regex): ') || 'exact';
      const docTarget = await ask('    Doc target section name: ');
      const genCommand = (await ask('    Gen command (or empty for none): ')) || null;
      customCategories.push({
        id,
        name,
        emoji: '📦',
        filePattern,
        patternType,
        docTarget,
        genCommand,
      });
    }
  }

  rl.close();

  // ── 2. Build config ──────────────────────────────────────────────────────

  const config = structuredClone(DEFAULT_CONFIG);
  config.projectName = projectName;
  config.docsDir = docsDir;
  config.generatedDir = join(docsDir, '_generated/');
  config.architectureFile = join(docsDir, 'ARCHITECTURE.md');
  config.agentConfigFile = agentTool;
  config.scanPaths.envFile = envFile;

  if (usePrisma) {
    config.scanPaths.prismaSchema = 'prisma/schema.prisma';
    // Add Prisma category before the default categories
    config.categories.unshift({
      id: 'prisma',
      name: 'Prisma Schema',
      emoji: '🗄️',
      filePattern: 'prisma/schema.prisma',
      patternType: 'exact',
      docTarget: 'Database Models section',
      genCommand: 'npm run gen:models',
    });
    // Add prisma trigger path to docs audit
    config.workflows.docsAudit.triggerPaths.push('prisma/schema.prisma');
  }

  // Add user's custom categories
  for (const cat of customCategories) {
    config.categories.push(cat);
    // Add trigger path for docs audit
    if (cat.patternType === 'exact') {
      config.workflows.docsAudit.triggerPaths.push(cat.filePattern);
    } else if (cat.patternType === 'startsWith') {
      config.workflows.docsAudit.triggerPaths.push(cat.filePattern + '**');
    }
  }

  // Baselines start as null — auto-detected on first `agent-guard detect`
  config.baselines.largeFileCount = null;
  config.baselines.todoCount = null;
  config.baselines.highVulnCount = null;
  config.baselines.deadExportCount = null;

  // Keep $schema reference pointing to the schema file we'll generate
  config.$schema = './agent-docs.schema.json';

  // ── 3. Write files ───────────────────────────────────────────────────────

  const filesToCreate = [];

  // 3a. JSON Schema file (enables IDE autocomplete for the config)
  const schemaPath = resolve(projectRoot, 'agent-docs.schema.json');
  const { generateConfigSchema } = await import('../generators/config-schema.js');
  filesToCreate.push({
    path: schemaPath,
    content: JSON.stringify(generateConfigSchema(), null, 2) + '\n',
    label: 'agent-docs.schema.json',
  });

  // 3b. Config file
  const configPath = resolve(projectRoot, 'agent-docs.config.json');
  filesToCreate.push({
    path: configPath,
    content: JSON.stringify(config, null, 2) + '\n',
    label: 'agent-docs.config.json',
  });

  // 3c. ARCHITECTURE.md skeleton
  const archPath = resolve(projectRoot, config.architectureFile);
  filesToCreate.push({
    path: archPath,
    content: generateArchitectureSkeleton(config),
    label: config.architectureFile,
  });

  // 3d. Generated docs directory
  const genDir = resolve(projectRoot, config.generatedDir);
  const gitkeepPath = join(genDir, '.gitkeep');
  filesToCreate.push({
    path: gitkeepPath,
    content: '',
    label: config.generatedDir + '.gitkeep',
  });

  // 3e. Copy scripts from templates
  const scriptsDir = join(TEMPLATES_DIR, 'scripts');
  const targetScriptsDir = resolve(projectRoot, 'scripts');
  if (existsSync(scriptsDir)) {
    const scriptFiles = readdirSync(scriptsDir).filter(f => f.endsWith('.cjs') || f.endsWith('.js'));
    for (const file of scriptFiles) {
      filesToCreate.push({
        path: join(targetScriptsDir, file),
        copyFrom: join(scriptsDir, file),
        label: `scripts/${file}`,
      });
    }
  }

  // 3f. Copy GitHub workflows from templates (with config substitution)
  const workflowsDir = join(TEMPLATES_DIR, 'workflows');
  const targetWorkflowsDir = resolve(projectRoot, '.github/workflows');
  if (existsSync(workflowsDir)) {
    const workflowFiles = readdirSync(workflowsDir).filter(f => f.endsWith('.yml'));
    for (const file of workflowFiles) {
      // Skip disabled workflows
      if (file === 'docs-audit.yml' && config.workflows?.docsAudit?.enabled === false) continue;
      if (file === 'refactor-audit.yml' && config.workflows?.refactorAudit?.enabled === false) continue;

      filesToCreate.push({
        path: join(targetWorkflowsDir, file),
        content: processWorkflowTemplate(join(workflowsDir, file), config),
        label: `.github/workflows/${file}`,
      });
    }
  }

  // 3g. Copy Husky pre-commit hook
  const huskyTemplateDir = join(TEMPLATES_DIR, 'husky');
  const targetHuskyDir = resolve(projectRoot, '.husky');
  if (existsSync(huskyTemplateDir)) {
    filesToCreate.push({
      path: join(targetHuskyDir, 'pre-commit'),
      copyFrom: join(huskyTemplateDir, 'pre-commit'),
      label: '.husky/pre-commit',
    });
  }

  // 3h. Standing instructions
  const agentConfigPath = resolve(projectRoot, config.agentConfigFile);
  const standingInstructions = generateStandingInstructions(config);

  if (existsSync(agentConfigPath)) {
    const existingContent = readFileSync(agentConfigPath, 'utf8');
    const MARKER_START = '## Documentation Maintenance — Standing Instructions';
    const markerIndex = existingContent.indexOf(MARKER_START);

    if (markerIndex !== -1) {
      // Replace existing standing instructions block
      filesToCreate.push({
        path: agentConfigPath,
        content: existingContent.slice(0, markerIndex).trimEnd() + '\n\n' + standingInstructions + '\n',
        label: `${config.agentConfigFile} (replaced standing instructions)`,
      });
    } else {
      // Append to existing file
      filesToCreate.push({
        path: agentConfigPath,
        content: null,
        append: '\n\n' + standingInstructions,
        label: `${config.agentConfigFile} (appended standing instructions)`,
      });
    }
  } else {
    filesToCreate.push({
      path: agentConfigPath,
      content: standingInstructions + '\n',
      label: config.agentConfigFile,
    });
  }

  // ── 4. Dry run or write ──────────────────────────────────────────────────

  if (dryRun) {
    console.log('\n  Dry run — files that would be created:\n');
    for (const f of filesToCreate) {
      console.log(`    ${f.label}`);
    }
    console.log('\n  No files were written.\n');
    return;
  }

  for (const f of filesToCreate) {
    mkdirSync(dirname(f.path), { recursive: true });
    if (f.append) {
      const existing = existsSync(f.path) ? readFileSync(f.path, 'utf8') : '';
      writeFileSync(f.path, existing + f.append, 'utf8');
    } else if (f.copyFrom) {
      // Copy from template
      if (existsSync(f.path)) {
        console.log(`  Skipped (already exists): ${f.label}`);
        continue;
      }
      copyFileSync(f.copyFrom, f.path);
    } else {
      // Don't overwrite existing files unless it's the config
      if (existsSync(f.path) && f.label !== 'agent-docs.config.json') {
        console.log(`  Skipped (already exists): ${f.label}`);
        continue;
      }
      writeFileSync(f.path, f.content, 'utf8');
    }
    console.log(`  Created: ${f.label}`);
  }

  // ── 5. Update package.json — add npm scripts ────────────────────────────

  const pkgPath = resolve(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const scripts = pkg.scripts || {};

    const newScripts = {
      'gen:api-routes': 'node scripts/generate-api-inventory.cjs',
      'gen:env': 'node scripts/generate-env-inventory.cjs',
      'gen:all': 'npm run gen:api-routes && npm run gen:env',
      'prepare': 'husky',
    };

    if (usePrisma) {
      newScripts['gen:models'] = 'node scripts/generate-model-inventory.cjs';
      newScripts['gen:all'] = 'npm run gen:api-routes && npm run gen:models && npm run gen:env';
    }

    let added = 0;
    for (const [key, val] of Object.entries(newScripts)) {
      if (!scripts[key]) {
        scripts[key] = val;
        added++;
      }
    }
    pkg.scripts = scripts;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`  Updated package.json: ${added} scripts added`);
  }

  // ── 6. Install Husky ────────────────────────────────────────────────────

  console.log('\n  Installing husky...');
  try {
    execSync('npx husky init', { cwd: projectRoot, stdio: 'pipe' });
    console.log('  Husky initialized');
  } catch {
    console.log('  Husky init failed — you may need to run "npx husky init" manually');
  }

  // ── 7. Summary ──────────────────────────────────────────────────────────

  console.log(`
  agent-guard initialized!

  Next steps:
  1. Review agent-docs.config.json and adjust paths/categories
  2. Fill in the ARCHITECTURE.md skeleton with your project details
  3. Run "agent-guard detect" to auto-detect baselines
  4. Run "npm run gen:all" to generate initial inventories
  5. Commit everything and you're live!
  `);
}
