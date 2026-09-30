const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const newDeck = path.join(root, 'scripts', 'new-deck.js');

test('new-deck creates a buildable deck with its own storageKey and no plugin files', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-w-slide-gen-new-'));
  const dest = path.join(parent, 'Acme Intro');
  try {
    execFileSync(process.execPath, [newDeck, dest], { cwd: os.tmpdir() });
    const config = JSON.parse(fs.readFileSync(path.join(dest, 'deck.config.json'), 'utf8'));
    assert.equal(config.storageKey, 'acme-intro-v1');
    for (const absent of ['.git', '.claude-plugin', '.codex-plugin', 'skills', 'tests', 'output', 'README.md', path.join('html', 'deck.html')]) {
      assert.ok(!fs.existsSync(path.join(dest, absent)), `unexpected ${absent}`);
    }
    execFileSync(process.execPath, [path.join(dest, 'scripts', 'build-deck.js')], { cwd: os.tmpdir() });
    const html = fs.readFileSync(path.join(dest, 'html', 'deck.html'), 'utf8');
    assert.equal([...html.matchAll(/<section data-idx=/g)].length, config.slides.length);
    assert.ok(html.includes('acme-intro-v1'));
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('new-deck refuses a non-empty destination and leaves it untouched', () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-w-slide-gen-busy-'));
  try {
    fs.writeFileSync(path.join(dest, 'keep.txt'), 'mine');
    const run = spawnSync(process.execPath, [newDeck, dest], { encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /not empty/);
    assert.deepEqual(fs.readdirSync(dest), ['keep.txt']);
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
});
