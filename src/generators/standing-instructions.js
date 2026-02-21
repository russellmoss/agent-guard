/**
 * Generates the standing instructions block that gets appended to the
 * user's AI agent config file (.cursorrules, .cursor/rules, CLAUDE.md, etc.)
 */

export function generateStandingInstructions(config) {
  const archFile = config.architectureFile || 'docs/ARCHITECTURE.md';

  // Build the lookup table rows from categories
  const tableRows = [];

  for (const cat of config.categories || []) {
    const trigger = cat.filePattern;
    const update = cat.docTarget
      ? `${cat.docTarget} in \`${archFile}\``
      : `Relevant section in \`${archFile}\``;
    const command = cat.genCommand ? `Run \`${cat.genCommand}\`` : '—';

    // Format the pattern for display
    let displayPattern;
    if (cat.patternType === 'regex') {
      displayPattern = `Files matching \`${trigger}\``;
    } else if (cat.patternType === 'startsWith') {
      displayPattern = `\`${trigger}*\``;
    } else {
      displayPattern = `\`${trigger}\``;
    }

    tableRows.push(`| ${displayPattern} | ${update} | ${command} |`);
  }

  const lines = [
    '## Documentation Maintenance — Standing Instructions',
    '',
    '### Rule: Update Docs When You Change Code',
    '',
    'When you add, rename, remove, or significantly modify any of the following, you MUST update the relevant documentation **in the same session** — do not defer to a later task:',
    '',
    '| If You Changed… | Update This | And Run… |',
    '|---|---|---|',
    ...tableRows,
    '',
    '### Generated Inventories',
    '',
    `Auto-generated inventory files exist at \`${config.generatedDir || 'docs/_generated/'}\`:`,
  ];

  // List gen commands
  const genCommands = (config.categories || [])
    .filter((c) => c.genCommand)
    .map((c) => `- \`${c.genCommand}\``);
  const uniqueCommands = [...new Set(genCommands)];
  lines.push(...uniqueCommands);
  lines.push('- Run all: `npm run gen:all`');
  lines.push('');
  lines.push('These are committed to the repo. Always regenerate after changing routes, models, or env vars.');
  lines.push('');
  lines.push('### What NOT to Do');
  lines.push(`- Do NOT edit files in \`${config.generatedDir || 'docs/_generated/'}\` manually — they are overwritten by scripts`);
  lines.push('- Do NOT skip documentation updates because "it\'s a small change" — small changes accumulate into drift');
  lines.push(`- Do NOT update \`${archFile}\` without reading the existing section first — match the format`);

  return lines.join('\n');
}
