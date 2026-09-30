const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/build-deck.js'), 'utf8');

/** Extract the `const UI_TEXT = { ... };` object literal by brace-balancing, then eval it in isolation. */
function extractUiText(src) {
  const start = src.indexOf('const UI_TEXT = {');
  if (start < 0) throw new Error('UI_TEXT not found in build-deck.js');
  const braceStart = src.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('Could not find the end of the UI_TEXT object literal');
  const literal = src.slice(braceStart, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + literal)();
}

test('UI_TEXT.en and UI_TEXT.ko have identical key sets and no empty values', () => {
  const UI_TEXT = extractUiText(source);
  assert.ok(UI_TEXT.en && UI_TEXT.ko, 'UI_TEXT must define en and ko');
  const enKeys = Object.keys(UI_TEXT.en).sort();
  const koKeys = Object.keys(UI_TEXT.ko).sort();
  assert.deepEqual(enKeys, koKeys, 'en/ko key sets must match exactly');
  for (const key of enKeys) {
    assert.notEqual(UI_TEXT.en[key], '', `UI_TEXT.en.${key} must not be empty`);
    assert.notEqual(UI_TEXT.ko[key], '', `UI_TEXT.ko.${key} must not be empty`);
  }
});

test('build-deck.js has no Hangul outside the ko dictionary and its CSS dual-language overrides', () => {
  const start = source.indexOf('ko: {');
  assert.ok(start >= 0, 'ko dictionary block not found');
  const braceStart = source.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  assert.ok(end > 0, 'Could not find the end of the ko dictionary block');
  const withoutKoDict = source.slice(0, braceStart) + source.slice(end + 1);
  // CSS pseudo-element content strings carry a Korean override gated by html[data-ui-lang="ko"] — this
  // is the same kind of intentional Korean container as the ko dictionary, just expressed as CSS instead
  // of a JS object, so those lines are excluded the same way.
  const hangul = /[가-힣]/;
  const strayLines = withoutKoDict
    .split('\n')
    .filter(line => hangul.test(line) && !line.includes('data-ui-lang="ko"'));
  assert.deepEqual(strayLines, [], 'Found Hangul outside the ko dictionary / CSS ko overrides');
});
