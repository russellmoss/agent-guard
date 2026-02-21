'use strict';
/**
 * pre-commit-doc-check.js
 * Pre-commit hook: detects doc-relevant code changes and generates a Claude Code prompt.
 * Called by .husky/pre-commit.
 *
 * Config-driven: reads categories, docsDir, agentConfigFile, and architectureFile
 * from agent-docs.config.json
 *
 * Behavior:
 *   - Warns (stderr) + generates prompt when doc-relevant code changed WITHOUT doc updates
 *   - Shows positive note when doc-relevant code changed WITH doc updates
 *   - Silent when no doc-relevant files changed
 *   - ALWAYS exits 0 — this is a reminder, never a gate
 *
 * Usage: node scripts/pre-commit-doc-check.js [--verbose]
 */

const { execSync } = require('child_process');
const { loadConfig } = require('./_config-reader.cjs');

const verbose = process.argv.includes('--verbose');
const config = loadConfig();

function stderr(msg) {
  process.stderr.write(msg);
}

// ── Build CATEGORIES dynamically from config ─────────────────────────────────

function buildTestFunction(cat) {
  switch (cat.patternType) {
    case 'exact':
      return (f) => f === cat.filePattern;
    case 'startsWith':
      return (f) => f.startsWith(cat.filePattern);
    case 'regex':
      return (f) => new RegExp(cat.filePattern).test(f);
    default:
      return (f) => f === cat.filePattern;
  }
}

