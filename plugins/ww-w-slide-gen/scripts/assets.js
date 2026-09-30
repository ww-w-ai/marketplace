// Build-time asset adapter. No package dependencies.
const fs = require('node:fs');
const path = require('node:path');

const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.gif':'image/gif', '.avif':'image/avif', '.otf':'font/otf', '.ttf':'font/ttf', '.woff':'font/woff', '.woff2':'font/woff2' };

/** Escape text inserted into HTML attributes or content. */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/** Validate the deliberately small, fixed-canvas deck contract. */
function validateConfig(config) {
  for (const key of ['deckTitle', 'footerBrand', 'storageKey', 'output', 'exportFilename']) {
    if (typeof config[key] !== 'string' || !config[key].trim()) throw new Error('Required config: ' + key);
  }
  for (const key of ['output', 'exportFilename']) {
    if (!/^[a-zA-Z0-9_-]+\.html$/.test(config[key])) throw new Error('Use a simple .html filename: ' + key);
  }
  if (!/^[a-zA-Z0-9:_-]+$/.test(config.storageKey)) throw new Error('Invalid storageKey');
  if (!Array.isArray(config.slides) || !config.slides.length) throw new Error('slides must not be empty');
  for (const slide of config.slides) {
    if (!!slide.file === !!slide.img) throw new Error('Each slide needs exactly one file or img');
    if (slide.file && !/^pages\/[a-zA-Z0-9_-]+\.html$/.test(slide.file)) throw new Error('Slide file must be pages/name.html');
  }
  if (!Array.isArray(config.stylesheets) || !config.stylesheets.length) throw new Error('stylesheets must not be empty');
  if (JSON.stringify(config).includes('<')) throw new Error('Config values are plain text, not HTML');
  if (config.textPalette && !config.textPalette.every(p => /^#[0-9a-f]{6}$/i.test(p.color) && typeof p.label === 'string' && !/["'<>]/.test(p.label))) throw new Error('Invalid textPalette');
}

/** Keep embedded files inside the copied project, including symlink targets. */
function localFile(file, root) {
  const resolved = fs.realpathSync(file);
  const relative = path.relative(fs.realpathSync(root), resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Asset outside project: ' + file);
  return resolved;
}

/** Inline one local image or font. Missing assets fail the build. */
function assetData(url, base, root, read = fs.readFileSync) {
  if (/^(data:|#)/.test(url)) return url;
  if (/^(?:[a-z]+:|\/\/)/i.test(url)) throw new Error('Use a local asset: ' + url);
  const file = localFile(path.resolve(base, decodeURIComponent(url.split(/[?#]/)[0])), root);
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error('Unsupported asset: ' + url);
  return 'data:' + mime + ';base64,' + read(file).toString('base64');
}

/** Resolve CSS imports relative to their own file, then embed its assets. */
function compileCss(file, root, ancestors = new Set()) {
  file = localFile(file, root);
  if (ancestors.has(file)) throw new Error('Circular CSS import: ' + file);
  const chain = new Set(ancestors).add(file);
  const imports = [];
  let css = fs.readFileSync(file, 'utf8').replace(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;/g, (_, url) => {
    if (/^(?:[a-z]+:|\/\/)/i.test(url)) throw new Error('Use a local CSS import: ' + url);
    const index = imports.push(compileCss(path.resolve(path.dirname(file), url), root, chain)) - 1;
    return '/*INLINE_' + index + '*/';
  });
  if (/@import\b/.test(css)) throw new Error('Use a quoted local CSS import');
  css = css.replace(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g, (_, url) => 'url("' + assetData(url, path.dirname(file), root) + '")');
  return css.replace(/\/\*INLINE_(\d+)\*\//g, (_, index) => imports[Number(index)]);
}

/** Embed HTML images. Page asset paths are relative to html/, not pages/. */
function embedMarkup(html, base, root) {
  html = html.replace(/(<img\b[^>]*?\s)(data-src|src)="([^"]+)"/g, (_, prefix, attr, url) => prefix + attr + '="' + assetData(url, base, root) + '"');
  return html;
}

module.exports = { validateConfig, compileCss, embedMarkup, escapeHtml, assetData };
