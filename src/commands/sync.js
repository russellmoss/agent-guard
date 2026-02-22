/**
 * `agent-guard sync` — One-time full documentation synchronization.
 *
 * Runs all generators, then invokes Claude Code for a full narrative
 * audit of ARCHITECTURE.md and README.md based on current codebase state.
 */

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { loadConfig } from '../utils/config.js';
import gen from './gen.js';

const require = createRequire(import.meta.url);

/**
 * Build a comprehensive prompt for full-project sync.
 * Exported for testing.
 */
export function buildSyncPrompt(config) {
  const archFile = config.architectureFile || 'docs/ARCHITECTURE.md';
  const targets = [
    archFile,
    ...(config.autoFix?.narrative?.additionalNarrativeTargets || ['README.md']),
  ];

  const lines = [
    'Perform a FULL documentation audit of this project.',
    'This is a complete sync, not an incremental update.',
    '',
    `Project: ${config.projectName}`,
    `Framework: ${config.techStack?.framework || 'unknown'}`,
    '',
    'Scan paths:',
  ];

  if (config.scanPaths?.apiRoutes) lines.push(`  - API routes: ${config.scanPaths.apiRoutes}`);
  if (config.scanPaths?.pageRoutes) lines.push(`  - Page routes: ${config.scanPaths.pageRoutes}`);
  if (config.scanPaths?.prismaSchema) lines.push(`  - Prisma schema: ${config.scanPaths.prismaSchema}`);
  if (config.scanPaths?.envFile) lines.push(`  - Env file: ${config.scanPaths.envFile}`);
  if (config.scanPaths?.sourceDir) lines.push(`  - Source dir: ${config.scanPaths.sourceDir}`);

  lines.push('');
  lines.push(`Files to update: ${targets.join(', ')}`);
  lines.push('');
  lines.push('Categories monitored:');
  for (const cat of config.categories || []) {
    lines.push(`  - ${cat.name} (${cat.filePattern})`);
  }

  lines.push('');
  lines.push('RULES:');
  lines.push('- Read ALL source files and generated inventories before updating docs');
  lines.push(`- Match the existing format and section structure in ${archFile}`);
  lines.push('- Do NOT modify any source code files');
  lines.push('- Do NOT modify .cursorrules, CLAUDE.md, or any agent config files');
  lines.push(`- Only update these files: ${targets.join(', ')}`);

  return lines.join('\n');
}

export default async function sync({ configPath, flags }) {
  const config = loadConfig(configPath);
  const verbose = flags.verbose || false;

  console.log('\n  agent-guard sync — Full documentation pass\n');

  // Step 1: Run all generators
  console.log('  Step 1: Running generators...');
  await gen({ configPath, flags });

  // Step 2: Load Claude Engine
  let claudeEngine;
  try {
    claudeEngine = require('../../templates/scripts/_claude-engine.cjs');
  } catch {
    // Fallback: check if installed in user project
    try {
      claudeEngine = require(require('path').resolve(config._projectRoot, 'scripts/_claude-engine.cjs'));
    } catch {
      console.error('  Could not load claude-engine module.');
      console.error('  Run "agent-guard init" to set up your project first.\n');
      return;
    }
  }

  // Step 3: Narrative sync
  console.log('  Step 2: Running narrative sync...');

  const engine = config.autoFix?.narrative?.engine || 'claude-code';
  let result;
  let engineUsed = engine;

  if (engine === 'api') {
    // === NEW: Direct API engine ===
    console.log('  Using Anthropic API engine...');

    try {
      result = await claudeEngine.invokeApiEngine({
        mode: 'sync',
        config,
        projectRoot: config._projectRoot,
        onProgress: (msg) => console.log(`  ${msg}`),
      });

      if (result.success && result.files && result.files.length > 0) {
        for (const f of result.files) {
          const fullPath = resolve(config._projectRoot, f.path);
          writeFileSync(fullPath, f.content, 'utf8');
          console.log(`  Updated: ${f.path}`);
        }

        // Stage changes
        try {
          execSync(`git add ${config.generatedDir || 'docs/_generated/'}`, {
            cwd: config._projectRoot, stdio: 'pipe',
          });
          const archFile = config.architectureFile || 'docs/ARCHITECTURE.md';
          const targets = [archFile, ...(config.autoFix?.narrative?.additionalNarrativeTargets || ['README.md'])];
          for (const t of targets) {
            execSync(`git add ${t}`, { cwd: config._projectRoot, stdio: 'pipe' });
          }
          console.log('  Changes staged.');
        } catch {
          console.log('  Note: Could not auto-stage changes (not in a git repo or nothing to stage).');
        }
      } else if (result.success) {
        console.log('  No documentation changes needed.');
      } else {
        console.log(`  API engine failed: ${result.error}`);
        console.log('  Falling back to manual prompt...');
        // Print the sync prompt for manual use
        const prompt = buildSyncPrompt(config);
        console.log('\n  Manual alternative — copy this prompt into Claude Code:\n');
        console.log(prompt);
      }
    } catch (err) {
      console.log(`  API engine error: ${err.message}`);
      result = { success: false, error: err.message };
    }

  } else {
    // === EXISTING: Claude Code subprocess engine ===
    console.log('  Using Claude Code subprocess engine...');

    const detected = claudeEngine.detectEngine();

    if (!detected) {
      console.log('\n  Claude Code not found on PATH.');
      console.log('  Install: npm i -g @anthropic-ai/claude-code');
      console.log('  Then run: agent-guard sync\n');

      console.log('  Manual alternative — copy this prompt into Claude Code:\n');
      console.log(buildSyncPrompt(config));
      console.log('');
      return;
    }

    engineUsed = detected;
    const prompt = buildSyncPrompt(config);

    if (verbose) {
      console.log('\n  --- Prompt ---');
      console.log(prompt);
      console.log('  --- End Prompt ---\n');
    }

    result = claudeEngine.invokeClaudeCode(prompt, config._projectRoot, (msg) => {
      console.log(`  ${msg}`);
    });

    if (result.success) {
      console.log('\n  Full documentation sync complete.');
      if (verbose && result.output) {
        console.log('\n  Claude Code output:');
        console.log(result.output);
      }
    } else {
      console.log(`\n  ${result.error}`);
      console.log('\n  Manual alternative — copy this prompt into Claude Code:\n');
      console.log(prompt);
    }
  }

  // Step 4: Log
  try {
    const auditLog = require('../../templates/scripts/_audit-log.cjs');
    auditLog.logEntry(config._projectRoot, {
      mode: 'sync',
      engine: engineUsed,
      narrativeResults: result?.success ? [{ file: 'full-sync', action: 'sync' }] : [],
    });
  } catch {
    // Best-effort logging
  }

  console.log('');
}
