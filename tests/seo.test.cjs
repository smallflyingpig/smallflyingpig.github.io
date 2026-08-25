const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const english = readFileSync(path.join(root, 'index.html'), 'utf8');
const chinese = readFileSync(path.join(root, 'index_ch.html'), 'utf8');

function jsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'homepage must expose JSON-LD');
  return JSON.parse(match[1]);
}

test('bilingual homepages expose distinct personal-brand search metadata', () => {
  assert.match(english, /<title>Jiguo Li \| LLM Engineer &amp; AI Researcher<\/title>/);
  assert.match(chinese, /<title>黎吉国 \| 大语言模型工程师与人工智能研究者<\/title>/);
  assert.match(english, /<meta name="description" content="[^"]*Jiguo Li[^"]*Meituan[^"]*large language models[^"]*">/);
  assert.match(chinese, /<meta name="description" content="[^"]*黎吉国[^"]*美团[^"]*大语言模型[^"]*">/);
});

test('bilingual homepages declare self canonicals and reciprocal language alternates', () => {
  assert.match(english, /<link rel="canonical" href="https:\/\/smallflyingpig\.github\.io\/">/);
  assert.match(chinese, /<link rel="canonical" href="https:\/\/smallflyingpig\.github\.io\/index_ch\.html">/);

  for (const html of [english, chinese]) {
    assert.match(html, /hreflang="en" href="https:\/\/smallflyingpig\.github\.io\/">/);
    assert.match(html, /hreflang="zh-CN" href="https:\/\/smallflyingpig\.github\.io\/index_ch\.html">/);
    assert.match(html, /hreflang="x-default" href="https:\/\/smallflyingpig\.github\.io\/">/);
  }
});

test('ProfilePage JSON-LD identifies one person across both language pages', () => {
  for (const data of [jsonLd(english), jsonLd(chinese)]) {
    assert.equal(data['@type'], 'ProfilePage');
    assert.equal(data.mainEntity['@type'], 'Person');
    assert.equal(data.mainEntity['@id'], 'https://smallflyingpig.github.io/#person');
    assert.equal(data.mainEntity.name, 'Jiguo Li');
    assert.ok(data.mainEntity.alternateName.includes('黎吉国'));
    assert.ok(data.mainEntity.sameAs.includes('https://github.com/smallflyingpig'));
    assert.ok(data.mainEntity.sameAs.includes('https://scholar.google.com/citations?user=NfQeyQ4AAAAJ'));
  }
});

test('homepages expose localized Open Graph and Twitter metadata', () => {
  for (const html of [english, chinese]) {
    assert.match(html, /<meta property="og:type" content="profile">/);
    assert.match(html, /<meta property="og:image" content="https:\/\/smallflyingpig\.github\.io\/img\/jiguo\.png">/);
    assert.match(html, /<meta name="twitter:card" content="summary">/);
  }
  assert.match(english, /<meta property="og:locale" content="en_US">/);
  assert.match(chinese, /<meta property="og:locale" content="zh_CN">/);
});

test('robots advertises a sitemap that covers every public HTML page', () => {
  const robots = readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/smallflyingpig\.github\.io\/sitemap\.xml$/m);

  const sitemap = readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const expectedUrls = [
    'https://smallflyingpig.github.io/',
    'https://smallflyingpig.github.io/index_ch.html',
    'https://smallflyingpig.github.io/blog/',
    ...readdirSync(path.join(root, 'blog/posts'))
      .filter((name) => name.endsWith('.html'))
      .sort()
      .map((name) => `https://smallflyingpig.github.io/blog/posts/${encodeURIComponent(name)}`),
  ];

  for (const url of expectedUrls) {
    assert.match(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`), url);
  }
  assert.equal((sitemap.match(/<loc>/g) || []).length, expectedUrls.length);
});
