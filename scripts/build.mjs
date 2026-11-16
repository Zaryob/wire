import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { root, bibliography, rfcEntry, verifyLayout, loadProtocols } from '../src/sources.mjs';
import { encodeExample } from '../src/encode.mjs';

const out = path.join(root, '_site');
const base = (process.env.SITE_BASEURL ?? '/wire').replace(/\/+$/, '');
const origin = 'https://zaryob.github.io';
const e = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const url = id => `${base}/${id ? `${id}/` : ''}`;
const asset = name => `${base}/${name}`;
const hex = (value, digits = 2) => value.toString(16).padStart(digits, '0');
const layerKey = layer => {
  switch (layer) {
    case 'Bağlantı': return 'link';
    case 'Ağ': return 'network';
    case 'Taşıma':
    case 'İletim': return 'transport';
    case 'Uygulama': return 'application';
    default: return 'default';
  }
};

const protocols = await loadProtocols();
const byId = new Map(protocols.map(protocol => [protocol.id, protocol]));
const projects = JSON.parse(await readFile(path.join(root, 'public/console-projects.json'), 'utf8'));

// Encode examples; a payload may be another protocol's whole example packet.
const encoded = new Map();
function example(id) {
  if (encoded.has(id)) return encoded.get(id);
  const protocol = byId.get(id);
  const from = protocol.example?.payloadFrom;
  const source = from ? { ...protocol, example: { ...protocol.example, payload: example(from).bytes.map(byte => hex(byte)).join('') } } : protocol;
  const result = encodeExample(source);
  encoded.set(id, result);
  return result;
}

const checks = new Map();
for (const protocol of protocols) {
  const check = await verifyLayout(protocol);
  if (!check.ok) throw new Error(`${protocol.id}: field sizes ${check.expected} do not match RFC ${protocol.layout.rfc} (${check.found})`);
  checks.set(protocol.id, check);
  for (const number of protocol.refs) rfcEntry(number);
  for (const field of protocol.fields) if (!protocol.refs.includes(field.ref.rfc)) throw new Error(`${protocol.id}.${field.key}: RFC ${field.ref.rfc} is not in the page's references`);
}

const refText = ref => `RFC ${ref.rfc}${ref.section ? ` §${ref.section}` : ref.label ? `, “${ref.label}”` : ''}`;
const refUrl = ref => `${rfcEntry(ref.rfc).url}${ref.section ? `#section-${ref.section}` : ''}`;
const refLink = ref => `<a class="rfc-ref" href="${refUrl(ref)}">${e(refText(ref))}</a>`;
const citation = entry => `${e(entry.authors.join(', '))}, “${e(entry.title)}”, RFC ${entry.number}, ${e(entry.date)}.`;

function header(current) {
  const chevron = '<svg class="console-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const menu = '<svg class="console-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const search = `<svg class="console-icon" aria-hidden="true" focusable="false"><use href="${asset('assets/console/site.svg#search')}"></use></svg>`;

  return `<a class="skip-link" href="#main">İçeriğe geç</a>
<header class="console-header"><div class="console-header__inner">
  <div class="console-identity"><a class="console-brand" href="${origin}/" aria-label="Zaryob ana sayfa">zaryob</a><span class="console-prompt-separator" aria-hidden="true">:</span>
    <details class="console-projects" data-console-projects><summary role="button" aria-label="Proje değiştir" aria-controls="console-project-menu"><span class="console-project-path"><span class="console-prompt-separator">~/</span>wire</span><span class="console-prompt-dollar" aria-hidden="true">$</span><span class="console-prompt-cursor" aria-hidden="true"></span>${chevron}</summary><nav class="console-project-menu" id="console-project-menu" aria-label="Zaryob projeleri">
      ${projects.map(project => `<a href="${project.key === 'wire' ? url('') : `${origin}${e(project.path)}`}"${project.key === 'wire' ? ' aria-current="location"' : ''}><span>${e(project.title)}</span><small>${e(project.prompt)}</small></a>`).join('\n      ')}
    </nav></details>
  </div>
  <div class="console-header-actions">
    <button class="console-search-compact" type="button" data-console-search-compact aria-haspopup="dialog" aria-label="Zaryob içeriklerinde ara">${search}</button>
    <button type="button" class="console-menu" data-console-menu aria-label="Menüyü aç" aria-controls="console-navigation" aria-expanded="false">${menu}</button>
  </div>
  <nav class="console-nav" id="console-navigation" aria-label="Zaryob gezinme">
    <div class="console-tools">
      <button class="console-search-open" type="button" data-console-search data-suite-root="${origin}/" data-wire-root="${url('')}" aria-haspopup="dialog" aria-label="Zaryob içeriklerinde ara">
        ${search}
        <span>Ara</span>${current === '' ? '' : '<kbd>/</kbd>'}
      </button>
      <label class="console-theme"><span data-i18n="Theme">Tema</span><select data-console-theme aria-label="Renk teması"><option value="system" data-i18n="System">Sistem</option><option value="dark" data-i18n="Dark">Koyu</option><option value="light" data-i18n="Light">Açık</option></select></label>
      <span class="console-meta" lang="tr">İçerik: Türkçe</span>
    </div>
  </nav>
</div></header>`;
}

function topbar(current, title = '', layer = '') {
  const gridIcon = '<svg class="button-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
  const homeIcon = '<svg class="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  const bookIcon = '<svg class="button-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

  let breadcrumbsHtml = `<a href="${url('')}" class="home-crumb">${homeIcon}<span>Ana sayfa</span></a>`;
  if (current) {
    if (layer) {
      breadcrumbsHtml += `<span class="crumb-sep" aria-hidden="true">/</span><span>${e(layer)}</span>`;
    }
    breadcrumbsHtml += `<span class="crumb-sep" aria-hidden="true">/</span><strong>${e(title || current)}</strong>`;
  }

  return `<header class="topbar">
  <div class="topbar-left">
    <a href="${url('')}" class="button primary board-picker-btn">
      ${gridIcon}
      <span>Protokoller</span>
      <span class="count">${protocols.length}</span>
      <span class="console-sr-only"> — protokol kütüphanesi</span>
    </a>
    <div class="breadcrumbs" aria-label="Konum">
      ${breadcrumbsHtml}
    </div>
  </div>
  <div class="topbar-right">
    <a href="${url('kilavuz')}" class="button secondary help-btn">
      ${bookIcon}
      <span>Kılavuz</span>
      <span class="console-sr-only"> — nasıl kullanılır ve RFC kılavuzu</span>
      <span aria-hidden="true">↗</span>
    </a>
  </div>
</header>`;
}

function suiteFooter() {
  const column = (title, label, links, listClass = '') => `<nav class="suite-footer__col" aria-label="${e(label)}"><p class="suite-footer__title">${title}</p><ul${listClass ? ` class="${listClass}"` : ''}>${links.map(link => `<li>${link}</li>`).join('')}</ul></nav>`;
  const site = column('~/wire/', 'Wire', [`<a href="${url('kilavuz')}">Kılavuz</a>`, `<a href="${url('kaynakca')}">Kaynakça</a>`, `<a href="${url('yontem')}">Yöntem</a>`, `<a href="${asset('lisanslar/')}">Lisanslar</a>`]);
  const suite = column('~/projeler/', 'Zaryob projeleri', projects.filter(project => project.key !== 'home').map(project => `<a href="${project.key === 'wire' ? url('') : `${origin}${e(project.path)}`}" aria-label="${e(project.title)}"${project.key === 'wire' ? ' aria-current="location"' : ''}>${e(project.prompt)}/</a>`), 'console-suite__list');
  const contact = column('~/iletişim', 'Sosyal bağlantılar', ['<a href="https://github.com/Zaryob" rel="me">GitHub <span aria-hidden="true">↗</span></a>', '<a href="https://linkedin.com/in/suleyman_poyraz" rel="me">LinkedIn <span aria-hidden="true">↗</span></a>', '<a href="https://medium.com/@zaryob" rel="me">Medium <span aria-hidden="true">↗</span></a>', '<a href="mailto:zaryob.dev@gmail.com">E-posta</a>']);
  return `<footer class="suite-footer" id="site-footer"><div class="suite-footer__inner"><p class="suite-footer__prompt" aria-hidden="true"><span class="suite-footer__host">zaryob</span>:~/wire $ <span class="suite-footer__cmd">ls -F</span></p><div class="suite-footer__cols">${site}${suite}${contact}</div><div class="suite-footer__legal"><span><span aria-hidden="true"># </span>© Süleyman Poyraz · Ağ protokolü başlıkları, bit bit.</span><span>Her alan bir RFC’ye dayanır.<a class="suite-footer__top" href="#main"><span aria-hidden="true">↑ </span>Başa dön</a></span></div></div></footer>`;
}

