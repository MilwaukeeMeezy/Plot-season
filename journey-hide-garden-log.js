// Hide the standalone Garden Log while the Garden Journey dashboard is open.
(function () {
  'use strict';

  const LAYER_ID = 'plot-season-journey-dashboard-layer';
  const HIDDEN_ATTR = 'data-journey-hidden-garden-log';

  function headingMatches(el) {
    if (!el || !el.textContent) return false;
    const text = el.textContent.trim().replace(/^[^A-Za-z]+/, '').trim();
    return /^Garden Log$/i.test(text);
  }

  function findGardenLogPanel() {
    const root = document.getElementById('root');
    if (!root) return null;

    const headings = Array.from(root.querySelectorAll('div,span,strong,h1,h2,h3,h4,h5')).filter(headingMatches);
    for (const heading of headings) {
      let node = heading;
      for (let i = 0; i < 7 && node && node.parentElement && node.parentElement !== root; i += 1) {
        const parent = node.parentElement;
        const rect = parent.getBoundingClientRect();
        const text = (parent.innerText || parent.textContent || '').trim();
        const looksLikePanel = rect.width >= 180 && rect.width <= 520 && rect.height >= 90 && text.length < 6000;
        if (looksLikePanel) return parent;
        node = parent;
      }
    }
    return null;
  }

  function hidePanel(panel) {
    if (!panel || panel.hasAttribute(HIDDEN_ATTR)) return;
    panel.setAttribute(HIDDEN_ATTR, panel.style.display || '');
    panel.style.setProperty('display', 'none', 'important');
  }

  function restorePanels() {
    document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((panel) => {
      const oldDisplay = panel.getAttribute(HIDDEN_ATTR) || '';
      panel.style.removeProperty('display');
      if (oldDisplay) panel.style.display = oldDisplay;
      panel.removeAttribute(HIDDEN_ATTR);
    });
  }

  function syncGardenLogVisibility() {
    const journeyOpen = !!document.getElementById(LAYER_ID);
    if (!journeyOpen) {
      restorePanels();
      return;
    }

    const panel = findGardenLogPanel();
    if (panel) hidePanel(panel);
  }

  function start() {
    syncGardenLogVisibility();
    const observer = new MutationObserver(syncGardenLogVisibility);
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(syncGardenLogVisibility, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
