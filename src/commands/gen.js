/**
 * `agent-guard gen` — Run all inventory generators
 * Equivalent to `npm run gen:all` but reads config to determine which generators to run.
 */

import { execSync } from 'node:child_process';
import { loadConfig } from '../utils/config.js';

export default async function gen({ configPath, flags }) {
  const config = loadConfig(configPath);
  const verbose = flags.verbose || false;

  const scripts = [];

  // Always run API route inventory
  scripts.push({ name: 'API Routes', cmd: 'node scripts/generate-api-inventory.cjs' });

  // Prisma only if configured
  if (config.scanPaths?.prismaSchema) {
    scripts.push({ name: 'Prisma Models', cmd: 'node scripts/generate-model-inventory.cjs' });
  }

  // Always run env inventory
  scripts.push({ name: 'Env Variables', cmd: 'node scripts/generate-env-inventory.cjs' });

  console.log(`\n  Generating ${scripts.length} inventories...\n`);

  for (const script of scripts) {
    try {
      if (verbose) console.log(`  Running: ${script.cmd}`);
      const output = execSync(script.cmd, { encoding: 'utf8', cwd: config._projectRoot });
      console.log(`  ${script.name}: ${output.trim()}`);
    } catch (err) {
      console.error(`  ${script.name} failed: ${err.message}`);
    }
  }

  console.log('\n  Done.\n');
}