function page({ id, title, description, body, hero = '', indexable = true, className = '', pageTitle = '', layer = '' }) {
  const fullTitle = id === '' ? 'Wire · Ağ protokolü başlıkları, bit bit' : `${title} · Wire`;
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f5f3ed" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#171a1f" media="(prefers-color-scheme: dark)"><meta name="description" content="${e(description)}"><title>${e(fullTitle)}</title><link rel="icon" type="image/svg+xml" href="${asset('favicon.svg')}">${indexable ? `<link rel="canonical" href="${origin}${url(id)}">` : '<meta name="robots" content="noindex">'}<meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}"><meta property="og:site_name" content="wire"><meta property="og:locale" content="tr_TR"><meta property="og:type" content="website"><script src="${asset('assets/console/language.js')}"></script><script src="${asset('assets/console/i18n.js')}"></script><script src="${asset('assets/console/theme.js')}"></script><link rel="stylesheet" href="${asset('assets/console/theme.css')}"><link rel="stylesheet" href="${asset('style.css')}"><script type="module" src="${asset('app.js')}"></script></head>
<body class="console-site wire-site${className ? ` ${className}` : ''}">${header(id)}
${topbar(id, pageTitle || title, layer)}
<main id="main" tabindex="-1">${hero}<div class="wire-main">${body}</div></main>
${suiteFooter()}
</body></html>`;
}

/** Diagram cells: one per field per row; whole-row multiples collapse to one row. */
function diagram(protocol) {
  const cols = protocol.rowBits;
  const cells = [];
  let offset = 0;
  for (const field of protocol.fields) {
    if (!Number.isInteger(field.bits)) { cells.push({ field, span: cols, label: `${field.name} (değişken)`, variable: true }); continue; }
    if (field.bits > cols && offset % cols === 0 && field.bits % cols === 0) {
      cells.push({ field, span: cols, label: `${field.name} (${field.bits} bit)` });
    } else {
      let left = field.bits;
      let at = offset;
      let first = true;
      while (left > 0) {
        const span = Math.min(left, cols - (at % cols));
        cells.push({ field, span, label: first ? field.name : '…' });
        left -= span; at += span; first = false;
      }
    }
    offset += field.bits;
  }

  const byteCount = cols / 8;
  const byteBands = Array.from({ length: byteCount }, (_, i) => {
    const startBit = i * 8;
    const endBit = startBit + 7;
    return `<div class="bits-byte-band" style="grid-column:span 8" title="${i + 1}. Sekizli (Byte ${i}): Bit ${startBit}–${endBit}"><span>Sekizli ${i} <small>(Bit ${startBit}–${endBit})</small></span></div>`;
  }).join('');

  const bitNumbers = Array.from({ length: cols }, (_, bit) => {
    const isByteBoundary = bit % 8 === 0;
    const byteIndex = Math.floor(bit / 8);
    return `<span class="bits-col-num${isByteBoundary ? ' bits-col-num--boundary' : ''}" title="Bit ${bit} (${byteIndex}. Sekizli, ${bit % 8}. bit)">${bit}</span>`;
  }).join('');

  const cadenceOf = field => {
    const fieldIdx = protocol.fields.indexOf(field);
    return fieldIdx >= 0 ? (fieldIdx % 2 === 0 ? 'bit-cell--even' : 'bit-cell--odd') : '';
  };
  const split = cols === 32 ? splitDiagram(protocol, cadenceOf) : '';

  return `<div class="bits-diagram-wrap${split ? ' bits-diagram-wrap--splittable' : ''}">
  <div class="bits-header">
    <div class="bits-header__info">
      <span class="bits-header__badge">Bit Cetveli</span>
      <span class="bits-header__title">${cols} bitlik satır (${byteCount} sekizli / bayt)</span>${split ? `
      <span class="bits-header__title bits-header__title--split">${cols} bitlik satır, iki 16 bitlik yarıda (bit 0–15, sonra 16–31)</span>` : ''}
    </div>
    <span class="bits-header__order" title="Ağ Bayt Sıralaması (Network Byte Order): En anlamlı bit (MSB) daima en soldadır (Bit 0)">Ağ Sırası: En anlamlı bit (Bit 0) en solda</span>
  </div>
  <p class="bits-scroll-hint" id="bits-scroll-hint" hidden>Şemanın tamamı için yatay kaydırın; klavyede sağ ve sol ok tuşlarını kullanabilirsiniz.</p>
  <div class="bits-scroll" tabindex="0" role="region" aria-describedby="bits-scroll-hint" aria-label="${e(protocol.title)} bit şeması">
    <div class="bits" style="--cols:${cols}">
      <div class="bits-ruler bits-ruler--bytes" aria-hidden="true">${byteBands}</div>
      <div class="bits-ruler bits-ruler--bits" aria-hidden="true">${bitNumbers}</div>
      ${cells.map(cell => {
        const fieldIdx = protocol.fields.indexOf(cell.field);
        const cadence = fieldIdx >= 0 ? (fieldIdx % 2 === 0 ? 'bit-cell--even' : 'bit-cell--odd') : '';
        return `<a class="bit-cell${cell.span === 1 ? ' bit-cell--narrow' : ''}${cell.variable ? ' bit-cell--variable' : ''}${cadence ? ' ' + cadence : ''}" style="grid-column:span ${cell.span}" href="#f-${cell.field.key}" data-field="${cell.field.key}"><span>${e(cell.label)}</span></a>`;
      }).join('')}
    </div>${split}
  </div>
</div>`;
}

/**
 * The same 32-bit layout drawn as 16-bit half rows for narrow screens (CSS shows one of the two grids).
 * Every half row has its own bit ruler (0–15 or 16–31). A field that crosses a half-row boundary is drawn
 * in pieces; only the first piece is a link in the accessibility tree and the tab order, the others are
 * hidden from assistive technology but share data-field, so hover, tap and highlighting treat them as one field.
 * Fields that fill whole 32-bit rows collapse to one full-width row, as they do in the wide grid.
 */
function splitDiagram(protocol, cadenceOf) {
  const half = 16;
  const lines = [];
  let line = null;
  let offset = 0;
  const cell = (field, span, label, extra = {}) => ({ field, span, label, ...extra });
  for (const field of protocol.fields) {
    if (!Number.isInteger(field.bits)) { lines.push({ start: null, cells: [cell(field, half, `${field.name} (değişken)`, { variable: true })] }); line = null; continue; }
    if (field.bits > 32 && offset % 32 === 0 && field.bits % 32 === 0) {
      lines.push({ start: null, cells: [cell(field, half, `${field.name} (${field.bits} bit)`)] });
      line = null; offset += field.bits; continue;
    }
    let left = field.bits;
    let at = offset;
    let first = true;
    while (left > 0) {
      if (at % half === 0 || !line) { line = { start: at - (at % half), cells: [] }; lines.push(line); }
      const span = Math.min(left, half - (at % half));
      line.cells.push(cell(field, span, first ? field.name : `${field.name} (devam)`, { continued: !first }));
      left -= span; at += span; first = false;
    }
    offset += field.bits;
  }

  const ruler = start => `<div class="bits-ruler bits-ruler--bits bits-ruler--half" aria-hidden="true">${Array.from({ length: half }, (_, i) => {
    const bit = (start % 32) + i;
    return `<span class="bits-col-num${bit % 8 === 0 ? ' bits-col-num--boundary' : ''}" title="Bit ${bit} (${Math.floor(bit / 8)}. Sekizli, ${bit % 8}. bit)">${bit}</span>`;
  }).join('')}</div>`;
  const piece = item => {
    const cadence = cadenceOf(item.field);
    const hidden = item.continued ? ' aria-hidden="true" tabindex="-1"' : '';
    return `<a class="bit-cell${item.span === 1 ? ' bit-cell--narrow' : ''}${item.variable ? ' bit-cell--variable' : ''}${item.continued ? ' bit-cell--continued' : ''}${cadence ? ' ' + cadence : ''}" style="grid-column:span ${item.span}" href="#f-${item.field.key}" data-field="${item.field.key}"${hidden}><span>${e(item.label)}</span></a>`;
  };
  return `
    <div class="bits bits--split" style="--cols:${half}">
      ${lines.map(item => `${item.start === null ? '' : ruler(item.start)}${item.cells.map(piece).join('')}`).join('\n      ')}
    </div>`;
}

function exampleValue(field, range, bytes) {
  if (!range) return '—';
  if (field.checksum || field.hex) {
    let value = 0n;
    for (let i = 0; i < range.bits / 8; i += 1) value = (value << 8n) | BigInt(bytes[range.offset / 8 + i]);
    return `0x${value.toString(16).padStart(range.bits / 4, '0')}`;
  }
  return String(field.example);
}

/** Column headers of the field table; on phones each row becomes a card whose lines repeat these as labels. */
const fieldColumns = ['Alan', 'Bit', 'Genişlik', 'Örnek', 'Açıklama ve kaynak'];

function protocolPage(protocol) {
  const { bytes, headerLength, ranges } = example(protocol.id);
  const myLayer = layerKey(protocol.layer);
  const fromId = protocol.example?.payloadFrom;
  const subProto = fromId ? byId.get(fromId) : null;
  const subHeaderLen = subProto ? example(subProto.id).headerLength : 0;
  const subLayer = subProto ? layerKey(subProto.layer) : null;

  const fieldIndexMap = new Map();
  protocol.fields.forEach((f, i) => fieldIndexMap.set(f.key, i));

  const legendItems = [];
  legendItems.push(`<div class="hex-legend__item">
    <span class="hex-legend__swatch hex-legend__swatch--proto" aria-hidden="true"></span>
    <span><strong>${e(protocol.title)}</strong> (${headerLength} sekizli başlık — alanlar ardışık tonlarla ayrılmıştır)</span>
  </div>`);

  if (subProto) {
    legendItems.push(`<div class="hex-legend__item">
      <span class="hex-legend__swatch hex-legend__swatch--sub hex-legend__swatch--${subLayer}" aria-hidden="true"></span>
      <span>Sarmalanmış ${e(subProto.name)} başlığı (${subHeaderLen} sekizli)</span>
    </div>`);
    const remaining = bytes.length - (headerLength + subHeaderLen);
    if (remaining > 0) {
      legendItems.push(`<div class="hex-legend__item">
        <span class="hex-legend__swatch hex-legend__swatch--data" aria-hidden="true"></span>
        <span>Uygulama yükü (${remaining} sekizli veri)</span>
      </div>`);
    }
  } else if (bytes.length > headerLength) {
    const remaining = bytes.length - headerLength;
    const label = protocol.id === 'dns' ? 'Soru ve yanıt kayıtları' : (protocol.id === 'icmp' || protocol.id === 'icmpv6') ? 'Hata / yankı verisi' : 'Yük verisi';
    legendItems.push(`<div class="hex-legend__item">
      <span class="hex-legend__swatch hex-legend__swatch--data" aria-hidden="true"></span>
      <span>${label} (${remaining} sekizli)</span>
    </div>`);
  }

  const fieldsAt = index => protocol.fields.filter(field => ranges[field.key] && ranges[field.key].offset < (index + 1) * 8 && ranges[field.key].offset + ranges[field.key].bits > index * 8).map(field => field.key);
  const rows = [];
  for (let start = 0; start < bytes.length; start += 8) {
    rows.push(`<div class="hex-row"><span class="hex-offset">${hex(start, 4)}</span>${bytes.slice(start, start + 8).map((byte, i) => {
      const index = start + i;
      const isPayload = index >= headerLength;
      const fields = fieldsAt(index);
      const dataAttr = fields.length ? ` data-fields="${fields.join(' ')}"` : '';

      let colorClass = '';
      if (!isPayload) {
        const fieldIdx = fields.length ? fieldIndexMap.get(fields[0]) : 0;
        colorClass = fieldIdx % 2 === 0 ? 'hex-byte--even' : 'hex-byte--odd';
      } else if (subProto && index < headerLength + subHeaderLen) {
        const subIndex = index - headerLength;
        const subRanges = example(subProto.id).ranges;
        const subFields = subProto.fields.filter(field => subRanges[field.key] && subRanges[field.key].offset < (subIndex + 1) * 8 && subRanges[field.key].offset + subRanges[field.key].bits > subIndex * 8).map(f => f.key);
        const subFieldIdx = subFields.length ? subProto.fields.findIndex(f => f.key === subFields[0]) : 0;
        const subEven = subFieldIdx % 2 === 0 ? 'even' : 'odd';
        colorClass = `hex-byte--sub hex-byte--sub-${subLayer} hex-byte--sub-${subEven}`;
      } else {
        colorClass = 'hex-byte--payload-data';
      }

      return `<span class="hex-byte ${colorClass}"${dataAttr}>${hex(byte)}</span>`;
    }).join('')}</div>`);
  }
  const table = protocol.fields.map(field => {
    const range = ranges[field.key];
    const position = range ? (range.bits === 1 ? `${range.offset}` : `${range.offset}–${range.offset + range.bits - 1}`) : '—';
    const values = field.values ? `<dl class="field-values">${field.values.map(([value, label]) => `<div><dt>${e(value)}</dt><dd>${e(label)}</dd></div>`).join('')}</dl>` : '';
    return `<tr id="f-${field.key}" data-field="${field.key}" tabindex="0" role="row"><th scope="row" role="rowheader">${e(field.name)}</th><td class="num" role="cell" data-label="${fieldColumns[1]}">${position}</td><td class="num" role="cell" data-label="${fieldColumns[2]}">${Number.isInteger(field.bits) ? field.bits : 'değişken'}</td><td class="num" role="cell" data-label="${fieldColumns[3]}"><code>${e(exampleValue(field, range, bytes))}</code></td><td role="cell" data-label="${fieldColumns[4]}"><p>${e(field.desc)}</p>${values}<p class="field-ref">${refLink(field.ref)}</p></td></tr>`;
  }).join('');
  const layoutRef = { rfc: protocol.layout.rfc, section: protocol.layout.section, label: protocol.layout.section ? undefined : protocol.layout.label };
  const index = protocols.indexOf(protocol);
  const neighbor = (item, label) => item ? `<a href="${url(item.id)}"><small>${label}</small>${e(item.name)}</a>` : '<span></span>';
  return page({ id: protocol.id, title: protocol.title, pageTitle: protocol.title, layer: protocol.layer, description: protocol.summary, className: `protocol-page--${myLayer}`, body: `
