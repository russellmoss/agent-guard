import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkMarkdownValidity, checkSectionStructure, checkPlaceholders } = require('../templates/scripts/quality-check.cjs');

describe('quality-check', () => {
  it('catches unclosed code blocks', () => {
    const issues = checkMarkdownValidity('```js\ncode\n');
    assert.ok(issues.length > 0);
    assert.ok(issues[0].includes('Unclosed'));
  });

  it('passes valid markdown', () => {
    const issues = checkMarkdownValidity('```js\ncode\n```\nText here.');
    assert.equal(issues.length, 0);
  });

  it('detects missing Overview section', () => {
    const issues = checkSectionStructure('# My Doc\n## API Routes\n', []);
    assert.ok(issues.some(i => i.includes('Overview')));
  });

  it('passes valid structure', () => {
    const content = '## Section 1: Overview\n## Section 2: API Routes\n';
    const issues = checkSectionStructure(content, []);
    assert.equal(issues.length, 0);
  });

  it('detects placeholder text', () => {
    const issues = checkPlaceholders('_Add your models here_\nSome real content\nTODO: fix this');
    assert.ok(issues.length > 0);
  });
});
