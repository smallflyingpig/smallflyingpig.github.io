#!/usr/bin/env python3
"""Build the static blog with protected LaTeX and academic article markup."""

import html
import json
import re
from pathlib import Path

try:
    import markdown
    from markdown.extensions.toc import slugify_unicode
except ImportError as exc:
    raise SystemExit(
        "Python Markdown is required. Run: "
        "python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
    ) from exc

BASE = Path(__file__).parent
POSTS = BASE / "_posts"
BLOG = BASE / "blog"
OUT = BLOG / "posts"
MATH_PATTERN = re.compile(
    r"\$\$[\s\S]+?\$\$"
    r"|\\\[[\s\S]+?\\\]"
    r"|(?<!\\)\$(?!\$)[^\n]+?(?<!\\)\$"
    r"|\\\([^\n]+?\\\)"
)
FENCED_CODE_PATTERN = re.compile(r"(```[\s\S]*?```|~~~[\s\S]*?~~~)")

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

def strip_redundant_title(body, title):
    """Remove a leading Markdown H1 when the page header already shows it."""
    match = re.match(r"^\s*#\s+(.+?)\s*(?:\n|$)", body)
    if match and match.group(1).strip() == title.strip():
        return body[match.end():].lstrip()
    return body


def protect_math(body):
    """Hide TeX from Markdown emphasis/link parsing, excluding fenced code."""
    formulas = []

    def replace_formula(match):
        token = f"MATHPLACEHOLDERZ{len(formulas)}Z"
        formulas.append(html.escape(match.group(0), quote=False))
        return token

    parts = FENCED_CODE_PATTERN.split(body)
    for index in range(0, len(parts), 2):
        parts[index] = MATH_PATTERN.sub(replace_formula, parts[index])
    return ''.join(parts), formulas


def restore_math(rendered, formulas):
    for index, formula in enumerate(formulas):
        rendered = rendered.replace(f"MATHPLACEHOLDERZ{index}Z", formula)
        rendered = rendered.replace(f"mathplaceholderz{index}z", f"math-{index + 1}")
    return rendered


def render_document(body, title=""):
    body = strip_redundant_title(body, title)
    protected, formulas = protect_math(body)
    md = markdown.Markdown(
        extensions=['fenced_code', 'tables', 'toc', 'nl2br', 'footnotes', 'sane_lists'],
        extension_configs={
            'toc': {
                'slugify': slugify_unicode,
                'permalink': True,
                'permalink_title': '本节链接',
                'toc_depth': '2-3',
            }
        },
    )
    rendered = restore_math(md.convert(protected), formulas)
    toc = restore_math(md.toc, formulas)
    rendered = re.sub(
        r'(<table>[\s\S]*?</table>)',
        r'<div class="table-scroll" tabindex="0">\1</div>',
        rendered,
    )
    return rendered, toc


def render(body):
    """Render Markdown body; kept as a small public seam for regression tests."""
    return render_document(body)[0]

def gen(m, b, s):
    h, toc = render_document(b, m.get('title', ''))
    cat = m.get('category', 'other')
    tg = m.get('tags', [])
    if isinstance(tg, str): tg = [tg]
    tg_h = ' '.join(f'<span class="tag-item">{t}</span>' for t in tg)
    toc_h = (
        f'<nav class="article-toc" aria-label="文章目录">'
        f'<div class="article-toc-label">本文目录</div>{toc}</nav>'
        if toc else ''
    )
    
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{m.get("title","Post")} - Jiguo Li</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../css/main.css">
<link rel="stylesheet" href="../../css/blog.css">
<link rel="shortcut icon" href="../../jiguo.ico">

<!-- MathJax for LaTeX rendering -->
<script>
MathJax = {{
  tex: {{
    inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
    displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
    processEscapes: true,
    processEnvironments: true
  }},
  svg: {{
    fontCache: 'global'
  }}
}};
</script>
<script id="MathJax-script" defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body class="blog-post-page">
<nav class="top-nav">
  <div class="primary-nav" aria-label="主导航">
    <a href="../../index_ch.html">主页</a>
    <a href="../index.html" class="active">博客</a>
  </div>
  <div class="language-switch" aria-label="语言切换">
    <span class="language-option active" aria-current="true">中文</span>
    <a class="language-option" href="../../index.html" hreflang="en">EN</a>
  </div>
</nav>
<div class="page-wrapper">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <img src="../../img/jiguo.png" alt="Jiguo Li" class="sidebar-photo">
      <h1 class="sidebar-name">Jiguo Li</h1>
      <p class="sidebar-title">Senior Engineer @ MeiTuan</p>
      <div class="profile-links">
        <a href="https://github.com/smallflyingpig" class="profile-link">Github</a>
        <a href="https://scholar.google.com/citations?user=NfQeyQ4AAAAJ" class="profile-link">Scholar</a>
      </div>
    </div>
  </aside>
  <button class="sidebar-toggle" id="sidebarToggle" type="button"
          aria-controls="sidebar" aria-expanded="false" aria-label="打开页面导航">☰</button>
  <button class="sidebar-backdrop" id="sidebarBackdrop" type="button"
          aria-label="关闭页面导航" tabindex="-1"></button>
  <div class="main-content-wrapper">
    <main class="main-content">
      <article class="blog-detail-content">
        <header class="blog-detail-header">
          <h1 class="blog-detail-title">{m.get("title","Untitled")}</h1>
          <div class="blog-card-meta"><span class="blog-card-date">{m.get("date","")}</span><span class="blog-card-cat {cat}">{cat}</span></div>
          <div class="blog-card-tags">{tg_h}</div>
        </header>
        {toc_h}
        <div class="math-render-warning" id="mathRenderWarning" role="status">公式组件加载失败，请刷新页面后重试。</div>
        <div class="blog-detail-body">{h}</div>
        <a href="../index.html" class="blog-back">← 返回博客列表</a>
      </article>
    </main>
  </div>
</div>
<script>
document.getElementById('MathJax-script').addEventListener('error', function() {{
  document.getElementById('mathRenderWarning').classList.add('visible');
}});
</script>
<script src="../../js/sidebar.js"></script>
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