<header class="page-header"><p class="eyebrow"><span class="layer-badge layer-badge--${layerKey(protocol.layer)}">${e(protocol.layer)} katmanı</span> · ${headerLength} sekizli${protocol.fields.some(field => !Number.isInteger(field.bits)) ? ' + değişken kısım' : ''}</p><h1>${e(protocol.title)}</h1><p class="lead">${e(protocol.summary)}</p></header>
<div class="overview-grid">
  <section class="overview-grid__col" aria-labelledby="layout-title"><h2 id="layout-title">Yerleşim</h2>${diagram(protocol)}
<p class="verified">Alan genişlikleri ${refLink(layoutRef)}${protocol.layout.section ? ` (${e(protocol.layout.label)})` : ''} ile derleme sırasında karşılaştırıldı: <code>${checks.get(protocol.id).found.join(' · ')}</code>${protocol.layout.kind === 'rfc826' && protocol.layout.part === 'arp' ? ' (n ve m: ar$hln ve ar$pln sekizli)' : ' bit'}.</p></section>
  <section class="overview-grid__col" aria-labelledby="example-title"><h2 id="example-title">Örnek paket</h2><p>${e(protocol.example.note)}</p><div class="hex-legend" aria-label="Paket katmanları">${legendItems.join('')}</div><div class="hex" role="group" aria-label="Örnek paketin onaltılık dökümü">${rows.join('')}</div><p class="small">Bu paket gerçek bir yakalama değildir: aşağıdaki tablodaki örnek değerlerden derleme sırasında üretilir, sağlama toplamları RFC 1071’deki yöntemle hesaplanır. Bir alanın üzerine gelin ya da alana tıklayın; karşılık gelen sekizliler vurgulanır.${bytes.length > headerLength ? ' Soluk sekizliler başlıktan sonraki yüktür.' : ''}</p></section>
</div>
<section aria-labelledby="fields-title"><h2 id="fields-title">Alanlar</h2><div class="table-scroll" tabindex="0" role="region" aria-label="${e(protocol.title)} alanları"><table class="fields fields--cards" role="table"><thead role="rowgroup"><tr role="row">${fieldColumns.map(label => `<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead><tbody role="rowgroup">${table}</tbody></table></div></section>
${protocol.notes?.length ? `<section aria-labelledby="notes-title"><h2 id="notes-title">Notlar</h2><ul class="notes">${protocol.notes.map(note => `<li>${e(note)}</li>`).join('')}</ul></section>` : ''}
<section aria-labelledby="refs-title"><h2 id="refs-title">Kaynaklar</h2><ol class="references">${protocol.refs.map(number => { const entry = rfcEntry(number); return `<li><a href="${url('kaynakca')}#rfc${number}">[RFC ${number}]</a> ${citation(entry)}</li>`; }).join('')}</ol></section>
<nav class="page-neighbors" aria-label="Önceki ve sonraki protokol">${neighbor(protocols[index - 1], '← Önceki')}${neighbor(protocols[index + 1], 'Sonraki →')}</nav>` });
}

