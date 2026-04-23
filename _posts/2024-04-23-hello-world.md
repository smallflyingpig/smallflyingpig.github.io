---
title: Hello World - 我的博客系统搭建
date: 2024-04-23
category: tech
tags: [博客, Web, Python]
excerpt: 这是我的第一篇博客，介绍了如何搭建一个基于 Markdown 的静态博客系统。
---

## 欢迎

这是我的第一篇技术博客。本文介绍如何搭建一个简单的静态博客系统。

## 技术方案

博客系统采用以下技术：

- **Markdown** 格式写作
- **Python** 构建脚本转换 HTML
- **纯静态** HTML，无需数据库
- **前端 JS** 实现筛选功能

## 目录结构

```
_posts/           # Markdown 源文件
blog/
  index.html      # 博客列表页
  posts/          # 生成的 HTML 文件
```

## 构建流程

运行 `python build_blog.py` 即可自动生成所有博客页面。

### 代码示例

```python
def build_blog():
    for md_file in POSTS_DIR.glob('*.md'):
        content = md_file.read_text()
        metadata, body = parse_frontmatter(content)
        html = generate_post_html(metadata, body)
        output_file.write_text(html)
```

## 总结

这是一个简单、可扩展的博客方案。后续可以添加更多功能：

1. 评论系统
2. RSS 订阅
3. 搜索功能

Stay tuned!
