const assert = require('node:assert/strict');
const test = require('node:test');

const { initSidebar } = require('../js/sidebar.js');

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  toggle(value, force) {
    if (force === true) {
      this.add(value);
      return true;
    }
    if (force === false) {
      this.remove(value);
      return false;
    }
    if (this.contains(value)) {
      this.remove(value);
      return false;
    }
    this.add(value);
    return true;
  }

  contains(value) {
    return this.values.has(value);
  }
}

class FakeTarget {
  constructor() {
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ type, target: this, ...event });
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function createPage({ mobile }) {
  const sidebar = new FakeTarget();
  const toggle = new FakeTarget();
  const backdrop = new FakeTarget();
  const sectionLink = new FakeTarget();
  sidebar.querySelectorAll = (selector) => selector === 'a[href^="#"]' ? [sectionLink] : [];

  const documentTarget = new FakeTarget();
  documentTarget.getElementById = (id) => ({
    sidebar,
    sidebarToggle: toggle,
    sidebarBackdrop: backdrop,
  })[id] || null;

  const windowTarget = new FakeTarget();
  windowTarget.matchMedia = () => ({ matches: mobile });

  return {
    sidebar,
    toggle,
    backdrop,
    sectionLink,
    document: documentTarget,
    window: windowTarget,
    closeWith(target) {
      if (target === 'Escape') documentTarget.dispatch('keydown', { key: 'Escape' });
      if (target === 'backdrop') backdrop.dispatch('click');
      if (target === 'section') sectionLink.dispatch('click');
    },
  };
}

test('mobile sidebar starts closed and opens from the menu button', () => {
  const page = createPage({ mobile: true });
  initSidebar(page.document, page.window);

  assert.equal(page.sidebar.classList.contains('mobile-open'), false);
  assert.equal(page.toggle.getAttribute('aria-expanded'), 'false');

  page.toggle.dispatch('click');

  assert.equal(page.sidebar.classList.contains('mobile-open'), true);
  assert.equal(page.toggle.getAttribute('aria-expanded'), 'true');
});

test('Escape, backdrop, and section links close an open mobile sidebar', () => {
  for (const closeTarget of ['Escape', 'backdrop', 'section']) {
    const page = createPage({ mobile: true });
    initSidebar(page.document, page.window);
    page.toggle.dispatch('click');

    page.closeWith(closeTarget);

    assert.equal(page.sidebar.classList.contains('mobile-open'), false, closeTarget);
    assert.equal(page.toggle.getAttribute('aria-expanded'), 'false', closeTarget);
  }
});

test('desktop menu keeps the existing collapsed sidebar behavior', () => {
  const page = createPage({ mobile: false });
  initSidebar(page.document, page.window);

  assert.equal(page.toggle.getAttribute('aria-expanded'), 'true');

  page.toggle.dispatch('click');

  assert.equal(page.sidebar.classList.contains('collapsed'), true);
  assert.equal(page.toggle.getAttribute('aria-expanded'), 'false');
});