function home() {
  const layers = [...new Set(protocols.map(protocol => protocol.layer))];
  const totalFields = protocols.reduce((sum, p) => sum + p.fields.length, 0);

  const hero = `
<div class="home-hero console-hero console-hero--wire">
  <div class="console-hero__inner">
    <div class="console-hero__copy">
      <div class="home-badge">
        <span class="tiny-dot" aria-hidden="true"></span>
        <span>v0.1 · RFC Doğrulamalı Protokol Atlası</span>
      </div>
      <h1 class="home-title console-hero__title">Wire</h1>
      <p class="home-lead console-hero__lead">Tel üzerindeki her bit, kaynağıyla: RFC standartlarıyla doğrulanmış ağ protokolleri, başlık yerleşimleri ve etkileşimli onaltılık paket dökümleri.</p>

      <div class="home-search-wrap">
        <label class="home-search-box" for="protocol-filter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="protocol-filter" type="search" placeholder="Protokol, RFC veya alan ara (örn. IPv4, TCP, 791, Bayraklar…)" autocomplete="off" spellcheck="false" aria-label="Protokol ara">
          <kbd aria-hidden="true">/</kbd>
        </label>
        <p id="filter-status" class="home-search-status" role="status" aria-live="polite"></p>
      </div>
    </div>
    <figure class="console-hero__panel">
      <figcaption class="console-hero__panel-head">
        <span>IPv4 Datagram · 20 sekizli</span>
        <a href="${url('ipv4')}">protokolü incele →</a>
      </figcaption>
      <div class="console-hero__screen">      <span class="h-dim">Ofset</span>  <span class="h-dim">Sekizli</span>      <span class="h-dim">Alan ve Değer</span>
      <span class="h-dim">[00]</span>   <span class="h-bus">45</span>           <span class="h-bus">Ver: 4, IHL: 5</span> <span class="h-dim">(20 bayt)</span>
      <span class="h-dim">[01]</span>   <span class="h-dim">00</span>           <span class="h-dim">DSCP: CS0, ECN: Not-ECT</span>
      <span class="h-dim">[02]</span>   <span class="h-ok">00 20</span>        <span class="h-ok">Toplam Uzunluk: 32 bayt</span>
      <span class="h-dim">[04]</span>   <span class="h-dim">1c 46</span>        <span class="h-dim">Kimlik: 0x1c46</span>
      <span class="h-dim">[06]</span>   <span class="h-hot">40 00</span>        <span class="h-hot">Bayraklar: [DF]</span> <span class="h-dim">Ofset: 0</span>
      <span class="h-dim">[08]</span>   <span class="h-ok">40</span>           <span class="h-ok">TTL: 64</span> <span class="h-dim">(64 atlama)</span>
      <span class="h-dim">[09]</span>   <span class="h-bus">11</span>           <span class="h-bus">Protokol: UDP (17)</span>
      <span class="h-dim">[10]</span>   <span class="h-ok">72 c2</span>        <span class="h-ok">Sağlama: Doğru</span> <span class="h-dim">(RFC 1071)</span>
      <span class="h-dim">[12]</span>   <span class="h-bus">c0 a8 01 64</span>  <span class="h-bus">Kaynak: 192.168.1.100</span>
      <span class="h-dim">[16]</span>   <span class="h-hot">01 01 01 01</span>  <span class="h-hot">Hedef:  1.1.1.1</span>
<span class="h-dim">      …                   12 sekizli yük (UDP + Veri)</span></div>
    </figure>
  </div>
</div>`;

  const body = `
<div class="home-stats" aria-label="Wire istatistikleri">
  <div class="home-stat-item">
    <strong class="stat-number">${protocols.length}</strong>
    <span class="stat-label">Protokol Başlığı</span>
  </div>
  <div class="home-stat-item">
    <strong class="stat-number">16</strong>
    <span class="stat-label">Doğrulanmış RFC</span>
  </div>
  <div class="home-stat-item">
    <strong class="stat-number">${totalFields}</strong>
    <span class="stat-label">Bit Düzeyinde Alan</span>
  </div>
  <div class="home-stat-item">
    <strong class="stat-number">4</strong>
    <span class="stat-label">Ağ Katmanı</span>
  </div>
  <div class="home-stat-item">
    <strong class="stat-number">%100</strong>
    <span class="stat-label">Derleme Doğrulaması</span>
  </div>
</div>
<div class="home-catalog">
  <div class="home-catalog__header">
    <h2>Protokol Kataloğu</h2>
    <p class="small">Katmanlara göre gruplanmış RFC başlık şemaları. Ayrıntılı bit düzeni ve örnek paket onaltılık dökümü için bir protokol seçin.</p>
  </div>
  ${layers.map(layer => `<section class="layer layer--${layerKey(layer)}" aria-labelledby="layer-${e(layer)}"><h2 id="layer-${e(layer)}" class="layer-heading layer-heading--${layerKey(layer)}"><span class="layer-heading__indicator" aria-hidden="true"></span>${e(layer)} katmanı</h2><ul class="protocol-list">${protocols.filter(protocol => protocol.layer === layer).map(protocol => {
    const { headerLength } = example(protocol.id);
    return `<li class="protocol-card protocol-card--${layerKey(protocol.layer)}" data-layer="${layerKey(protocol.layer)}" data-search="${e(`${protocol.name} ${protocol.title} ${protocol.summary} ${protocol.fields.map(field => field.name).join(' ')} ${protocol.refs.join(' ')}`.toLocaleLowerCase('tr'))}"><div class="protocol-card__header"><p class="protocol-card__path">~/wire/${e(protocol.id)}</p><span class="layer-pill layer-pill--${layerKey(protocol.layer)}">${e(protocol.layer)}</span></div><h3><a href="${url(protocol.id)}">${e(protocol.title)}</a></h3><p>${e(protocol.summary)}</p><p class="protocol-card__meta">${headerLength} sekizli · ${protocol.fields.filter(field => Number.isInteger(field.bits)).length} alan · RFC ${protocol.layout.rfc}</p></li>`;
  }).join('')}</ul></section>`).join('')}
</div>`;

  return page({ id: '', title: 'Wire', description: 'Ethernet, ARP, IPv4, IPv6, ICMP, UDP, TCP ve DNS başlıklarının RFC kaynaklı, bit düzeyinde Türkçe başvurusu.', hero, body });
}

