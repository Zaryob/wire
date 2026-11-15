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

  window.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      filter.focus();
    }
  });
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
