// Reuse the existing deck builder; keep comparison sources intact.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateConfig } = require('./assets.js');
const ROOT = path.resolve(__dirname, '..');

function finalConfig(comparison) {
  const result = structuredClone(comparison);
  if (!result.slides?.length || result.slides.length % 2) throw new Error('Expected reference/published pairs.');
  const pairs = new Set();
  for (let i = 0; i < result.slides.length; i += 2) {
    const [a, b] = result.slides.slice(i, i + 2);
    if (a.role !== 'reference' || b.role !== 'published' || !a.pair || a.pair !== b.pair || pairs.has(a.pair))
      throw new Error('Expected unique matching reference/published pairs.');
    pairs.add(a.pair);
  }
  const final = result.final;
  if (!final?.output || !final.storageKey || !final.exportFilename || !final.deckTitle)
    throw new Error('Define final output, storageKey, exportFilename and deckTitle.');
  if (final.output === result.output || final.storageKey === result.storageKey || final.exportFilename === result.exportFilename)
    throw new Error('Final output and editor identity must differ from comparison.');
  Object.assign(result, final);
  result.slides = comparison.slides.filter(s => s.role === 'published').map(s => structuredClone(s));
  delete result.final;
  return result;
}
if (require.main === module) {
  const input = path.join(ROOT, 'comparison.config.json');
  const output = path.join(ROOT, 'final.config.json');
  const config = finalConfig(JSON.parse(fs.readFileSync(input, 'utf8')));
  validateConfig(config);
  fs.writeFileSync(output, JSON.stringify(config, null, 2) + '\n');
  execFileSync(process.execPath, [path.join(__dirname, 'build-deck.js'), '--config', output], {stdio: 'inherit'});
}
module.exports = { finalConfig };