function guidePage() {
  return page({ id: 'kilavuz', title: 'Kılavuz', pageTitle: 'Kılavuz', description: 'Ethernet haberleşme protokolleri, paket mimarisi, başlık alanları ve kapsamlı RFC başvuru kılavuzu.', body: `
<header class="page-header">
  <p class="eyebrow">kapsamlı protokol ve paket referansı</p>
  <h1>Ethernet Haberleşme Protokolleri, Paket Mimarisi ve RFC Kılavuzu</h1>
  <p class="lead">Tel üzerindeki fiziksel Ethernet çerçevesinden başlayarak adres çözümleme, IP yönlendirme, TCP/UDP iletimi ve DNS çözümlemesine kadar bütün katmanların, paket yapılarının ve RFC standartlarının ayrıntılı Türkçe anlatımı.</p>
</header>

<div class="guide-toc" role="navigation" aria-label="Kılavuz İçindekiler">
  <h2>İçindekiler</h2>
  <ul class="toc-list">
    <li><a href="#bolum-1">1. Ağ Mimarisi ve Kapsülleme (Encapsulation) Prensipleri</a></li>
    <li><a href="#bolum-2">2. Fiziksel ve Veri Bağlantı Katmanı: Ethernet Mimarisi</a></li>
    <li><a href="#bolum-3">3. Adres Çözümleme Protokolleri (ARP, RARP, NDP)</a></li>
    <li><a href="#bolum-4">4. Ağ / İnternet Katmanı Protokolleri (IPv4, IPv6, ICMP, ICMPv6)</a></li>
    <li><a href="#bolum-5">5. İletim Katmanı Protokolleri (UDP, TCP, SCTP)</a></li>
    <li><a href="#bolum-6">6. Uygulama ve Ağ Yapılandırma Protokolleri (DNS, DHCPv4, DHCPv6)</a></li>
    <li><a href="#bolum-7">7. İnternet Sağlama Toplamı (Checksum) Hesaplama Algoritması</a></li>
    <li><a href="#bolum-8">8. Bütün Temel Ağ RFC’lerinin Kapsamlı Kataloğu</a></li>
    <li><a href="#bolum-9">9. Uçtan Uca Paket Analizleri ve Onaltılık (Hex) İncelemeler</a></li>
    <li><a href="#bolum-10">10. Ağ Analizi ve Paket İnceleme Araçları Rehberi</a></li>
    <li><a href="#bolum-11">11. Tüm Katmanlardaki Protokollerin Araştırması ve wire Genişleme Yol Haritası</a></li>
  </ul>
</div>

<article class="guide-content console-prose">

<section id="bolum-1">
  <h2>1. Ağ Mimarisi ve Kapsülleme (Encapsulation) Prensipleri</h2>
  <p>Bilgisayar ağlarında veri iletimi katmanlı bir mimari üzerinden yürütülür. En temel iki referans model 7 katmanlı <strong>OSI Modeli</strong> ve pratik internet standardı olan 4 katmanlı <strong>TCP/IP Modeli</strong>dir:</p>
  <div class="table-scroll"><table class="fields">
    <thead><tr><th>Katman (OSI)</th><th>TCP/IP Katmanı</th><th>PDU Adı</th><th>Protokol Örnekleri</th><th>İşlevi</th></tr></thead>
    <tbody>
      <tr><td>7. Uygulama, 6. Sunum, 5. Oturum</td><td>Uygulama (Application)</td><td>Veri (Data)</td><td><a href="${url('dns')}">DNS</a>, HTTP, DHCP, NTP</td><td>Kullanıcı ve süreç düzeyinde veri üretimi ve sunumu.</td></tr>
      <tr><td>4. İletim (Transport)</td><td>İletim (Transport)</td><td>Segment / Datagram</td><td><a href="${url('tcp')}">TCP</a>, <a href="${url('udp')}">UDP</a>, SCTP</td><td>Uçtan uca süreçler arası güvenilir veya hızlı veri aktarımı.</td></tr>
      <tr><td>3. Ağ (Network)</td><td>Ağ / İnternet (Internet)</td><td>Paket / Datagram</td><td><a href="${url('ipv4')}">IPv4</a>, <a href="${url('ipv6')}">IPv6</a>, <a href="${url('icmp')}">ICMP</a>, <a href="${url('icmpv6')}">ICMPv6</a></td><td>Mantıksal adresleme ve yönlendirme (routing).</td></tr>
      <tr><td>2. Veri Bağlantısı (Data Link)</td><td rowspan="2">Bağlantı (Link / Network Access)</td><td>Çerçeve (Frame)</td><td><a href="${url('ethernet')}">Ethernet</a>, <a href="${url('arp')}">ARP</a>, 802.1Q VLAN, PPPoE</td><td>Yerel ağda fiziksel MAC adresleriyle doğrudan düğümler arası iletim.</td></tr>
      <tr><td>1. Fiziksel (Physical)</td><td>Bit Akışı</td><td>1000BASE-T, Fiber Optik, Bakır Hat</td><td>Elektriksel, optik veya radyo dalgalarıyla 0 ve 1 sinyallerinin aktarımı.</td></tr>
    </tbody>
  </table></div>
  <h3>Kapsülleme (Encapsulation) Süreci</h3>
  <p>Uygulama katmanında üretilen veri alt katmanlara indikçe her katman kendi denetim bilgilerini içeren bir başlık (header) ekler. Veri bağlantı katmanında ise çerçevenin sonuna bir Frame Check Sequence (FCS / CRC-32) kuyruğu (trailer) eklenir. Alıcı cihazda ise alt katmandan yukarıya doğru başlıklar soyularak (de-encapsulation) ilgili uygulama sürecine ulaştırılır.</p>
  <h3>Ağ Bayt Sıralaması (Network Byte Order)</h3>
  <p>İnternet protokollerinde çok baytlı alanlar (16 bit portlar, 32 bit IP adresleri vb.) <strong>Big-Endian</strong> (büyük sonlu) formatında iletilir. En anlamlı sekizli (MSB) hatta ilk çıkan sekizlidir. RFC başlık şemalarında ise Bit 0 daima en sol ve en anlamlı bit (MSB) olarak çizilir.</p>
</section>

<section id="bolum-2">
  <h2>2. Fiziksel ve Veri Bağlantı Katmanı: Ethernet Mimarisi</h2>
  <p>Yerel ağların (LAN) tartışmasız standardı olan Ethernet, fiziksel kablo üzerindeki çerçeve yapısını ve adresleme kurallarını belirler.</p>
  <h3>Ethernet II (DIX) ve IEEE 802.3</h3>
  <p>Modern internet trafiği <a href="${url('kaynakca')}#rfc894">RFC 894</a>'te tanımlanan <strong>Ethernet II</strong> standardını kullanır. 12. ve 13. baytlardaki alan değeri <code>&ge; 1536 (0x0600)</code> ise bu alan bir <strong>EtherType</strong> alanıdır (0x0800 IPv4, 0x0806 ARP, 0x86DD IPv6). Değer <code>&le; 1500</code> ise IEEE 802.3 uzunluk alanıdır ve ardından LLC/SNAP başlığı gelir.</p>
  <pre><code>+--------------------+-------------------+--------------------+--------------------+--------------------+--------------------+--------------------+
| Preamble (Öntakı)  | SFD               | Hedef MAC Adresi   | Kaynak MAC Adresi  | EtherType          | Veri Yükü (Payload)| FCS (CRC-32)       |
| 7 bayt (0xAA...)   | 1 bayt (0xAB)     | 6 bayt (48 bit)    | 6 bayt (48 bit)    | 2 bayt (16 bit)    | 46 - 1500 bayt     | 4 bayt (32 bit)    |
+--------------------+-------------------+--------------------+--------------------+--------------------+--------------------+--------------------+</code></pre>
  <h3>MAC Adres Mimarisi ve Ayrılmış Adresler</h3>
  <p>48 bitlik MAC adresinin ilk sekizlisinin en düşük iki biti hayati öneme sahiptir: <strong>b0 (I/G)</strong> biti 0 ise Tekil (Unicast), 1 ise Çok Noktaya Yayın (Multicast/Broadcast) anlamına gelir. <strong>b1 (U/L)</strong> biti 0 ise IEEE tarafından küresel atanmış (OUI), 1 ise yerel yönetilen adrestir.</p>
  <ul class="notes">
    <li><strong>Yayın (Broadcast)</strong>: <code>ff:ff:ff:ff:ff:ff</code> (tüm bitler 1).</li>
    <li><strong>IPv4 Multicast (RFC 1112)</strong>: <code>01:00:5e:00:00:00</code> &ndash; <code>01:00:5e:7f:ff:ff</code> aralığı.</li>
    <li><strong>IPv6 Multicast (RFC 2464)</strong>: <code>33:33:xx:xx:xx:xx</code> öneki.</li>
    <li><strong>Belgeleme MAC Adresleri (<a href="${url('kaynakca')}#rfc9542">RFC 9542 §2.1.4</a>)</strong>: <code>00:00:5e:00:53:00</code> &ndash; <code>00:00:5e:00:53:ff</code> aralığı.</li>
  </ul>
  <h3>MTU ve Minimum 64 Bayt Kuralı</h3>
  <p>Standart Ethernet çerçevesi en az 64 bayt (14 bayt başlık + 46 bayt veri + 4 bayt FCS) olmak zorundadır. Yük 46 bayttan küçükse sıfır sekizlileriyle doldurulur (padding). Standart maksimum iletim birimi (MTU) 1500 sekizlidir; Gigabit ağlarda ise 9000 bayta kadar Jumbo Frame kullanılabilir.</p>
  <h3>VLAN Etiketleme (IEEE 802.1Q) ve PPPoE (RFC 2516)</h3>
  <p>Yerel ağları mantıksal olarak izole eden 802.1Q standardı, kaynak MAC ile EtherType arasına 4 baytlık etiket ekler: <strong>TPID (0x8100)</strong> ve 16 bitlik <strong>TCI</strong> (3 bit PCP öncelik, 1 bit DEI, 12 bit VLAN ID). Genişbant ağlarda kimlik doğrulama sağlayan <strong>PPPoE (<a href="${url('kaynakca')}#rfc2516">RFC 2516</a>)</strong> ise Ethernet üzerinde PPP oturumu açarak MTU'yu 1492 bayta sınırlandırır.</p>
</section>

<section id="bolum-3">
  <h2>3. Adres Çözümleme Protokolleri (ARP, RARP, NDP)</h2>
  <h3>ARP (Address Resolution Protocol - <a href="${url('arp')}">RFC 826</a>)</h3>
  <p>Bir ana bilgisayar yerel ağdaki bir cihazın IP adresini bildiğinde ancak hedef MAC adresini bilmediğinde ARP devreye girer. Ethernet üzerinde 28 sekizli uzunluğundadır:</p>
  <div class="table-scroll"><table class="fields">
    <thead><tr><th>Alan</th><th>Genişlik</th><th>Örnek</th><th>Açıklama</th></tr></thead>
    <tbody>
      <tr><td>Donanım Türü (ar$hrd)</td><td>16 bit</td><td><code>1</code></td><td>Ethernet donanımı.</td></tr>
      <tr><td>Protokol Türü (ar$pro)</td><td>16 bit</td><td><code>0x0800</code></td><td>IPv4 protokolü.</td></tr>
      <tr><td>HLN / PLN</td><td>8 + 8 bit</td><td><code>6 / 4</code></td><td>Donanım (MAC) ve protokol (IPv4) adresi uzunlukları.</td></tr>
      <tr><td>İşlem Kodu (ar$op)</td><td>16 bit</td><td><code>1 / 2</code></td><td>1: ARP İsteği (Request), 2: ARP Yanıtı (Reply).</td></tr>
      <tr><td>Gönderen MAC / IP</td><td>48 + 32 bit</td><td><code>00:00:5e:00:53:01 / 192.0.2.1</code></td><td>İsteği yapan cihazın adresleri.</td></tr>
      <tr><td>Hedef MAC / IP</td><td>48 + 32 bit</td><td><code>00:00:00:00:00:00 / 192.0.2.2</code></td><td>İstek paketinde hedef MAC sıfırdır, aranan hedef IP yazılır.</td></tr>
    </tbody>
  </table></div>
  <p><strong>Gratuitous ARP ve ACD (RFC 5227)</strong>: Cihazın kendi IP adresi için gönderdiği istek; IP çakışmalarını tespit eder ve anahtarların MAC tablolarını günceller. Tarihsel disksiz terminaller için kullanılan <strong>RARP (RFC 903)</strong> yerini DHCP'ye bırakmıştır. IPv6 ağlarında ise ARP yerine ICMPv6 tabanlı <strong>NDP (RFC 4861)</strong> kullanılır.</p>
</section>

<section id="bolum-4">
  <h2>4. Ağ / İnternet Katmanı Protokolleri (IPv4, IPv6, ICMP, ICMPv6)</h2>
  <h3>IPv4 (Internet Protocol Version 4 - <a href="${url('ipv4')}">RFC 791</a>)</h3>
  <p>IPv4 başlığı seçenek içermediğinde 20 sekizlidir. IHL alanı 32 bitlik sözcük sayısını (en az 5) belirtir. Hizmet türü (ToS) sekizlisi modern standartlarda <a href="${url('kaynakca')}#rfc2474">RFC 2474</a> ile 6 bit <strong>DSCP</strong> (hizmet kalitesi) ve <a href="${url('kaynakca')}#rfc3168">RFC 3168</a> ile 2 bit <strong>ECN</strong> (tıkanıklık uyarısı) olarak ikiye ayrılmıştır.</p>
  <p><strong>Parçalama (Fragmentation)</strong>: Identification (16 bit), Flags (DF, MF) ve Fragment Offset (13 bit, 8 sekizli biriminde) alanlarıyla yönlendiriciler MTU'yu aşan paketleri parçalayabilir. DF=1 olan paketler düşürülür ve geriye ICMP Type 3 Code 4 dönülerek Path MTU Discovery (PMTUD) sağlanır.</p>
  <h3>IPv6 (Internet Protocol Version 6 - <a href="${url('ipv6')}">RFC 8200</a>)</h3>
  <p>IPv6 başlığı kesinlikle <strong>sabit 40 sekizli (320 bit)</strong> uzunluğundadır. 128 bitlik kaynak ve hedef adresleri, 20 bitlik Akış Etiketi (Flow Label) ve 8 bitlik Sonraki Başlık (Next Header) alanı içerir. IPv6 başlığında yönlendirme gecikmesini önlemek için <em>sağlama toplamı (checksum) kaldırılmıştır</em> ve ara yönlendiricilerin parçalama yapması yasaklanmıştır.</p>
  <h3>ICMPv4 (<a href="${url('icmp')}">RFC 792</a>) ve ICMPv6 (<a href="${url('icmpv6')}">RFC 4443</a>)</h3>
  <p>Ağ katmanında kontrol ve teşhis iletilerini taşır. En sık kullanılan iletiler: Echo Request (Ping isteği) ve Echo Reply (Ping yanıtı), Destination Unreachable (Hedefe ulaşılamaz - Port/Ağ/Host kapalı), Time Exceeded (TTL/Hop Limit sıfırlandı - Traceroute temeli) ve ICMPv6 Packet Too Big iletisidir.</p>
</section>

<section id="bolum-5">
  <h2>5. İletim Katmanı Protokolleri (UDP, TCP, SCTP)</h2>
  <h3>UDP (User Datagram Protocol - <a href="${url('udp')}">RFC 768</a>)</h3>
  <p>Yalnızca 8 sekizli uzunluğunda minimal bir başlık taşır: Kaynak Port (16 bit), Hedef Port (16 bit), Toplam Uzunluk (16 bit) ve Sağlama Toplamı (16 bit). Bağlantısızdır, akış denetimi yapmaz; DNS, DHCP, VoIP ve QUIC için temel iletim mekanizmasıdır.</p>
  <h3>TCP (Transmission Control Protocol - <a href="${url('tcp')}">RFC 9293</a>)</h3>
  <p>Güvenilir, sıralı ve çift yönlü bayt akışı sunar. Seçeneksiz başlık 20 sekizlidir. Sıra numarası (Sequence Number), kümülatif onay numarası (Acknowledgment Number), alıcı pencere boyutu (Window Size) ve kontrol bayrakları taşır:</p>
  <ul class="notes">
    <li><strong>SYN</strong>: Bağlantı kurma ve sıra numaralarını senkronize etme.</li>
    <li><strong>ACK</strong>: Onay alanının geçerli olduğunu bildirme (kurulumdan sonraki tüm paketlerde 1'dir).</li>
    <li><strong>FIN</strong>: Göndericinin veri aktarımını sonlandırması.</li>
    <li><strong>RST</strong>: Bağlantıyı anında koparma / reddetme.</li>
    <li><strong>PSH</strong>: Alıcı tamponunu beklemeden veriyi uygulamaya iletme.</li>
    <li><strong>CWR ve ECE (<a href="${url('kaynakca')}#rfc3168">RFC 3168</a>)</strong>: Paket düşürmeden açık tıkanıklık bildirimi yönetimi.</li>
  </ul>
  <p><strong>3 Aşamalı Bağlantı Kurulumu (3-Way Handshake)</strong>: <code>SYN (Seq=X) &rarr; SYN-ACK (Seq=Y, Ack=X+1) &rarr; ACK (Seq=X+1, Ack=Y+1)</code> akışıyla iki yönlü kanal kurulur. Kapanış ise <code>FIN &rarr; ACK &rarr; FIN &rarr; ACK</code> ile 4 adımda gerçekleşir.</p>
</section>

<section id="bolum-6">
  <h2>6. Uygulama ve Ağ Yapılandırma Protokolleri (DNS, DHCPv4, DHCPv6)</h2>
  <h3>DNS (Domain Name System - <a href="${url('dns')}">RFC 1035</a>)</h3>
  <p>12 sekizli sabit başlığında Transaction ID, sorgu/yanıt bayrakları (QR, Opcode, AA, TC, RD, RA, RCODE) ve soru/kayıt sayaçlarını taşır. Ardından gelen soru bölümünde etiket uzunluklarıyla kodlanmış QNAME, QTYPE (A=1, AAAA=28, CNAME=5, MX=15 vb.) ve QCLASS (IN=1) yer alır.</p>
  <h3>DHCPv4 (RFC 2131) ve DHCPv6 (RFC 8415)</h3>
  <p>Otomatik ağ yapılandırması sunar. IPv4'te <strong>DORA</strong> (Discover &rarr; Offer &rarr; Request &rarr; Acknowledge) döngüsü UDP 67/68 portları üzerinden yürütülür ve <code>0x63825363</code> Magic Cookie sekizlileriyle başlar. IPv6'da ise <strong>SARR</strong> (Solicit &rarr; Advertise &rarr; Request &rarr; Reply) akışı UDP 546/547 portlarında multicast ile çalışır.</p>
</section>

<section id="bolum-7">
  <h2>7. İnternet Sağlama Toplamı (Checksum) Hesaplama Algoritması</h2>
  <h3>RFC 1071 Bire Tümleyen Toplamı</h3>
  <p><a href="${url('kaynakca')}#rfc1071">RFC 1071</a>'de tarif edilen standart yöntem şudur: Korunan alanlar 16 bitlik kelimeler halinde 32 bitlik akümülatörde toplanır. Taşma bitleri (carry bits) alt 16 bite eklenir; nihai toplamın 1'e tümleyeni (tüm bitlerin tersi) alınır. Doğrulama sırasında checksum dahil tüm paket toplandığında sonuç <code>0x0000</code> çıkmalıdır.</p>
  <h3>Sözde Başlık (Pseudo-Header) Mimarisi</h3>
  <p>TCP, UDP ve ICMPv6 sağlama toplamı hesaplanırken, paketin yanlış bir IP'ye veya protokole teslimini engellemek için IP katmanındaki Kaynak IP, Hedef IP, Protokol Numarası ve L4 Uzunluğu sanal bir <strong>Sözde Başlık</strong> olarak hesaplamaya dahil edilir (IPv4 için 12 bayt, IPv6 için 40 bayt).</p>
</section>

<section id="bolum-8">
  <h2>8. Bütün Temel Ağ RFC’lerinin Kapsamlı Kataloğu</h2>
  <div class="table-scroll"><table class="fields">
    <thead><tr><th>RFC No</th><th>Başlık</th><th>Durum</th><th>Kapsam ve Kullanım</th></tr></thead>
    <tbody>
      <tr><td><a href="${url('kaynakca')}#rfc768">RFC 768</a></td><td>User Datagram Protocol</td><td>Standart</td><td>8 baytlık minimal UDP başlığı ve sözde başlık.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc791">RFC 791</a></td><td>Internet Protocol</td><td>Standart</td><td>IPv4 datagram başlığı, parçalama ve yönlendirme.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc792">RFC 792</a></td><td>Internet Control Message Protocol</td><td>Standart</td><td>ICMP hata ve kontrol iletileri.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc826">RFC 826</a></td><td>Ethernet Address Resolution Protocol</td><td>Standart</td><td>ARP paketi ve Ethernet iletim katmanı eşlemesi.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc894">RFC 894</a></td><td>Transmission of IP Datagrams over Ethernet</td><td>Standart</td><td>IP paketlerinin Ethernet II çerçevelerinde taşınması.</td></tr>
      <tr><td>RFC 903</td><td>Reverse Address Resolution Protocol</td><td>Standart</td><td>Disksiz terminallerin MAC'ten IP öğrenmesi (RARP).</td></tr>
      <tr><td>RFC 951</td><td>Bootstrap Protocol (BOOTP)</td><td>Standart</td><td>RARP'ın yerini alan UDP tabanlı açılış protokolü.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc1035">RFC 1035</a></td><td>Domain Names - Implementation and Specification</td><td>Standart</td><td>DNS ileti başlığı, bayraklar ve kaynak kayıt formatı.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc1071">RFC 1071</a></td><td>Computing the Internet Checksum</td><td>Bilgilendirme</td><td>16-bit bire tümleyen sağlama toplamı algoritması.</td></tr>
      <tr><td>RFC 1112</td><td>Host Extensions for IP Multicasting</td><td>Standart</td><td>IPv4 multicast adresleme ve Multicast MAC haritalaması.</td></tr>
      <tr><td>RFC 2131</td><td>Dynamic Host Configuration Protocol</td><td>Öneri</td><td>Otomatik IP ve ağ parametresi dağıtımı (DHCPv4).</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc2474">RFC 2474</a></td><td>Definition of the Differentiated Services Field</td><td>Öneri</td><td>IPv4 ToS ve IPv6 Traffic Class alanında 6 bit DSCP.</td></tr>
      <tr><td>RFC 2516</td><td>A Method for Transmitting PPP Over Ethernet</td><td>Bilgilendirme</td><td>Ethernet üzerinde PPPoE oturumu açma standardı.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc2606">RFC 2606</a></td><td>Reserved Top Level DNS Names</td><td>BCP</td><td>Belgelendirme TLD'leri (.example, .test, .invalid, .localhost).</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc3168">RFC 3168</a></td><td>Addition of Explicit Congestion Notification to IP</td><td>Öneri</td><td>IP ve TCP başlıklarında 2 bitlik açık tıkanıklık uyarısı (ECN).</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc3849">RFC 3849</a></td><td>IPv6 Address Prefix Reserved for Documentation</td><td>Bilgilendirme</td><td>IPv6 belgeleme adresi öneki (2001:db8::/32).</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc4443">RFC 4443</a></td><td>ICMPv6 for the IPv6 Specification</td><td>Standart</td><td>IPv6 kontrol ve hata iletileri (ICMPv6).</td></tr>
      <tr><td>RFC 4861</td><td>Neighbor Discovery for IPv6 (NDP)</td><td>Öneri</td><td>IPv6'da komşu keşfi, yönlendirici ilanı ve adres çözümleme.</td></tr>
      <tr><td>RFC 5227</td><td>IPv4 Address Conflict Detection</td><td>Öneri</td><td>ARP Probe ve Announcement ile adres çakışma tespiti.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc5737">RFC 5737</a></td><td>IPv4 Address Blocks Reserved for Documentation</td><td>Bilgilendirme</td><td>IPv4 belgeleme blokları (192.0.2.0/24, 198.51.100.0/24).</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc8200">RFC 8200</a></td><td>Internet Protocol, Version 6 Specification</td><td>Standart</td><td>Sabit 40 sekizli IPv6 başlığı ve uzantı başlıkları.</td></tr>
      <tr><td>RFC 8415</td><td>Dynamic Host Configuration Protocol for IPv6</td><td>Öneri</td><td>IPv6 dinamik yapılandırma protokolü (DHCPv6).</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc9293">RFC 9293</a></td><td>Transmission Control Protocol (TCP)</td><td>Standart</td><td>Modern TCP başlığı, durum makinesi ve kontrol bayrakları.</td></tr>
      <tr><td><a href="${url('kaynakca')}#rfc9542">RFC 9542</a></td><td>IANA Considerations for IEEE 802 Parameters</td><td>BCP</td><td>Belgelendirme MAC adresleri (00:00:5e:00:53:xx).</td></tr>
    </tbody>
  </table></div>
</section>

<section id="bolum-9">
  <h2>9. Uçtan Uca Paket Analizleri ve Onaltılık (Hex) İncelemeler</h2>
  <h3>Örnek 1: Ethernet Üzerinde ARP İsteği (42 Bayt + Dolgu)</h3>
  <pre><code>0000   ff ff ff ff ff ff 00 00 5e 00 53 01 08 06 00 01
0010   08 00 06 04 00 01 00 00 5e 00 53 01 c0 00 02 01
0020   00 00 00 00 00 00 c0 00 02 02 00 00 00 00 00 00
0030   00 00 00 00 00 00 00 00 00 00 00 00</code></pre>
  <p><code>ff:ff:ff:ff:ff:ff</code> hedef yayın MAC adresidir. <code>08 06</code> EtherType alanıdır. <code>00 01 08 00 06 04 00 01</code> sırasıyla Ethernet donanımı, IPv4 protokolü, 6 bayt MAC, 4 bayt IP ve ARP İstek kodudur. <code>c0 00 02 01</code> gönderen IP (192.0.2.1), <code>c0 00 02 02</code> aranan hedef IP'dir (192.0.2.2).</p>

  <h3>Örnek 2: Ethernet + IPv4 + TCP SYN Paketi (54 Bayt)</h3>
  <pre><code>0000   00 00 5e 00 53 02 00 00 5e 00 53 01 08 00 45 00
0010   00 28 4a 12 40 00 40 06 86 5e c0 00 02 01 c6 33
0020   64 07 c4 12 00 50 12 34 56 78 00 00 00 00 50 02
0030   72 10 d3 c4 00 00</code></pre>
  <p><code>08 00</code> IPv4 datagramıdır. <code>45</code> sürüm 4 ve 20 bayt IP başlığıdır. Protokol sekizlisi <code>06</code> (TCP)'dır. Kaynak IP <code>192.0.2.1</code>, hedef IP <code>198.51.100.7</code>'dir. TCP portları <code>c4 12</code> (50194) ve <code>00 50</code> (80 HTTP)'dir. <code>12 34 56 78</code> başlangıç sıra numarasıdır (ISN). Kontrol baytındaki <code>02</code> yalnızca SYN bitinin 1 olduğunu doğrular.</p>
</section>

<section id="bolum-10">
  <h2>10. Ağ Analizi ve Paket İnceleme Araçları Rehberi</h2>
  <p>Tel üzerindeki paketleri incelemek ve analiz etmek için standart konsol komutları:</p>
  <pre><code># Canlı hatta Ethernet başlıkları ve tam onaltılık dökümle paket dinleme:
sudo tcpdump -i eth0 -e -XX -nn "arp or ip"

# Yalnızca TCP SYN paketlerini filtreleyerek izleme:
sudo tcpdump -i any -nn "tcp[tcpflags] & tcp-syn != 0 and port 80"

# Python Scapy ile bit düzeyinde Ethernet + IP + TCP paketi oluşturup basma:
# from scapy.all import Ether, IP, TCP, sendp
# p = Ether(dst="00:00:5e:00:53:02") / IP(dst="198.51.100.7") / TCP(dport=80, flags="S")
# sendp(p, iface="eth0")</code></pre>
</section>

<section id="bolum-11">
  <h2>11. Tüm Katmanlardaki Protokollerin Araştırması ve wire Genişleme Yol Haritası</h2>
  <p>wire sistemine yeni bir protokolün eklenebilmesi için resmi bir IETF RFC'sinde yayımlanmış olması, <code>src/rfc.mjs</code> tarafından doğrulanabilir bir ASCII başlık şemasına sahip olması ve deterministik olarak örnek bayt dizisi üretilebilmesi gerekir.</p>

  <h3>Katman Katman Aday Protokoller</h3>
  <div class="table-scroll"><table class="fields">
    <thead><tr><th>Katman</th><th>Aday Protokol</th><th>RFC</th><th>Başlık Boyutu</th><th>Değerlendirme ve Fizibilite</th></tr></thead>
    <tbody>
      <tr><td>Bağlantı</td><td><strong>PPPoE</strong></td><td>RFC 2516 §4</td><td>6 sekizli</td><td><strong>Çok Yüksek</strong>. Version, Type, Code, Session_ID, Length alanları. DSL ve fiber optik genişbant erişiminde evrenseldir.</td></tr>
      <tr><td>Bağlantı</td><td><strong>IEEE 802.1Q (VLAN)</strong></td><td>RFC 3069 / IEEE</td><td>4 sekizli</td><td><strong>Yüksek</strong>. TPID (0x8100), PCP (3 bit), DEI (1 bit), VID (12 bit). Ethernet çerçevesine ek başlık olarak entegre edilebilir.</td></tr>
      <tr><td>Bağlantı</td><td><strong>RARP</strong></td><td>RFC 903</td><td>28 sekizli</td><td><strong>Yüksek</strong>. RFC 826 ARP ile birebir aynı yerleşimi paylaşır (op=3/4).</td></tr>
      <tr><td>Ağ</td><td><strong>IGMPv2</strong></td><td>RFC 2236 §2</td><td>8 sekizli</td><td><strong>Çok Yüksek</strong>. Type (8), Max Resp Time (8), Checksum (16), Group Address (32). IP multicast ve IPTV için kritik; RFC 1071 sağlama toplamı kullanır.</td></tr>
      <tr><td>Ağ</td><td><strong>IPv6 Fragment</strong></td><td>RFC 8200 §4.5</td><td>8 sekizli</td><td><strong>Çok Yüksek</strong>. Next Header (8), Reserved (8), Fragment Offset (13), M Flag (1), Identification (32). Sabit 32 bit ızgaraya oturur.</td></tr>
      <tr><td>Ağ</td><td><strong>GRE</strong></td><td>RFC 2784 §2.1</td><td>4 sekizli</td><td><strong>Yüksek</strong>. Temel tünelleme başlığı (Flags/Reserved 16, Protocol Type 16).</td></tr>
      <tr><td>Taşıma</td><td><strong>SCTP</strong></td><td>RFC 9260 §3</td><td>12 sekizli + chunk</td><td><strong>Çok Yüksek</strong>. Source Port (16), Destination Port (16), Verification Tag (32), Checksum (32). Telekom altyapısı ve WebRTC için standarttır.</td></tr>
      <tr><td>Uygulama</td><td><strong>DHCPv4 / BOOTP</strong></td><td>RFC 2131 §2</td><td>236 sekizli + seçenekler</td><td><strong>Çok Yüksek</strong>. 32-bit ASCII şeması tamdır. Paket yakalamalarında en çok aranan ve incelenen protokoldür.</td></tr>
      <tr><td>Uygulama</td><td><strong>NTP</strong></td><td>RFC 5905 §7.3</td><td>48 sekizli</td><td><strong>Çok Yüksek</strong>. Sabit 384 bitlik şeması vardır; zaman senkronizasyonunun küresel standardıdır.</td></tr>
    </tbody>
  </table></div>

  <h3>Önerilen Uygulama Sıralaması</h3>
  <ul class="notes">
    <li><strong>1. Faz (Hızlı Entegrasyon)</strong>: <code>PPPoE (RFC 2516)</code>, <code>IGMPv2 (RFC 2236)</code> ve <code>NTP (RFC 5905)</code> &mdash; Sabit boyutlu şemalar ve standart sağlama toplamları sayesinde altyapıya anında uyum sağlar.</li>
    <li><strong>2. Faz (Temel Altyapı)</strong>: <code>DHCPv4 (RFC 2131)</code>, <code>SCTP (RFC 9260)</code> ve <code>IPv6 Fragment Header (RFC 8200)</code> &mdash; Eğitsel değeri yüksek, genişletilmiş başlıklar.</li>
    <li><strong>3. Faz (Tünelleme ve Güvenlik)</strong>: <code>GRE (RFC 2784)</code>, <code>IPsec AH (RFC 4302)</code> ve <code>DHCPv6 (RFC 8415)</code>.</li>
  </ul>
</section>
</article>` });
}

