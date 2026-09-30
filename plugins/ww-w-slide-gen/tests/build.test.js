const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync, spawnSync } = require('node:child_process');
const { validateConfig, assetData, compileCss } = require('../scripts/assets.js');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'deck.config.json'), 'utf8'));

// Copies only build inputs. Project examples are deliberately not test fixtures.
function copyProject(dir) {
  for (const name of ['scripts', 'html', 'assets', 'deck.config.json', 'LICENSE']) {
    fs.cpSync(path.join(root, name), path.join(dir, name), {recursive:true});
  }
}

function buildAt(dir) {
  execFileSync(process.execPath, [path.join(dir, 'scripts/build-deck.js')], {cwd:os.tmpdir()});
}

test('build produces self-contained assets and parseable runtime', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/build-deck.js')]);
  const html = fs.readFileSync(path.join(root, 'html', config.output), 'utf8');
  assert.equal([...html.matchAll(/<section data-idx=/g)].length, config.slides.length);
  assert.ok(!html.includes('{{footerBrand}}'));
  assert.ok(!/<link[^>]+stylesheet/.test(html));
  for (const [, url] of html.matchAll(/<img\b[^>]*\s(?:src|data-src)="([^"]+)"/g)) assert.ok(url.startsWith('data:'), url);
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  for (const [, url] of css.matchAll(/url\(["']?([^)"']+)/g)) {
    assert.ok(url.startsWith('data:') || url.startsWith('#'), url.slice(0,90));
  }
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length);
  for (const [, script] of scripts) assert.doesNotThrow(() => new vm.Script(script));
});

test('a relocated folder builds without original project paths', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-w-slide-gen-copy-'));
  try {
    copyProject(dir);
    buildAt(dir);
    const html = fs.readFileSync(path.join(dir, 'html', config.output), 'utf8');
    assert.ok(!html.includes(root));
    assert.match(html, /<title>/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('missing-asset gate fails on mutation and returns green after restore', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-w-slide-gen-probe-'));
  try {
    copyProject(dir);
    const sample = path.join(dir, 'assets', '__test-asset.svg');
    const original = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"/>';
    const fixtureConfig = {...config, slides:[{img:'../assets/__test-asset.svg'}]};
    fs.writeFileSync(path.join(dir, 'deck.config.json'), JSON.stringify(fixtureConfig));
    const failed = spawnSync(process.execPath, [path.join(dir, 'scripts/build-deck.js')], {encoding:'utf8'});
    assert.notEqual(failed.status, 0, 'build must fail rather than leave a broken image');
    assert.match(failed.stderr, /ENOENT/);
    fs.writeFileSync(sample, original);
    buildAt(dir);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('config rejects ambiguous slides and output traversal', () => {
  assert.throws(() => validateConfig({...config, output:'../outside.html'}), /filename/);
  assert.throws(() => validateConfig({...config, slides:[{file:'pages/a.html',img:'../assets/a.png'}]}), /exactly one/);
});

test('asset adapter rejects remote URLs and escaping symlinks', () => {
  assert.throws(() => assetData('https://example.com/a.png',root,root), /local asset/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-w-slide-gen-boundary-'));
  try {
    fs.symlinkSync(path.join(root,'package.json'), path.join(dir,'external.svg'));
    assert.throws(() => assetData('external.svg',dir,dir), /outside project/);
    fs.writeFileSync(path.join(dir,'a.css'), '@import "b.css";');
    fs.writeFileSync(path.join(dir,'b.css'), '@import "a.css";');
    assert.throws(() => compileCss(path.join(dir,'a.css'),dir), /Circular/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});

test('rebranding and replacing every sample page preserves the build contract', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-w-slide-gen-rebrand-'));
  try {
    copyProject(dir);
    const pagesDir = path.join(dir,'html/pages');
    fs.rmSync(pagesDir, {recursive:true});
    fs.mkdirSync(pagesDir);
    const template = fs.readFileSync(path.join(root,'templates/blank-slide.html'),'utf8');
    fs.writeFileSync(path.join(pagesDir,'new-story.html'), template.replace('your-unique-page-id','new-story').replace("This slide's core claim",'A new brand and a new story'));
    fs.writeFileSync(path.join(dir,'html/custom-theme.css'), ':root { --primary: #1536b8; --page-margin: 96px; }');
    const brand = {...config, deckTitle:'New Brand', footerBrand:'New Brand · example.test', storageKey:'new-brand-v1', exportFilename:'new-brand.html', output:'rebrand.html', slides:[{file:'pages/new-story.html'}], stylesheets:[...config.stylesheets,'custom-theme.css']};
    fs.writeFileSync(path.join(dir,'deck.config.json'),JSON.stringify(brand));
    buildAt(dir);
    const html = fs.readFileSync(path.join(dir,'html/rebrand.html'),'utf8');
    assert.match(html, /<title>New Brand<\/title>/);
    assert.match(html, /New Brand · example\.test/);
    assert.match(html, /A new brand and a new story/);
    assert.match(html, /--page-margin: 96px/);
    assert.equal([...html.matchAll(/<section data-idx=/g)].length,1);
    assert.ok(!html.includes('Turn your story into'));
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});
