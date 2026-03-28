/**
 * `agent-guard check` — Run pre-commit doc check
 * Called by the Husky pre-commit hook. Propagates hook exit code.
 */

import { execSync } from 'node:child_process';

export default async function check({ configPath: _configPath, flags }) {
  const args = [];
  if (flags.verbose) args.push('--verbose');
  if (flags['check-only']) args.push('--check-only');

  try {
    execSync(`node scripts/pre-commit-doc-check.cjs ${args.join(' ')}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (err) {
    // Propagate the hook's exit code (1 = docs stale in blocking mode)
    process.exit(err.status ?? 1);
  }
  // Implicit exit 0 on success
}