function bibliographyPage() {
  const citedBy = number => protocols.filter(protocol => protocol.refs.includes(number));
  const list = values => values.length ? values.map(value => e(value.replace(/^RFC0*/, 'RFC '))).join(', ') : '—';
  return page({ id: 'kaynakca', title: 'Kaynakça', pageTitle: 'Kaynakça', description: 'wire sitesindeki bilgilerin dayandığı RFC’lerin künyeleri, bağlantıları ve indirilen metinlerin sha256 özetleri.', body: `
<header class="page-header"><p class="eyebrow">${bibliography.entries.length} RFC · ${e(bibliography.retrieved)} tarihinde indirildi</p><h1>Kaynakça</h1><p class="lead">Sitedeki her bilgi aşağıdaki RFC’lerden birine dayanır. Metinler <a href="${e(bibliography.source)}">rfc-editor.org</a> adresinden indirilmiştir; sha256 özeti, alan genişliklerinin hangi metne karşı doğrulandığını gösterir.</p></header>
<ol class="bibliography">${bibliography.entries.map(entry => `<li id="rfc${entry.number}"><h2>RFC ${entry.number}</h2><p class="citation">${citation(entry)} <a href="${e(entry.url)}">${e(entry.url.replace('https://', ''))}</a></p><dl><div><dt>Durum</dt><dd>${e(entry.status)}</dd></div><div><dt>DOI</dt><dd><a href="https://doi.org/${e(entry.doi)}">${e(entry.doi)}</a></dd></div><div><dt>Yerine geçtiği</dt><dd>${list(entry.obsoletes)}</dd></div><div><dt>Yerine geçen</dt><dd>${list(entry.obsoleted_by)}</dd></div><div><dt>Güncelleyen</dt><dd>${list(entry.updated_by)}</dd></div><div><dt>Burada kullanımı</dt><dd>${e(entry.use)}</dd></div><div><dt>Atıf yapan sayfalar</dt><dd>${citedBy(entry.number).map(protocol => `<a href="${url(protocol.id)}">${e(protocol.name)}</a>`).join(', ') || '—'}</dd></div><div><dt>sha256</dt><dd><code>${entry.sha256}</code> (${entry.bytes} sekizli)</dd></div></dl></li>`).join('')}</ol>` });
}

