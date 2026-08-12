(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && root.document) {
    api.initPageviewCounter(root.document, root.MutationObserver);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  const DISPLAY_BASELINE = 10000;

  function parsePageviews(rawText) {
    if (typeof rawText !== 'string' || !/^\d+$/.test(rawText.trim())) return null;

    const value = Number(rawText.trim());
    return Number.isSafeInteger(value) ? value : null;
  }

  function formatDisplayPageviews(rawText, locale) {
    const rawValue = parsePageviews(rawText);
    if (rawValue === null) return null;

    const displayedValue = rawValue + DISPLAY_BASELINE;
    if (!Number.isSafeInteger(displayedValue)) return null;

    return new Intl.NumberFormat(locale).format(displayedValue);
  }

  function initPageviewCounter(documentRef, Observer) {
    const container = documentRef.getElementById('site-visit-counter');
    const raw = documentRef.getElementById('busuanzi_site_pv');
    const display = documentRef.getElementById('site-pv-display');

    if (!container || !raw || !display) return null;

    const locale = documentRef.documentElement.lang.startsWith('zh') ? 'zh-CN' : 'en-US';
    const render = () => {
      const formattedValue = formatDisplayPageviews(raw.textContent, locale);
      if (formattedValue === null) return false;

      display.textContent = formattedValue;
      container.hidden = false;
      return true;
    };

    render();

    const observer = typeof Observer === 'function' ? new Observer(render) : null;
    if (observer) observer.observe(raw, { childList: true, characterData: true, subtree: true });

    return {
      disconnect() {
        if (observer) observer.disconnect();
      },
      render,
    };
  }

  return { formatDisplayPageviews, initPageviewCounter, parsePageviews };
});
