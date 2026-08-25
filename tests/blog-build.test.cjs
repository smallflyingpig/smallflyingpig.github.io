const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const pythonBin = process.env.BLOG_PYTHON || path.join(root, '.venv/bin/python');

function runPython(source, input = '') {
  const result = spawnSync(pythonBin, ['-c', source], {
    cwd: root,
    encoding: 'utf8',
    input,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test('Markdown rendering preserves LaTeX until MathJax processes it', () => {
  const formula = String.raw`$$\mathcal{L}_{DPO} = \mathbb{E}_{x \sim \mathcal{D}} \pi_{ref}(y_{<t})$$`;
  const html = runPython('import sys, build_blog; print(build_blog.render(sys.stdin.read()))', formula);

  assert.match(html, /\$\$\\mathcal\{L\}_\{DPO\}/);
  assert.match(html, /\\pi_\{ref\}\(y_\{&lt;t\}\)/);
  assert.doesNotMatch(html, /<em>|<\/em>/);
});

test('generated articles expose a useful TOC, footnotes, and scrollable tables', () => {
  const body = [
    '# Fixture title',
    '',
    '## 第一节',
    '',
    '正文[^source]',
    '',
    '### $S^2$ Attention',
    '',
    '| 列一 | 列二 |',
    '| --- | --- |',
    '| $x_i$ | value |',
    '',
    '[^source]: [Primary source](https://example.com/paper)',
  ].join('\n');
  const meta = JSON.stringify({ title: 'Fixture title', date: '2026-08-25', category: 'tech', tags: [] });
  const pythonSource = 'import json,sys,build_blog; print(build_blog.gen(json.loads(sys.argv[1]), sys.stdin.read(), "fixture"))';
  const result = spawnSync(pythonBin, ['-c', pythonSource, meta], { cwd: root, encoding: 'utf8', input: body });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = result.stdout;

  assert.equal((html.match(/class="blog-detail-title"/g) || []).length, 1);
  assert.doesNotMatch(html, /<div class="blog-detail-body"><h1/,
    'the Markdown title must not duplicate the article header');
  assert.match(html, /class="article-toc"/);
  assert.match(html, /href="#第一节"/);
  assert.match(html, /class="footnote"/);
  assert.match(html, /class="table-scroll"/);
  assert.match(html, /\$x_i\$/);
  assert.doesNotMatch(html, /MATHPLACEHOLDER/i);
});

test('MathJax delimiters survive the Python and JavaScript escaping layers', () => {
  const html = runPython(
    'import build_blog; print(build_blog.gen({"title":"Fixture","tags":[]}, "## Section", "fixture"))',
  );

  assert.ok(html.includes(String.raw`inlineMath: [['$', '$'], ['\\(', '\\)']]`));
  assert.ok(html.includes(String.raw`displayMath: [['$$', '$$'], ['\\[', '\\]']]`));
});

test('reference sections contain real links instead of placeholders or dead prose entries', () => {
  const posts = readdirSync(path.join(root, '_posts')).filter((name) => name.endsWith('.md'));
  for (const name of posts) {
    const markdown = readFileSync(path.join(root, '_posts', name), 'utf8');
    const referenceSection = markdown.match(/^## (?:参考文献|参考资料)[\s\S]*$/m)?.[0];
    if (!referenceSection) continue;

    assert.doesNotMatch(referenceSection, /\{论文引用的主要参考文献\}|见原论文 References/, name);
    for (const line of referenceSection.split('\n')) {
      if (!/^\s*(?:-|\d+\.)\s+/.test(line)) continue;
      assert.match(line, /\[[^\]]+\]\(https:\/\/[^)]+\)/, `${name}: ${line}`);
    }
  }
});

test('blog pages use the accessible responsive sidebar controller', () => {
  const pages = [
    path.join(root, 'blog/index.html'),
    ...readdirSync(path.join(root, 'blog/posts'))
      .filter((name) => name.endsWith('.html'))
      .map((name) => path.join(root, 'blog/posts', name)),
  ];

  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /<button class="sidebar-toggle" id="sidebarToggle"/);
    assert.match(html, /<button class="sidebar-backdrop" id="sidebarBackdrop"/);
    assert.match(html, /<script src="[^"\n]*js\/sidebar\.js"><\/script>/);
    assert.doesNotMatch(html, /onclick="toggleSidebar\(\)"/);
  }
});
