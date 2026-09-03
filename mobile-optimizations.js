// Plot & Season — phone/tablet responsive and touch optimization layer.
(function () {
  'use strict';

  const PHONE_MAX = 720;
  const TABLET_MAX = 1180;
  let queued = false;

  const NAV_LABELS = new Set([
    'Yard', 'Plant Nursery', 'Garden Journey', 'Indoor Setup', 'Indoor Garden',
    'Garden Catalog', 'Plant Guide', 'Goals', 'Journal'
  ]);

  function updateDeviceClass() {
    const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('ps-phone', width <= PHONE_MAX);
    document.body.classList.toggle('ps-tablet', width > PHONE_MAX && width <= TABLET_MAX);
    document.body.classList.toggle('ps-mobile-layout', width <= TABLET_MAX);
    document.body.classList.toggle('ps-touch', !!coarse);
  }

  function textOf(el) {
    return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function findTopBar(root) {
    const title = Array.from(root.querySelectorAll('span,div')).find((el) => textOf(el) === 'Plot & Season');
    if (!title) return null;
    let node = title;
    for (let i = 0; i < 7 && node && node !== root; i += 1, node = node.parentElement) {
      const text = textOf(node);
      if (/Cash/.test(text) && /Save/.test(text) && (/Day speed/.test(text) || /Planning Phase/.test(text))) return node;
    }
    return null;
  }

  function markPrimaryNav(root) {
    const buttons = Array.from(root.querySelectorAll('button'));
    const candidates = buttons.filter((button) => NAV_LABELS.has(textOf(button)));
    const parents = new Map();
    candidates.forEach((button) => {
      const parent = button.parentElement;
      if (!parent) return;
      parents.set(parent, (parents.get(parent) || 0) + 1);
    });
    parents.forEach((count, parent) => {
      if (count >= 3) parent.classList.add('ps-primary-nav');
    });
  }

  function markTouchControls(root) {
    if (!document.body.classList.contains('ps-mobile-layout')) return;
    Array.from(root.querySelectorAll('button, [role="button"]')).forEach((el) => {
      const style = getComputedStyle(el);
      if (style.position === 'absolute' || style.position === 'fixed') return;
      const label = textOf(el);
      const rect = el.getBoundingClientRect();
      if (label.length >= 2 || rect.width >= 54) el.classList.add('ps-touch-control');
    });
  }

  function markDialogs(root) {
    Array.from(root.querySelectorAll('div')).forEach((el) => {
      const style = getComputedStyle(el);
      if (style.position !== 'fixed') return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 240 || rect.height < 100) return;
      if (el.querySelector('button')) el.classList.add('ps-modal');
    });
  }

  function markYardViewport(root) {
    const svgs = Array.from(root.querySelectorAll('svg[width][height]'));
    svgs.forEach((svg) => {
      const width = Number(svg.getAttribute('width') || 0);
      const height = Number(svg.getAttribute('height') || 0);
      if (width < 650 || height < 400) return;
      let node = svg.parentElement;
      for (let i = 0; i < 3 && node && node !== root; i += 1, node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.position === 'relative' || node.scrollWidth >= width) {
          node.classList.add('ps-yard-board');
          const shell = node.parentElement;
          if (shell) shell.classList.add('ps-yard-scroll-shell');
          break;
        }
      }
    });
  }

  function markHorizontalOverflow(root) {
    if (!document.body.classList.contains('ps-mobile-layout')) return;
    Array.from(root.querySelectorAll('table')).forEach((table) => {
      const parent = table.parentElement;
      if (parent && table.scrollWidth > parent.clientWidth + 4) parent.classList.add('ps-horizontal-scroll');
    });
  }

  function markJourney() {
    const layer = document.getElementById('plot-season-journey-dashboard-layer');
    if (layer) document.body.classList.add('ps-journey-open');
    else document.body.classList.remove('ps-journey-open');
  }

  function apply() {
    queued = false;
    if (!document.body) return;
    updateDeviceClass();
    const root = document.getElementById('root');
    if (!root) return;

    const topBar = findTopBar(root);
    if (topBar) topBar.classList.add('ps-topbar');
    markPrimaryNav(root);
    markTouchControls(root);
    markDialogs(root);
    markYardViewport(root);
    markHorizontalOverflow(root);
    markJourney();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function start() {
    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    setInterval(apply, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
