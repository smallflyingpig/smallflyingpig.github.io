const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = (name) => readFileSync(path.join(root, name), 'utf8');
const pages = ['index.html', 'index_ch.html'];

test('current LLM identity and recent research appear before historical biography', () => {
  for (const file of pages) {
    const html = read(file);
    const about = html.match(/<section id="about"[\s\S]*?<\/section>/)[0];
    assert.match(about, /class="bio-lead"/);
    assert.ok(about.indexOf('class="bio-lead"') < about.indexOf('class="bio-content"'));
    assert.match(about, /href="#pub-muse"/);
    assert.match(about, /href="#pub-geora"/);
    assert.match(html, /class="pub-card pub-featured" id="pub-muse"/);
    assert.match(html, /class="pub-card pub-featured" id="pub-geora"/);
    assert.match(html, /<main class="main-content">\s*<div class="mobile-identity">/);
  }
});

test('every publication title links to a verified paper and has a publication year', () => {
  for (const file of pages) {
    const publications = read(file).match(/<section id="pub"[\s\S]*?<\/section>/)[0];
    const cards = [...publications.matchAll(/<div class="pub-card[^\"]*"[^>]*>([\s\S]*?)<\/div>/g)];
    assert.equal(cards.length, file === 'index.html' ? 10 : 11);
    for (const [,card] of cards) {
      assert.match(card, /<h3 class="pub-title"><a href="https:\/\/(?:doi\.org|link\.springer\.com|www\.sciengine\.com|arxiv\.org|aclanthology\.org)\//);
      assert.match(card, /class="pub-venue[^\"]*">[^<]*20\d\d<\/span>/);
    }
  }
});

test('ACL award is present in both awards sections without altering disputed historical wording', () => {
  for (const file of pages) {
    const awards = read(file).match(/<section id="awards"[\s\S]*?<\/section>/)[0];
    assert.match(awards, /2026\.07 - <a href="https:\/\/aclanthology\.org\/2026\.acl-long\.1110\/">ACL 2026 Outstanding Paper/);
  }
  assert.match(read('index.html'), /Best Student Paper Award of China VR/);
  assert.match(read('index_ch.html'), /第17届中国虚拟现实大会最佳论文奖/);
});

test('section anchors clear the fixed header and mobile profile remains visible', () => {
  const css = read('css/main.css');
  assert.match(css, /\.section, \.pub-card\[id\] \{ scroll-margin-top: calc\(var\(--top-nav-height\) \+ 20px\); \}/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.mobile-identity \{ display: flex;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /a:focus-visible, button:focus-visible/);
});

function luminance(hex) {
  const values = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('small link and muted text colors pass WCAG AA contrast', () => {
  const css = read('css/main.css');
  const color = (name) => css.match(new RegExp(`--${name}: (#[a-fA-F0-9]{6});`))[1];
  for (const background of ['#FFFFFF', color('bg-primary')]) {
    assert.ok(contrast(color('link'), background) >= 4.5);
    assert.ok(contrast(color('text-muted'), background) >= 4.5);
  }
  assert.ok(contrast('#24313c', color('accent')) >= 4.5);
  assert.ok(contrast('#183d34', '#48C9B0') >= 4.5);
});