function methodPage() {
  return page({ id: 'yontem', title: 'Yöntem', pageTitle: 'Yöntem', description: 'wire sitesindeki verinin RFC’lerden nasıl alındığı ve nasıl doğrulandığı.', body: `
<header class="page-header"><p class="eyebrow">veri nereden geliyor</p><h1>Yöntem</h1><p class="lead">Bu sitedeki alan adları, genişlikler, değerler ve açıklamalar yalnızca RFC’lere dayanır. Neyin makineyle doğrulandığı, neyin elle yazıldığı aşağıda ayrı ayrı belirtilmiştir.</p></header>
<section><h2>Makineyle doğrulananlar</h2><p>Her protokolün alan genişlikleri, atıf yapılan RFC’nin düz metnindeki başlık şemasından okunur ve veri dosyasındaki değerlerle karşılaştırılır. Uyuşmazlıkta derleme durur. RFC metninin sha256 özeti <a href="${url('kaynakca')}">kaynakçadaki</a> özetle aynı olmalıdır.</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="Doğrulama tablosu"><table class="fields"><thead><tr><th scope="col">Protokol</th><th scope="col">Karşılaştırılan yerleşim</th><th scope="col">Okunan genişlikler</th></tr></thead><tbody>${protocols.map(protocol => `<tr><th scope="row"><a href="${url(protocol.id)}">${e(protocol.name)}</a></th><td>${refLink({ rfc: protocol.layout.rfc, section: protocol.layout.section })} — ${e(protocol.layout.label)}</td><td><code>${checks.get(protocol.id).found.join(' · ')}</code></td></tr>`).join('')}</tbody></table></div>
<p class="small">ARP ve Ethernet için RFC 826 bit şeması değil, “16.bit: (ar$hrd) …” biçiminde bir liste verir; karşılaştırma o listeyle yapılır. n ve m, uzunluğu ar$hln ve ar$pln alanlarından gelen adresleri gösterir.</p></section>
<section><h2>Elle yazılanlar</h2><ul class="notes"><li>Türkçe alan açıklamaları, ilgili RFC bölümü okunarak yazılmış özetlerdir; çeviri değil. Her açıklamanın altında dayandığı bölümün bağlantısı durur.</li><li>Değer tabloları (ICMP türleri, DNS yanıt kodları gibi) atıf yapılan bölümden aktarılmıştır. Güncel IANA kayıtlarındaki sonradan eklenmiş değerleri içermez.</li></ul></section>
<section><h2>Örnek paketler</h2><ul class="notes"><li>Örnek paketler gerçek trafik yakalamaları değildir. Alan tablosundaki örnek değerlerden derleme sırasında üretilir.</li><li>Sağlama toplamları RFC 1071’deki bire tümleyen toplamıyla, gerektiğinde RFC 768, RFC 9293 ve RFC 8200 §8.1’deki sözde başlıklarla hesaplanır.</li><li>Adresler belgeleme için ayrılmış aralıklardandır: IPv4 için RFC 5737, IPv6 için RFC 3849, MAC için RFC 9542 §2.1.4, alan adı için RFC 2606.</li></ul></section>
<section><h2>Kapsam dışı</h2><ul class="notes"><li>RFC olarak yayımlanmamış standartlar (örneğin IEEE 802.3) kaynak olarak kullanılmaz; bu yüzden Ethernet sayfası yalnızca RFC 826 ve RFC 894’ün tarif ettiği alanları içerir.</li><li>Seçenekler, uzantı başlıkları ve ileti gövdeleri bu sürümde alan alan çözümlenmemiştir.</li></ul></section>` });
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'public'), out, { recursive: true });
async function save(name, content) { const file = path.join(out, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); }
await save('index.html', home());
for (const protocol of protocols) await save(`${protocol.id}/index.html`, protocolPage(protocol));
await save('kilavuz/index.html', guidePage());
await save('kaynakca/index.html', bibliographyPage());
await save('yontem/index.html', methodPage());
await save('lisanslar/index.html', page({ id: 'lisanslar', title: 'Lisanslar', description: 'wire sitesinin, ortak temanın ve yazı tiplerinin lisansları.', body: `<header class="page-header"><h1>Lisanslar ve kaynak bildirimleri</h1></header><ul class="notes"><li>Proje kodu ve Türkçe metinler: GPL-3.0-or-later. <a href="${asset('LICENSE.txt')}">Lisans metni</a>.</li><li>Ortak konsol teması <a href="https://github.com/Zaryob/console-theme">console-theme</a> projesinden gelir; CSS ve JavaScript dosyaları GPL-2.0-or-later bildirimlerini korur. <a href="${asset('assets/console/COPYING')}">GPL v2 metni</a>.</li><li>IBM Plex yazı tipleri SIL Open Font License 1.1 ile dağıtılır. <a href="${asset('assets/console/fonts/OFL.txt')}">OFL metni</a>.</li><li>Simgeler için <a href="${asset('assets/console/ICONS-LICENSE.txt')}">simge lisans bildirimi</a>.</li><li>RFC’ler yazarlarına ve IETF Trust’a aittir; bu sitede metinleri yeniden yayımlanmaz, yalnızca atıf yapılır ve bağlantı verilir.</li></ul>` }));
await save('404.html', page({ id: '404', title: 'Sayfa bulunamadı', description: 'Aradığınız sayfa yok.', indexable: false, body: `<header class="page-header"><p class="eyebrow">wire: böyle bir dosya ya da dizin yok</p><h1>404</h1><p class="lead"><a href="${url('')}">Protokol listesine dön →</a></p></header>` }));
await save('LICENSE.txt', await readFile(path.join(root, 'LICENSE'), 'utf8'));
await save('.nojekyll', '');
await save('search.json', JSON.stringify([
  ...protocols.map(protocol => ({ title: protocol.title, description: protocol.summary, text: protocol.fields.map(field => `${field.name} ${field.desc}`).join(' '), url: `${protocol.id}/`, type: 'wire/', lang: 'tr' })),
  {
    title: 'Ethernet Haberleşme Protokolleri, Paket Mimarisi ve RFC Kılavuzu',
    description: 'Ethernet çerçevesi, VLAN, PPPoE, ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS ve bütün ağ RFC’lerinin ayrıntılı başvuru kılavuzu.',
    text: 'ethernet vlan pppoe arp rarp ndp ipv4 ipv6 icmp icmpv6 tcp udp dns dhcp rfc paket başlık çerçeve sağlama toplamı checksum',
    url: 'kilavuz/',
    type: 'wire/',
    lang: 'tr'
  }
], null, 2));
await save('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...protocols.map(protocol => protocol.id), 'kilavuz', 'yontem', 'kaynakca'].map(id => `<url><loc>${origin}${url(id)}</loc></url>`).join('')}</urlset>`);
console.log(`wire: ${protocols.length} protokol, ${bibliography.entries.length} RFC → _site/ (base: ${base || '/'})`);
