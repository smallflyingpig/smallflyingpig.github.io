const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { initBlog, normalizePosts, createCard } = require('../js/blog.js');

const root = path.resolve(__dirname, '..');

class Element {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.className = '';
    this.textContent = '';
    this.classList = {
      toggle: (name, active) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (active) classes.add(name);
        else classes.delete(name);
        this.className = [...classes].join(' ');
      },
    };
  }
  set innerHTML(value) { throw new Error('Blog metadata must never be parsed as HTML'); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }
  click() {
    if (this.disabled) return;
    this.focus();
    for (const listener of this.listeners.get('click') || []) listener({ target: this });
  }
  focus() { this.ownerDocument.activeElement = this; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.tagName.toLowerCase() === selector ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
}

function createPage() {
  const elements = new Map();
  const doc = {
    getElementById: id => elements.get(id),
    createElement: tag => new Element(tag, doc),
    activeElement: null,
  };
  for (const id of ['blogGrid', 'postStatus', 'noResults', 'retryLoad', 'clearFilters', 'pageTitle', 'catFilter', 'tagFilter', 'yearFilter']) {
    elements.set(id, doc.createElement('div'));
  }
  for (const category of ['all', 'tech', 'essay', 'other']) {
    const button = doc.createElement('button');
    button.dataset.cat = category;
    elements.get('catFilter').append(button);
  }
  return { doc, get: id => doc.getElementById(id) };
}

const fixtures = [
  { title: '技术笔记', date: '2026-04-01', category: 'tech', tags: ['AI', 'LLM'], excerpt: '技术介绍。', slug: '技术 & notes' },
  { title: '生活随笔', date: '2024-04-23', category: 'essay', tags: ['生活'], excerpt: '生活介绍。', slug: 'essay' },
  { title: '早期技术笔记', date: '2023-05-01', category: 'tech', tags: ['AI'], excerpt: '另一篇介绍。', slug: 'early' },
];
const response = data => ({ ok: true, json: async () => data });
const flush = () => new Promise(resolve => setImmediate(resolve));

function button(page, id, key, value) {
  return page.get(id).querySelectorAll('button').find(element => element.dataset[key] === value);
}

test('post cards are native links with inert text and encoded local destinations', () => {
  const { doc } = createPage();
  const malicious = {
    ...fixtures[0],
    title: '<img src=x onerror=alert(1)>',
    excerpt: '<script>alert(1)</script>',
    tags: ['" onclick="alert(1)', '<b>AI</b>'],
  };
  const card = createCard(doc, malicious);
  assert.equal(card.tagName, 'A');
  assert.equal(card.getAttribute('href'), 'posts/' + encodeURIComponent(malicious.slug) + '.html');
  assert.equal(card.children[0].textContent, malicious.title);
  assert.equal(card.children[2].children[0].textContent, malicious.tags[0]);
  assert.equal(card.children[3].textContent, malicious.excerpt);
  assert.equal(card.getAttribute('onclick'), null);
  assert.equal(card.querySelectorAll('button').length, 0, 'a card must not contain nested controls');
});

test('loading, combined filters, toggling, focus retention, and reset work repeatedly', async () => {
  const page = createPage();
  let resolveIndex;
  const controller = initBlog(page.doc, () => new Promise(resolve => { resolveIndex = resolve; }));
  assert.equal(page.get('blogGrid').getAttribute('aria-busy'), 'true');
  assert.match(page.get('postStatus').textContent, /正在加载/);
  assert.equal(button(page, 'catFilter', 'cat', 'tech').disabled, true);
  resolveIndex(response(fixtures));
  await controller.ready;
  assert.equal(page.get('blogGrid').children.length, 3);
  assert.equal(page.get('blogGrid').getAttribute('aria-busy'), 'false');
  assert.equal(page.get('clearFilters').disabled, true);

  const ai = button(page, 'tagFilter', 'tag', 'AI');
  ai.click();
  assert.equal(page.get('blogGrid').children.length, 2);
  assert.equal(ai.getAttribute('aria-pressed'), 'true');
  assert.equal(page.doc.activeElement, ai);
  assert.equal(button(page, 'tagFilter', 'tag', 'AI'), ai, 'render must preserve focused filter nodes');
  ai.click();
  assert.equal(ai.getAttribute('aria-pressed'), 'false');
  assert.equal(page.get('blogGrid').children.length, 3);
  ai.click();

  const year = button(page, 'yearFilter', 'year', '2024');
  year.click();
  assert.equal(page.get('blogGrid').children.length, 0);
  assert.equal(page.get('noResults').hidden, false);
  assert.match(page.get('noResults').textContent, /清除筛选/);
  assert.equal(year.getAttribute('aria-pressed'), 'true');
  assert.match(page.get('postStatus').textContent, /0 篇.*AI.*2024/);

  button(page, 'catFilter', 'cat', 'essay').click();
  assert.equal(button(page, 'catFilter', 'cat', 'essay').getAttribute('aria-pressed'), 'true');
  page.get('clearFilters').click();
  assert.equal(page.get('blogGrid').children.length, 3);
  assert.equal(page.get('noResults').hidden, true);
  assert.equal(ai.getAttribute('aria-pressed'), 'false');
  assert.equal(year.getAttribute('aria-pressed'), 'false');
  assert.equal(button(page, 'catFilter', 'cat', 'all').getAttribute('aria-pressed'), 'true');
  assert.equal(page.doc.activeElement, page.get('pageTitle'));
  assert.equal(page.get('clearFilters').disabled, true);

  year.click();
  year.click();
  assert.equal(page.get('blogGrid').children.length, 3, 'a selected year toggles off');
});

