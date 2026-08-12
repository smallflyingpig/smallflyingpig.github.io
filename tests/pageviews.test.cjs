const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatDisplayPageviews,
  initPageviewCounter,
  parsePageviews,
} = require('../js/pageviews.js');

class FakeNode {
  constructor(textContent = '') {
    this.textContent = textContent;
    this.hidden = true;
  }
}

class FakeObserver {
  constructor(callback) {
    this.callback = callback;
    FakeObserver.instance = this;
  }

  observe() {}

  disconnect() {}
}

function createFakePage(rawValue, language) {
  const container = new FakeNode();
  const raw = new FakeNode(rawValue);
  const display = new FakeNode();
  const nodes = {
    'site-visit-counter': container,
    busuanzi_site_pv: raw,
    'site-pv-display': display,
  };

  return {
    container,
    display,
    document: {
      documentElement: { lang: language },
      getElementById: (id) => nodes[id] || null,
    },
    raw,
    trigger() {
      FakeObserver.instance.callback();
    },
  };
}

test('adds the 10,000 baseline and formats the result', () => {
  assert.equal(formatDisplayPageviews('1', 'en-US'), '10,001');
  assert.equal(formatDisplayPageviews('12345', 'zh-CN'), '22,345');
});

test('parses only non-negative safe integer PV values', () => {
  assert.equal(parsePageviews('0'), 0);
  assert.equal(parsePageviews(' 12 '), 12);

  for (const raw of ['', '-1', '1.5', 'Loading...', null, undefined]) {
    assert.equal(parsePageviews(raw), null);
  }
});

test('repeated observer callbacks never apply the baseline twice', () => {
  const page = createFakePage('1', 'en');
  initPageviewCounter(page.document, FakeObserver);

  page.trigger();
  page.trigger();

  assert.equal(page.display.textContent, '10,001');
  assert.equal(page.container.hidden, false);
});

test('invalid raw data leaves the counter hidden', () => {
  const page = createFakePage('Loading...', 'zh-CN');
  initPageviewCounter(page.document, FakeObserver);

  page.trigger();

  assert.equal(page.container.hidden, true);
  assert.equal(page.display.textContent, '');
});
