/**
 * `agent-guard check` — Run pre-commit doc check
 * Called by the Husky pre-commit hook. Exits 0 always (advisory only).
 */

import { execSync } from 'node:child_process';

export default async function check({ configPath, flags }) {
  try {
    execSync('node scripts/pre-commit-doc-check.js', {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch {
    // Never block commits — exit 0 regardless
  }
  process.exit(0);
}
