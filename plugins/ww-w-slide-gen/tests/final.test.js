const {test} = require('node:test');
const assert = require('node:assert/strict');
const {finalConfig} = require('../scripts/build-final.js');
const fixture = () => ({
  output:'compare.html', storageKey:'compare', exportFilename:'compare.html',
  slides:[{file:'a.html',role:'reference',pair:'cover'},{file:'b.html',role:'published',pair:'cover'}],
  final:{deckTitle:'Final',output:'final.html',storageKey:'final',exportFilename:'final.html'}
});
test('final is an independent clone with published slides only', () => {
  const input=fixture(), before=JSON.stringify(input), output=finalConfig(input);
  assert.deepEqual(output.slides,[input.slides[1]]);
  output.slides[0].file='changed.html';
  assert.equal(JSON.stringify(input),before);
  assert.equal(output.output,'final.html');
});
test('reject broken pairs and output collisions', () => {
  for (const mutate of [
    c=>c.slides.pop(), c=>c.slides[0].role='published',
    c=>c.slides[1].pair='wrong', c=>c.final.output=c.output,
    c=>c.final.storageKey=c.storageKey, c=>c.slides.push(...structuredClone(c.slides))
  ]) {
    const input=fixture(); mutate(input); assert.throws(()=>finalConfig(input));
  }
});
