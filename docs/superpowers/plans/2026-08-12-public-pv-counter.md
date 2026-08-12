# Public PV Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display one shared bilingual site-wide page-view count using Busuanzi, with a fixed 10,000 presentation baseline and graceful failure behavior.

**Architecture:** Busuanzi writes its raw site PV into a hidden DOM node. A small local CommonJS/browser-compatible module validates that raw value, adds the fixed baseline exactly once, formats it, and reveals a separate localized display node; keeping raw and displayed values separate makes repeated DOM callbacks idempotent. Existing Baidu Analytics remains untouched.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Busuanzi 3.6.9, Node.js built-in test runner.

## Global Constraints

- Public value is `Busuanzi site PV + 10,000`.
- `index.html` and `index_ch.html` use one site-wide counter.
- Chinese copy is `累计访问 · {display PV} 次`; English copy is `Total visits · {display PV}`.
- The counter is hidden until a valid non-negative integer is available.
- Never expose an API key, cookie, local-storage identifier, loading label, zero fallback, or error message.
- Keep the existing Baidu Analytics integration and `paper/jiguo_cv.pdf` unchanged.

---

### Task 1: Idempotent PV presentation module

**Files:**
- Create: `js/pageviews.js`
- Create: `tests/pageviews.test.cjs`

**Interfaces:**
- Consumes: raw text from `#busuanzi_site_pv`, language from `document.documentElement.lang`, and optional `MutationObserver` constructor.
- Produces: `parsePageviews(rawText): number | null`, `formatDisplayPageviews(rawText, locale): string | null`, and `initPageviewCounter(document, Observer): { render: Function, disconnect: Function } | null`.

- [ ] **Step 1: Write failing unit tests**

Create `tests/pageviews.test.cjs` covering:

```js
test('adds the 10,000 baseline and formats the result', () => {
  assert.equal(formatDisplayPageviews('1', 'en-US'), '10,001');
});

test('rejects missing, negative, decimal, and non-numeric values', () => {
  for (const raw of ['', '-1', '1.5', 'Loading...', null]) {
    assert.equal(formatDisplayPageviews(raw, 'en-US'), null);
  }
});

test('repeated observer callbacks never apply the baseline twice', () => {
  const page = createFakePage('1', 'en');
  initPageviewCounter(page.document, page.Observer);
  page.trigger();
  page.trigger();
  assert.equal(page.display.textContent, '10,001');
  assert.equal(page.container.hidden, false);
});

test('invalid raw data leaves the counter hidden', () => {
  const page = createFakePage('Loading...', 'zh-CN');
  initPageviewCounter(page.document, page.Observer);
  page.trigger();
  assert.equal(page.container.hidden, true);
  assert.equal(page.display.textContent, '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/pageviews.test.cjs`

Expected: FAIL because `../js/pageviews.js` does not exist.

- [ ] **Step 3: Implement the minimal browser/CommonJS module**

Create `js/pageviews.js` with a UMD-style export and these behaviors:

```js
const DISPLAY_BASELINE = 10000;

function parsePageviews(rawText) {
  if (typeof rawText !== 'string' || !/^\d+$/.test(rawText.trim())) return null;
  const value = Number(rawText.trim());
  return Number.isSafeInteger(value) ? value : null;
}

function formatDisplayPageviews(rawText, locale) {
  const rawValue = parsePageviews(rawText);
  if (rawValue === null || !Number.isSafeInteger(rawValue + DISPLAY_BASELINE)) return null;
  return new Intl.NumberFormat(locale).format(rawValue + DISPLAY_BASELINE);
}
```

`initPageviewCounter` must read only from `#busuanzi_site_pv`, write only to `#site-pv-display`, reveal `#site-visit-counter` only after a valid render, choose `zh-CN` for a `zh*` document language and `en-US` otherwise, and observe only the hidden raw node. Each render recomputes from the raw node instead of the displayed value.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/pageviews.test.cjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the module and tests**

