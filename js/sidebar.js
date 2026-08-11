(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && root.document) {
    api.initSidebar(root.document, root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  function setSidebarOpen(sidebar, toggle, open) {
    sidebar.classList.toggle('mobile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  function initSidebar(documentRef, windowRef) {
    const sidebar = documentRef.getElementById('sidebar');
    const toggle = documentRef.getElementById('sidebarToggle');
    const backdrop = documentRef.getElementById('sidebarBackdrop');

    if (!sidebar || !toggle || !backdrop) return null;

    const mobileQuery = windowRef.matchMedia('(max-width: 768px)');
    const isMobile = () => mobileQuery.matches;
    const closeMobileSidebar = () => setSidebarOpen(sidebar, toggle, false);

    if (isMobile()) {
      closeMobileSidebar();
    } else {
      sidebar.classList.remove('mobile-open');
      toggle.setAttribute('aria-expanded', String(!sidebar.classList.contains('collapsed')));
    }

    toggle.addEventListener('click', () => {
      if (isMobile()) {
        setSidebarOpen(sidebar, toggle, !sidebar.classList.contains('mobile-open'));
        return;
      }

      const collapsed = sidebar.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });

    backdrop.addEventListener('click', closeMobileSidebar);
    documentRef.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isMobile()) closeMobileSidebar();
    });

    sidebar.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => {
        if (isMobile()) closeMobileSidebar();
      });
    });

    windowRef.addEventListener('resize', () => {
      if (isMobile()) {
        closeMobileSidebar();
      } else {
        sidebar.classList.remove('mobile-open');
        toggle.setAttribute('aria-expanded', String(!sidebar.classList.contains('collapsed')));
      }
    });

    return { closeMobileSidebar };
  }

  return { initSidebar, setSidebarOpen };
});
