// Field highlighting on protocol pages and the filter on the protocol list.
const related = key => document.querySelectorAll(`[data-field="${key}"], [data-fields~="${key}"]`);
let pinned = null;
const show = key => {
  document.querySelectorAll('.is-active').forEach(node => node.classList.remove('is-active'));
  if (key) related(key).forEach(node => node.classList.add('is-active'));
};
const keysOf = node => (node.dataset.field ? [node.dataset.field] : (node.dataset.fields || '').split(' ').filter(Boolean));
document.querySelectorAll('[data-field], [data-fields]').forEach(node => {
  const keys = keysOf(node);
  if (!keys.length) return;
  // A byte shared by several narrow fields highlights the first of them.
  const key = keys[0];
  node.addEventListener('pointerenter', () => show(key));
  node.addEventListener('pointerleave', () => show(pinned));
  node.addEventListener('focus', () => show(key));
  node.addEventListener('blur', () => show(pinned));
  node.addEventListener('click', e => {
    if (node.classList.contains('bit-cell')) {
      e.preventDefault();
    }
    pinned = pinned === key ? null : key;
    show(pinned);
    if (pinned) {
      history.replaceState(null, '', `#f-${pinned}`);
    } else {
      history.replaceState(null, '', location.pathname);
    }
  });
});
const fromHash = () => { const key = location.hash.startsWith('#f-') ? location.hash.slice(3) : null; if (key) { pinned = key; show(key); } };
addEventListener('hashchange', fromHash);
fromHash();

const filter = document.getElementById('protocol-filter');
if (filter) {
  const cards = [...document.querySelectorAll('.protocol-card')];
  const status = document.getElementById('filter-status');
  filter.addEventListener('input', () => {
    const terms = filter.value.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
    let visible = 0;
    if (terms.length) {
      document.body.classList.add('is-searching');
    } else {
      document.body.classList.remove('is-searching');
    }
    for (const card of cards) {
      const match = terms.every(term => card.dataset.search.includes(term));
      card.hidden = !match;
      if (match) visible += 1;
    }
    document.querySelectorAll('.layer').forEach(layer => { layer.hidden = !layer.querySelector('.protocol-card:not([hidden])'); });
    status.textContent = terms.length ? `${visible} protokol eşleşti.` : '';
  });

  // On this page "/" jumps to the protocol filter. The capture phase runs before the shared header's
  // document listener, which skips events that are already handled; Ctrl/Cmd+K still opens the header search.
  window.addEventListener('keydown', e => {
    const target = e.target;
    const editing = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
    if (e.key !== '/' || editing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    filter.focus();
  }, true);
}

// Explain the independently scrollable diagram only when it overflows.
for (const panel of document.querySelectorAll('.bits-scroll')) {
  const hint = document.getElementById(panel.getAttribute('aria-describedby'));
  if (!hint) continue;
  const update = () => { hint.hidden = panel.scrollWidth <= panel.clientWidth + 1; };
  const observer = new ResizeObserver(update);
  observer.observe(panel);
  update();
}

// The field table's scroll region is a Tab stop only while it actually scrolls sideways; on phones the rows
// become cards that fit, and a stop that scrolls nothing only lengthens the tab order. Without script it stays focusable.
for (const region of document.querySelectorAll('.table-scroll[tabindex="0"]')) {
  if (!region.querySelector(':scope > table.fields--cards')) continue;
  const update = () => {
    if (region.scrollWidth > region.clientWidth + 1) region.setAttribute('tabindex', '0');
    else if (document.activeElement !== region) region.removeAttribute('tabindex');
  };
  const observer = new ResizeObserver(update);
  observer.observe(region);
  observer.observe(region.firstElementChild);
  update();
}
