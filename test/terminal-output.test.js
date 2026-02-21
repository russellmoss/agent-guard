import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getEmoji } = require('../templates/scripts/_terminal-output.cjs');

describe('terminal-output', () => {
  describe('getEmoji', () => {
    it('returns API emoji for route files', () => {
      assert.equal(getEmoji('docs/_generated/api-routes.md'), '📡');
      assert.equal(getEmoji('src/app/api/users/route.ts'), '📡');
    });

    it('returns database emoji for prisma/model files', () => {
      assert.equal(getEmoji('prisma/schema.prisma'), '🗄️');
      assert.equal(getEmoji('docs/_generated/prisma-models.md'), '🗄️');
    });

    it('returns key emoji for env files', () => {
      assert.equal(getEmoji('.env.example'), '🔑');
      assert.equal(getEmoji('docs/_generated/env-vars.md'), '🔑');
    });

    it('returns doc emoji for architecture', () => {
      assert.equal(getEmoji('docs/ARCHITECTURE.md'), '📄');
    });

    it('returns book emoji for README', () => {
      assert.equal(getEmoji('README.md'), '📖');
    });

    it('returns default emoji for unknown files', () => {
      assert.equal(getEmoji('src/utils/helpers.ts'), '📝');
    });
  });
});
