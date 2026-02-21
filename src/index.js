/**
 * @mossrussell/agent-guard — Programmatic API
 *
 * Exports core functions for use by other tools or custom scripts.
 * The CLI (`bin/agent-guard.js`) is the primary interface; this module
 * provides building blocks for advanced integrations.
 */

export { loadConfig, DEFAULT_CONFIG } from './utils/config.js';
export { generateArchitectureSkeleton } from './generators/architecture.js';
export { generateStandingInstructions } from './generators/standing-instructions.js';
export { generateConfigSchema } from './generators/config-schema.js';
