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

test('plain-text excerpts remove Markdown, formulas, code blocks, tables, and hidden HTML', () => {
  const body = [
    '# Title to omit',
    '',
    '## Heading to omit',
    '',
    '这是**清晰说明**，包含 [参考资料](https://example.com) 和 `LoRA`。',
    '',
    '$$\\mathcal{L}_{DPO} = x_y$$',
    '',
    '```python',
    'print("skip code")',
    '```',
    '',
    '| Skip table | Value |',
    '| --- | --- |',
    '| A | B |',
    '',
    '<script>alert("skip script")</script>',
    '',
    '后续正文 &amp; 补充。',
  ].join('\n');
  const excerpt = runPython('import sys,build_blog; print(build_blog.plain_excerpt(sys.stdin.read()))', body).trim();
  assert.equal(excerpt, '这是清晰说明，包含 参考资料 和 LoRA。 后续正文 & 补充。');
});

test('fallback excerpts handle missing, empty, formula-only, and truncated formula metadata', () => {
  const source = 'import build_blog,json; print(json.dumps([build_blog.excerpt(meta, "正文说明。") for meta in [{}, {"excerpt":""}, {"excerpt":r"$$\\pi_{ref}"}, {"excerpt":r"$x_i$"}]], ensure_ascii=False))';
  assert.deepEqual(JSON.parse(runPython(source)), ['正文说明。', '正文说明。', '正文说明。', '正文说明。']);
  const short = runPython('import build_blog; print(build_blog.plain_excerpt("文" * 200))').trim();
  assert.equal(short.length, 151);
  assert.ok(short.endsWith('…'));
});

test('article metadata is escaped in titles, attributes, categories, tags, and description', () => {
  const meta = JSON.stringify({ title: '<img src=x onerror="bad">', date: '" onmouseover="bad', category: 'tech" onclick="bad', tags: ['<script>bad</script>'], excerpt: '普通摘要 " & < >' });
  const result = spawnSync(pythonBin, ['-c', 'import json,sys,build_blog; print(build_blog.gen(json.loads(sys.argv[1]), "正文", "fixture"))', meta], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<h1 class="blog-detail-title">&lt;img src=x onerror=&quot;bad&quot;&gt;<\/h1>/);
  assert.match(result.stdout, /<span class="tag-item">&lt;script&gt;bad&lt;\/script&gt;<\/span>/);
  assert.match(result.stdout, /class="blog-card-cat other"/);
  assert.doesNotMatch(result.stdout, /<img src=x|<script>bad|" onclick="bad|" onmouseover="bad/);
});

test('all committed cards have concise Chinese summaries without source syntax', () => {
  const posts = JSON.parse(readFileSync(path.join(root, 'blog/index.json'), 'utf8'));
  assert.equal(posts.length, readdirSync(path.join(root, '_posts')).filter(name => name.endsWith('.md')).length);
  for (const post of posts) {
    assert.match(post.excerpt, /[\u3400-\u9fff]/, post.slug);
    assert.ok(post.excerpt.length <= 150, post.slug);
    assert.doesNotMatch(post.excerpt, /\$|\\[a-z]+|\*\*|```|^[-#]|标题.*作者|<[^>]*>/, post.slug);
  }
});

test('frontmatter ends only at a full delimiter line, not dashes inside an excerpt', () => {
  const input = '---\r\ntitle: Fixture\r\nexcerpt: 表格 | --- | data\r\n---\r\n\r\n# Fixture\r\n\r\n正文。';
  const result = JSON.parse(runPython('import sys,json,build_blog; print(json.dumps(build_blog.parse_fm(sys.stdin.read()), ensure_ascii=False))', input));
  assert.equal(result[0].excerpt, '表格 | --- | data');
  assert.equal(result[1], '# Fixture\r\n\r\n正文。');
});


test('article category labels match the Chinese blog index', () => {
  const result = JSON.parse(runPython('import build_blog,json; print(json.dumps([build_blog.gen({"title":"Fixture","category":cat}, "正文", "fixture") for cat in ["tech", "essay", "other"]], ensure_ascii=False))'));
  for (const [index, label] of ['技术', '随笔', '其他'].entries()) {
    assert.match(result[index], new RegExp(`class="blog-card-cat [^"]+">${label}</span>`));
  }
});
