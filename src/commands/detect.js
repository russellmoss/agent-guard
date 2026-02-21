/**
 * `agent-guard detect` — Auto-detect baselines
 *
 * Scans the current project and sets baseline values in agent-docs.config.json:
 * - largeFileCount: number of files exceeding largeFileThreshold lines
 * - todoCount: number of TODO/HACK/FIXME comments in source
 * - highVulnCount: high-severity npm audit vulnerabilities
 * - deadExportCount: unused exports detected by knip (if available)
 *
 * ARCHITECTURAL DECISION: Baselines are auto-detected rather than hardcoded.
 * This means the system works for ANY project on first run — no manual tuning.
 * The detect command writes real values to agent-docs.config.json, and the
 * GitHub Actions workflow reads them from there.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { loadConfig } from '../utils/config.js';

export default async function detect({ configPath, flags }) {
  console.log('\n  Auto-detecting baselines...\n');

  const config = loadConfig(configPath);
  const projectRoot = config._projectRoot;
  const threshold = config.baselines?.largeFileThreshold || 500;
  const verbose = flags.verbose || false;

  // ── 1. Large files ─────────────────────────────────────────────────────

  console.log(`  Scanning for files > ${threshold} lines...`);
  const sourceDir = resolve(projectRoot, config.scanPaths?.sourceDir || 'src/');
  let largeFileCount = 0;

  function scanForLargeFiles(dir) {
    let items;
    try { items = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === '.next' || item.name === '.git') continue;
        scanForLargeFiles(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(item.name)) {
        try {
          const content = readFileSync(fullPath, 'utf8');
          const lineCount = content.split('\n').length;
          if (lineCount > threshold) {
            largeFileCount++;
            if (verbose) {
              console.log(`    ${relative(projectRoot, fullPath)}: ${lineCount} lines`);
            }
          }
        } catch { /* skip unreadable files */ }
      }
    }
  }

  if (existsSync(sourceDir)) {
    scanForLargeFiles(sourceDir);
  }
  console.log(`  Large files (>${threshold} lines): ${largeFileCount}`);

  // ── 2. TODOs / HACKs / FIXMEs ─────────────────────────────────────────

  console.log('  Scanning for TODO/HACK/FIXME comments...');
  let todoCount = 0;

  function scanForTodos(dir) {
    let items;
    try { items = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(item.name)) continue;
        scanForTodos(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(item.name)) {
        try {
          const content = readFileSync(fullPath, 'utf8');
          const matches = content.match(/\b(TODO|HACK|FIXME)\b/g);
          if (matches) todoCount += matches.length;
        } catch { /* skip */ }
      }
    }
  }

  if (existsSync(sourceDir)) {
    scanForTodos(sourceDir);
  }
  console.log(`  TODO/HACK/FIXME count: ${todoCount}`);

  // ── 3. npm audit (high severity) ──────────────────────────────────────

  console.log('  Running npm audit...');
  let highVulnCount = 0;

  try {
    const auditJson = execSync('npm audit --json --omit=dev 2>&1 || true', {
      encoding: 'utf8',
      cwd: projectRoot,
      timeout: 30000,
    });
    try {
      const audit = JSON.parse(auditJson);
      const vulns = audit.metadata?.vulnerabilities;
      highVulnCount = vulns ? (vulns.high || 0) + (vulns.critical || 0) : 0;
    } catch {
      // JSON parse failed — audit output may not be valid JSON
      highVulnCount = 0;
    }
  } catch {
    console.log('  npm audit failed — setting highVulnCount to 0');
  }
  console.log(`  High/critical vulnerabilities: ${highVulnCount}`);

  // ── 4. Dead exports (knip) ────────────────────────────────────────────

  console.log('  Scanning for unused exports (knip)...');
  let deadExportCount = 0;

  try {
    // Check if knip is available
    execSync('npx knip --version', { encoding: 'utf8', stdio: 'pipe', timeout: 10000 });

    const knipJson = execSync('npx knip --reporter json 2>&1 || true', {
      encoding: 'utf8',
      cwd: projectRoot,
      timeout: 120000, // knip can be slow on large repos
    });

    try {
      const knipData = JSON.parse(knipJson);
      const issues = knipData.issues || [];
      issues.forEach(i => { deadExportCount += (i.exports || []).length; });
    } catch {
      // JSON parse failed
      deadExportCount = 0;
    }
  } catch {
    console.log('  knip not available — install with: npm i -D knip');
    console.log('    Setting deadExportCount to 0. Re-run detect after installing knip.');
  }
  console.log(`  Unused exports (knip): ${deadExportCount}`);

  // ── 5. Write baselines to config ──────────────────────────────────────

  const rawConfig = JSON.parse(readFileSync(config._configPath, 'utf8'));
  if (!rawConfig.baselines) rawConfig.baselines = {};
  rawConfig.baselines.largeFileCount = largeFileCount;
  rawConfig.baselines.todoCount = todoCount;
  rawConfig.baselines.highVulnCount = highVulnCount;
  rawConfig.baselines.deadExportCount = deadExportCount;

  writeFileSync(config._configPath, JSON.stringify(rawConfig, null, 2) + '\n', 'utf8');

  console.log(`
  Baselines written to agent-docs.config.json:

    largeFileCount:   ${largeFileCount} (files >${threshold} lines)
    todoCount:        ${todoCount}
    highVulnCount:    ${highVulnCount}
    deadExportCount:  ${deadExportCount}

  These values are your "known state." The weekly audit will only create
  issues when metrics WORSEN beyond these baselines.

  Run this command again anytime to re-calibrate.
  `);
}