test('HTTP, network, JSON, and malformed-index failures show a useful retry and recover', async () => {
  const failures = [
    async () => ({ ok: false }),
    async () => { throw new Error('offline'); },
    async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
    async () => response({ posts: fixtures }),
    async () => response([{ title: 'Missing URL and date' }]),
  ];
  for (const fail of failures) {
    const page = createPage();
    let calls = 0;
    const controller = initBlog(page.doc, () => ++calls === 1 ? fail() : Promise.resolve(response(fixtures)));
    await controller.ready;
    assert.equal(page.get('blogGrid').getAttribute('aria-busy'), 'false');
    assert.match(page.get('postStatus').textContent, /加载失败.*网络/);
    assert.equal(page.get('retryLoad').hidden, false);
    assert.equal(page.get('noResults').hidden, true, 'load failures are not mislabeled as an empty blog');
    page.get('retryLoad').click();
    page.get('retryLoad').click();
    await flush();
    assert.equal(calls, 2, 'disable repeated retry clicks while a request is pending');
    assert.equal(page.get('retryLoad').hidden, true);
    assert.equal(page.get('blogGrid').children.length, 3);
    assert.equal(page.doc.activeElement, page.get('pageTitle'));
  }
});

test('empty blog has a distinct message and no enabled filters', async () => {
  const page = createPage();
  await initBlog(page.doc, async () => response([])).ready;
  assert.match(page.get('postStatus').textContent, /共 0 篇/);
  assert.equal(page.get('noResults').hidden, false);
  assert.match(page.get('noResults').textContent, /还没有发布文章/);
  assert.equal(page.get('clearFilters').disabled, true);
  assert.equal(button(page, 'catFilter', 'cat', 'all').disabled, true);
});

test('index validation limits card links to one encoded post filename and normalizes tags', () => {
  for (const slug of ['', ' ', '.', '..', '../outside', 'nested/post', 'nested\\post', 'bad\npost']) {
    assert.throws(() => normalizePosts([{ ...fixtures[0], slug }]), /Invalid blog post/);
  }
  const posts = normalizePosts([{ ...fixtures[0], category: '__proto__', tags: ['AI', 'AI', 1, null, ''] }]);
  assert.equal(posts[0].category, 'other');
  assert.deepEqual(posts[0].tags, ['AI']);
});

test('blog index uses real filter buttons, explicit states, and an external controller', () => {
  const html = readFileSync(path.join(root, 'blog/index.html'), 'utf8');
  assert.doesNotMatch(html, /href="#"|onclick=/);
  assert.match(html, /<button[^>]*data-cat="all"[^>]*aria-pressed="true"/);
  assert.match(html, /id="postStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="blogGrid"[^>]*aria-busy="true"/);
  assert.match(html, /id="clearFilters"/);
  assert.match(html, /id="retryLoad"/);
  assert.match(html, /<script src="\.\.\/js\/blog\.js"><\/script>/);
});

test('every blog page identifies the person on mobile and marks English as unavailable', () => {
  const pages = ['blog/index.html', ...readdirSync(path.join(root, 'blog/posts')).filter(name => name.endsWith('.html')).map(name => `blog/posts/${name}`)];
  for (const page of pages) {
    const html = readFileSync(path.join(root, page), 'utf8');
    const switcher = html.match(/<div class="language-switch"[\s\S]*?<\/div>/)?.[0];
    assert.match(switcher, /<span[^>]*aria-current="true"[^>]*>中文<\/span>/, page);
    assert.match(switcher, /<span[^>]*class="language-option unavailable"[^>]*aria-disabled="true"[^>]*title="英文博客暂未提供"[^>]*>EN<\/span>/, page);
    assert.doesNotMatch(switcher, /<a\b/, page);
    assert.match(html, /<main class="main-content">\s*<div class="mobile-identity">/, page);
    assert.match(html, /class="mobile-identity-title">Senior Engineer @ Meituan<\/p>/, page);
  }
});
