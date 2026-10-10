(function () {
  'use strict';

  const categoryLabels = { tech: '技术', essay: '随笔', other: '其他' };

  function normalizePosts(data) {
    if (!Array.isArray(data)) throw new Error('Invalid blog index');
    return data.map(function (post) {
      if (!post || typeof post.title !== 'string' || typeof post.slug !== 'string' ||
          !post.slug.trim() || /[/\\\u0000-\u001f]/.test(post.slug) ||
          post.slug === '.' || post.slug === '..' ||
          typeof post.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
        throw new Error('Invalid blog post');
      }
      return {
        title: post.title,
        slug: post.slug,
        date: post.date,
        category: Object.hasOwn(categoryLabels, post.category) ? post.category : 'other',
        tags: Array.isArray(post.tags) ? [...new Set(post.tags.filter(function (tag) {
          return typeof tag === 'string' && tag.trim();
        }))] : [],
        excerpt: typeof post.excerpt === 'string' ? post.excerpt : '',
      };
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  }

  function createElement(doc, tag, className, text) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createCard(doc, post) {
    // Native links support keyboard activation, browser status, and new tabs.
    // User-authored text is always assigned as text, never parsed as HTML.
    const card = createElement(doc, 'a', 'blog-card');
    card.setAttribute('href', 'posts/' + encodeURIComponent(post.slug) + '.html');
    const title = createElement(doc, 'h2', 'blog-card-title', post.title);
    const meta = createElement(doc, 'div', 'blog-card-meta');
    const date = createElement(doc, 'time', 'blog-card-date', post.date);
    date.setAttribute('datetime', post.date);
    meta.append(date, createElement(doc, 'span', 'blog-card-cat ' + post.category, categoryLabels[post.category]));
    const tags = createElement(doc, 'div', 'blog-card-tags');
    post.tags.forEach(function (tag) {
      tags.append(createElement(doc, 'span', 'tag-item', tag));
    });
    card.append(title, meta, tags, createElement(doc, 'p', 'blog-card-excerpt', post.excerpt));
    return card;
  }

  function initBlog(doc, fetchIndex) {
    const grid = doc.getElementById('blogGrid');
    if (!grid) return null;
    const status = doc.getElementById('postStatus');
    const noResults = doc.getElementById('noResults');
    const retry = doc.getElementById('retryLoad');
    const clear = doc.getElementById('clearFilters');
    const heading = doc.getElementById('pageTitle');
    const categoryButtons = [...doc.getElementById('catFilter').querySelectorAll('button')];
    const tagFilter = doc.getElementById('tagFilter');
    const yearFilter = doc.getElementById('yearFilter');
    let posts = [];
    let category = 'all';
    let tag = null;
    let year = null;
    let loading = false;
    let tagButtons = [];
    let yearButtons = [];

    function setPressed(button, pressed) {
      button.setAttribute('aria-pressed', String(pressed));
      button.classList.toggle('active', pressed);
    }

    function render() {
      const filtered = posts.filter(function (post) {
        return (category === 'all' || post.category === category) &&
          (tag === null || post.tags.includes(tag)) &&
          (year === null || post.date.startsWith(year));
      });
      grid.replaceChildren(...filtered.map(function (post) { return createCard(doc, post); }));
      categoryButtons.forEach(function (button) {
        setPressed(button, button.dataset.cat === category);
      });
      tagButtons.forEach(function (button) { setPressed(button, button.dataset.tag === tag); });
      yearButtons.forEach(function (button) { setPressed(button, button.dataset.year === year); });
      const active = category !== 'all' || tag !== null || year !== null;
      clear.disabled = !active;
      const conditions = [];
      if (category !== 'all') conditions.push(categoryLabels[category]);
      if (tag !== null) conditions.push('标签：' + tag);
      if (year !== null) conditions.push(year + ' 年');
      status.textContent = active
        ? '找到 ' + filtered.length + ' 篇文章 · ' + conditions.join(' / ')
        : '共 ' + posts.length + ' 篇文章';
      noResults.hidden = filtered.length > 0;
      noResults.textContent = posts.length
        ? '没有符合当前筛选条件的文章。请清除筛选后重试。'
        : '还没有发布文章，欢迎之后再来看看。';
    }

    function buildFilters() {
      const tags = new Map();
      const years = new Map();
      posts.forEach(function (post) {
        post.tags.forEach(function (value) { tags.set(value, (tags.get(value) || 0) + 1); });
        const value = post.date.slice(0, 4);
        years.set(value, (years.get(value) || 0) + 1);
      });
      tagButtons = [...tags].sort(function (a, b) {
        return b[1] - a[1] || a[0].localeCompare(b[0]);
      }).map(function (entry) {
        const button = createElement(doc, 'button', 'filter-tag', entry[0] + ' (' + entry[1] + ')');
        button.type = 'button';
        button.dataset.tag = entry[0];
        button.addEventListener('click', function () {
          tag = tag === entry[0] ? null : entry[0];
          render();
        });
        return button;
      });
      tagFilter.replaceChildren(...tagButtons);
      yearButtons = [...years].sort(function (a, b) { return b[0].localeCompare(a[0]); }).map(function (entry) {
        const button = createElement(doc, 'button', '', entry[0] + ' (' + entry[1] + ')');
        button.type = 'button';
        button.dataset.year = entry[0];
        button.addEventListener('click', function () {
          year = year === entry[0] ? null : entry[0];
          render();
        });
        return button;
      });
      yearFilter.replaceChildren(...yearButtons.map(function (button) {
        const item = doc.createElement('li');
        item.append(button);
        return item;
      }));
    }

    function setLoading(value) {
      loading = value;
      grid.setAttribute('aria-busy', String(value));
      categoryButtons.concat(tagButtons, yearButtons).forEach(function (button) {
        button.disabled = value || !posts.length;
      });
      retry.disabled = value;
      if (value) clear.disabled = true;
    }

    async function load(moveFocus) {
      if (loading) return;
      setLoading(true);
      noResults.hidden = true;
      status.textContent = '正在加载文章…';
      try {
        const response = await fetchIndex('index.json');
        if (!response.ok) throw new Error('Blog index request failed');
        posts = normalizePosts(await response.json());
        buildFilters();
        render();
        retry.hidden = true;
        if (moveFocus) heading.focus();
      } catch (error) {
        status.textContent = '文章列表加载失败。请检查网络后重新加载。';
        retry.hidden = false;
      } finally {
        setLoading(false);
      }
    }

    categoryButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        category = button.dataset.cat;
        render();
      });
    });
    clear.addEventListener('click', function () {
      category = 'all';
      tag = null;
      year = null;
      render();
      heading.focus();
    });
    retry.addEventListener('click', function () { load(true); });
    heading.setAttribute('tabindex', '-1');
    const ready = load(false);
    return { ready, reload: function () { return load(true); } };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initBlog, normalizePosts, createCard };
  }
  if (typeof document !== 'undefined') {
    initBlog(document, function (url) { return window.fetch(url); });
  }
})();