```bash
git add js/pageviews.js tests/pageviews.test.cjs
git commit -m "feat: add resilient PV display logic"
```

### Task 2: Bilingual page and footer integration

**Files:**
- Modify: `index.html:153-168`
- Modify: `index_ch.html:164-179`
- Modify: `css/main.css:265-269`
- Modify: `tests/homepage-content.test.cjs`

**Interfaces:**
- Consumes: `initPageviewCounter` browser auto-initialization from Task 1 and Busuanzi's `#busuanzi_site_pv` raw value.
- Produces: `#site-visit-counter`, `#site-pv-display`, and `#busuanzi_site_pv` nodes on both language pages.

- [ ] **Step 1: Add failing static integration tests**

Extend `tests/homepage-content.test.cjs` to assert both pages contain:

```js
for (const html of [english, chinese]) {
  assert.match(html, /id="site-visit-counter"[^>]*hidden/);
  assert.match(html, /id="site-pv-display"/);
  assert.match(html, /id="busuanzi_site_pv"[^>]*hidden/);
  assert.match(html, /cdn\.busuanzi\.cc\/busuanzi\/3\.6\.9\/busuanzi\.min\.js/);
  assert.match(html, /<script src="\.\/js\/pageviews\.js" defer><\/script>/);
}
assert.match(english, /Total visits ·/);
assert.match(chinese, /累计访问 ·/);
```

Also assert there is exactly one unchanged `hm.baidu.com` integration in each page.

- [ ] **Step 2: Run the full test suite to verify the new test fails**

Run: `node --test tests/*.test.cjs`

Expected: new counter integration assertions FAIL; existing tests PASS.

- [ ] **Step 3: Add the localized footer markup and deferred scripts**

After each `.footer-logos` element, add a hidden `.site-visit-counter` with localized copy, an empty visible output span, and a separate hidden raw Busuanzi span. Before `</body>`, load the pinned Busuanzi 3.6.9 script and then `./js/pageviews.js`, both with `defer`.

- [ ] **Step 4: Add compact responsive styles**

Add:

```css
.site-visit-counter {
  margin: -8px 0 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.site-visit-counter[hidden] { display: none; }
```

- [ ] **Step 5: Run all automated tests**

Run: `node --test tests/*.test.cjs`

Expected: all tests PASS, including sidebar, public wording, CV checksum, and PV behavior.

- [ ] **Step 6: Commit the integration**

```bash
git add index.html index_ch.html css/main.css tests/homepage-content.test.cjs
git commit -m "feat: show bilingual public PV counter"
```

### Task 3: Rendered verification and final scope audit

**Files:**
- Verify: `index.html`
- Verify: `index_ch.html`
- Verify: `css/main.css`
- Verify: `js/pageviews.js`

**Interfaces:**
- Consumes: completed counter integration from Tasks 1 and 2.
- Produces: evidence that the live-shaped static pages remain usable when the third-party service succeeds or fails.

- [ ] **Step 1: Start a local static server**

Run: `python3 -m http.server 8000 --bind 127.0.0.1`

Expected: server listens on `http://127.0.0.1:8000` without modifying tracked files.

- [ ] **Step 2: Verify desktop and mobile rendering**

Open both language pages at desktop and 390px-wide mobile viewports. Confirm the logo row remains centered, the counter appears as one muted line when a valid raw value is injected, and the layout has no horizontal overflow.

- [ ] **Step 3: Verify graceful failure**

Block or disable the Busuanzi request and reload both pages. Confirm the counter row remains hidden and navigation, content, and the existing Baidu script are unaffected.

- [ ] **Step 4: Run final automated and Git scope checks**

Run:

```bash
node --test tests/*.test.cjs
git diff --check
git status --short
git diff --stat HEAD~2..HEAD
```

Expected: tests PASS, no whitespace errors, and only the plan/spec, PV module/tests, bilingual HTML, and footer CSS are changed by this feature.
