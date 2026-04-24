#!/usr/bin/env python3
"""Blog build script with LaTeX and table support."""

import json, re
from pathlib import Path

try:
    import markdown
    from markdown.extensions.tables import TableExtension
    HAS_MD = True
except ImportError:
    HAS_MD = False
    print("Warning: markdown library not installed. Run: pip install markdown")

BASE = Path(__file__).parent
POSTS = BASE / "_posts"
BLOG = BASE / "blog"
OUT = BLOG / "posts"

def parse_fm(c):
    if not c.startswith('---'): return {}, c
    end = c.find('---', 3)
    if end == -1: return {}, c
    fm, body = c[3:end].strip(), c[end+3:].strip()
    m = {}
    for l in fm.split('\n'):
        if ':' in l:
            k, v = l.split(':', 1)
            k, v = k.strip(), v.strip()
            if v.startswith('['): v = [x.strip() for x in v[1:-1].split(',')]
            m[k] = v
    return m, body

def slug(f):
    n = f.stem
    return n[11:] if re.match(r'\d{4}-\d{2}-\d{2}-', n) else n

def render(b):
    if HAS_MD:
        # Use markdown with tables extension
        md = markdown.Markdown(extensions=[
            'fenced_code',
            'tables',
            'toc',
            'nl2br'
        ])
        html = md.convert(b)
        # Keep LaTeX formulas as-is (will be rendered by MathJax in browser)
        return html
    return '\n'.join(f'<p>{p}</p>' for p in b.split('\n\n') if p)

def gen(m, b, s):
    h = render(b)
    cat = m.get('category', 'other')
    tg = m.get('tags', [])
    if isinstance(tg, str): tg = [tg]
    tg_h = ' '.join(f'<span class="tag-item">{t}</span>' for t in tg)
    
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{m.get("title","Post")} - Jiguo Li</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../css/main.css">
<link rel="stylesheet" href="../../css/blog.css">
<link rel="shortcut icon" href="../../jiguo.ico">

<!-- MathJax for LaTeX rendering -->
<script>
MathJax = {{
  tex: {{
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true
  }},
  svg: {{
    fontCache: 'global'
  }}
}};
</script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>

<style>
/* Table styles for markdown tables */
.blog-detail-body table {{
  border-collapse: collapse;
  width: 100%;
  margin: 15px 0;
  font-size: 14px;
}}
.blog-detail-body table th,
.blog-detail-body table td {{
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}}
.blog-detail-body table th {{
  background-color: #f5f5f5;
  font-weight: 600;
}}
.blog-detail-body table tr:nth-child(even) {{
  background-color: #fafafa;
}}
.blog-detail-body table tr:hover {{
  background-color: #f0f0f0;
}}
</style>
</head>
<body>
<nav class="top-nav">
  <a href="../../index.html">Home</a>
  <a href="../index.html" class="active">Blog</a>
  <a href="../../index_ch.html">中文版</a>
</nav>
<div class="page-wrapper">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <img src="../../img/jiguo.png" alt="Jiguo Li" class="sidebar-photo">
      <h1 class="sidebar-name">Jiguo Li</h1>
      <p class="sidebar-title">Senior Engineer @ MeiTuan</p>
      <div class="profile-links">
        <a href="../../paper/jiguo_cv.pdf" class="profile-link">CV</a>
        <a href="https://github.com/smallflyingpig" class="profile-link">Github</a>
        <a href="https://scholar.google.com/citations?user=NfQeyQ4AAAAJ" class="profile-link">Scholar</a>
      </div>
    </div>
  </aside>
  <div class="sidebar-toggle" onclick="toggleSidebar()">☰</div>
  <div class="main-content-wrapper">
    <main class="main-content">
      <article class="blog-detail-content">
        <header class="blog-detail-header">
          <h1 class="blog-detail-title">{m.get("title","Untitled")}</h1>
          <div class="blog-card-meta"><span class="blog-card-date">{m.get("date","")}</span><span class="blog-card-cat {cat}">{cat}</span></div>
          <div class="blog-card-tags">{tg_h}</div>
        </header>
        <div class="blog-detail-body">{h}</div>
        <a href="../index.html" class="blog-back">← 返回博客列表</a>
      </article>
    </main>
  </div>
</div>
<script>function toggleSidebar(){{document.getElementById('sidebar').classList.toggle('collapsed');}}</script>
</body>
</html>'''

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    idx = []
    for f in sorted(POSTS.glob('*.md'), reverse=True):
        print(f"Processing: {f.name}")
        m, b = parse_fm(f.read_text(encoding='utf-8'))
        if not m: continue
        s = slug(f)
        (OUT / f"{s}.html").write_text(gen(m, b, s), encoding='utf-8')
        tg = m.get('tags', [])
        if isinstance(tg, str): tg = [tg]
        idx.append({
            'title': m.get('title', 'Untitled'),
            'date': m.get('date', ''),
            'category': m.get('category', 'other'),
            'tags': tg,
            'excerpt': m.get('excerpt', b[:150] + '...'),
            'slug': s
        })
    (BLOG / 'index.json').write_text(json.dumps(idx, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Built {len(idx)} posts")

if __name__ == '__main__':
    build()