const CATEGORIES = (config.categories || []).map(cat => ({
  id: cat.id,
  name: cat.name,
  emoji: cat.emoji || '📦',
  test: buildTestFunction(cat),
  docTarget: cat.docTarget
    ? `${cat.docTarget} in ${config.architectureFile || 'docs/ARCHITECTURE.md'}`
    : `Relevant section in ${config.architectureFile || 'docs/ARCHITECTURE.md'}`,
  genCommand: cat.genCommand || null,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get list of staged file paths from git. Returns [] on any error. */
function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out.trim().split('\n').filter(f => f.length > 0);
  } catch { /* git not available or not in repo */
    return [];
  }
}

/** Return true if a staged file is a documentation file. */
function isDocFile(f) {
  const docsDir = config.docsDir || 'docs/';
  const agentConfig = config.agentConfigFile || '.cursorrules';
  return f.startsWith(docsDir) || f === agentConfig;
}

// ── Categorize staged files ──────────────────────────────────────────────────

function categorize(stagedFiles) {
  const matches = {}; // categoryId → [filePaths]
  const unmatched = [];

  for (const file of stagedFiles) {
    let matched = false;
    for (const cat of CATEGORIES) {
      if (cat.test(file)) {
        if (!matches[cat.id]) matches[cat.id] = [];
        matches[cat.id].push(file);
        matched = true;
        break; // first match wins
      }
    }
    if (!matched) {
      unmatched.push(file);
    }
  }

  return { matches, unmatched };
}

// ── Build the Claude Code prompt ─────────────────────────────────────────────

function buildPrompt(matches) {
  const archFile = config.architectureFile || 'docs/ARCHITECTURE.md';
  const lines = [];
  lines.push('The following files were changed and documentation may need updating.');
  lines.push(`Read each changed file listed below, then update ${archFile} accordingly.`);
  lines.push('');

  // Group files by category and build instructions
  for (const cat of CATEGORIES) {
    if (!matches[cat.id]) continue;

    const files = matches[cat.id];
    lines.push(`Changed ${cat.name}:`);

    const show = files.slice(0, 15);
    for (const f of show) {
      lines.push(`- Read ${f} — update ${cat.docTarget}`);
    }
    if (files.length > 15) {
      lines.push(`  (and ${files.length - 15} more files)`);
    }
    lines.push('');
  }

  // Gen commands
  const genCommands = [];
  for (const cat of CATEGORIES) {
    if (matches[cat.id] && cat.genCommand && !genCommands.includes(cat.genCommand)) {
      genCommands.push(cat.genCommand);
    }
  }
  if (genCommands.length > 0) {
    lines.push(`After updating ${archFile}, run:`);
    for (const cmd of genCommands) {
      lines.push(cmd);
    }
    lines.push('');
  }

  lines.push('Rules:');
  lines.push('- Read each file BEFORE updating docs');
  lines.push(`- Match the existing format in ${archFile}`);
  lines.push('- Do NOT modify any source code files');

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const stagedFiles = getStagedFiles();

  if (verbose) {
    stderr(`[pre-commit-doc-check] --verbose mode\n`);
    stderr(`Total staged files: ${stagedFiles.length}\n`);
    if (stagedFiles.length > 0) {
      stderr(`Staged:\n${stagedFiles.map(f => `  ${f}`).join('\n')}\n`);
    }
  }

  if (stagedFiles.length === 0) {
    if (verbose) stderr('No staged files. Nothing to check.\n');
    return;
  }

  const { matches, unmatched } = categorize(stagedFiles);
  const docFilesStaged = stagedFiles.some(isDocFile);
  const hasDocRelevant = Object.keys(matches).length > 0;

  if (verbose) {
    stderr(`\nCategory matches:\n`);
    for (const cat of CATEGORIES) {
      if (matches[cat.id]) {
        stderr(`  ${cat.name}: ${matches[cat.id].length} file(s)\n`);
      }
    }
    stderr(`Unmatched (ignored): ${unmatched.length}\n`);
    if (unmatched.length > 0) {
      stderr(`${unmatched.map(f => `  ${f}`).join('\n')}\n`);
    }
    stderr(`Doc files staged: ${docFilesStaged}\n`);
    stderr(`Has doc-relevant code: ${hasDocRelevant}\n`);
  }

  // No doc-relevant changes — silent pass
  if (!hasDocRelevant) {
    if (verbose) stderr('\nNo doc-relevant changes detected. ✓\n');
    return;
  }

  // Doc-relevant changes WITH doc updates — positive note
  if (docFilesStaged) {
    stderr('\n✓ Doc-relevant changes detected — docs also updated. Nice!\n\n');
    return;
  }

  // Doc-relevant changes WITHOUT doc updates — warn + generate prompt
  stderr('\n');
  stderr('⚠️  Documentation may need updating\n');
  stderr('━'.repeat(34) + '\n');
  stderr('\n');

  // List changed categories
  stderr('Changed:\n');
  for (const cat of CATEGORIES) {
    if (!matches[cat.id]) continue;
    const files = matches[cat.id];
    const count = `(${files.length} file${files.length !== 1 ? 's' : ''})`;
    stderr(`  ${cat.emoji}  ${cat.name} ${count}:\n`);
    const show = files.slice(0, 10);
    for (const f of show) {
      stderr(`     - ${f}\n`);
    }
    if (files.length > 10) {
      stderr(`     ... and ${files.length - 10} more\n`);
    }
  }

  // Gen commands to run
  const genCommands = [];
  for (const cat of CATEGORIES) {
    if (matches[cat.id] && cat.genCommand && !genCommands.includes(cat.genCommand)) {
      genCommands.push(cat.genCommand);
    }
  }
  if (genCommands.length > 0) {
    stderr('\nRun these inventory commands:\n');
    for (const cmd of genCommands) {
      stderr(`  ${cmd}\n`);
    }
  }

  // Claude Code prompt
  stderr('\n');
  stderr('┌' + '─'.repeat(45) + '┐\n');
  stderr('│  Claude Code Prompt (copy-paste this):       │\n');
  stderr('└' + '─'.repeat(45) + '┘\n');
  stderr('\n');
  stderr(buildPrompt(matches));
  stderr('\n\n');
}

try {
  main();
} catch (e) {
  // Never crash — never block a commit
  if (verbose) {
    process.stderr.write(`[pre-commit-doc-check] Unexpected error: ${e.message}\n`);
  }
}

process.exit(0);
