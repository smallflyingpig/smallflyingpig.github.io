const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function topNavigation(html, page) {
  const match = html.match(/<nav class="top-nav"[\s\S]*?<\/nav>/);
  assert.ok(match, `${page}: top navigation must exist`);
  return match[0];
}

function assertSplitNavigation(relativePath, { labels, language }) {
  const nav = topNavigation(read(relativePath), relativePath);
  const primary = nav.match(/<div class="primary-nav"[\s\S]*?<\/div>/)?.[0];
  const switcher = nav.match(/<div class="language-switch"[\s\S]*?<\/div>/)?.[0];

  assert.ok(primary, `${relativePath}: section navigation must be grouped separately`);
  assert.ok(switcher, `${relativePath}: language switch must be grouped separately`);
  assert.deepEqual(
    [...primary.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((match) => match[1].trim()),
    labels,
    `${relativePath}: primary navigation labels`,
  );
  assert.match(switcher, new RegExp(`<span[^>]*aria-current="true"[^>]*>${language}<\\/span>`));
  assert.equal((nav.match(/aria-current="true"/g) || []).length, 1, `${relativePath}: one current language`);
}

test('bilingual homepages separate page navigation from language preference', () => {
  assertSplitNavigation('index.html', { labels: ['Home', 'Blog'], language: 'EN' });
  assertSplitNavigation('index_ch.html', { labels: ['主页', '博客'], language: '中文' });

  const chineseNav = topNavigation(read('index_ch.html'), 'index_ch.html');
  assert.doesNotMatch(chineseNav, />Home<[^]*>主页</, 'Chinese navigation must not expose two home tabs');
});

test('Chinese blog pages keep the language switch separate from the active Blog section', () => {
  const pages = [
    'blog/index.html',
    ...readdirSync(path.join(root, 'blog/posts'))
      .filter((name) => name.endsWith('.html'))
      .map((name) => `blog/posts/${name}`),
  ];

  for (const page of pages) {
    assertSplitNavigation(page, { labels: ['主页', '博客'], language: '中文' });
    const nav = topNavigation(read(page), page);
    assert.match(nav, /<a\b[^>]*class="active"[^>]*>博客<\/a>/, `${page}: Blog section must remain active`);
  }
});
