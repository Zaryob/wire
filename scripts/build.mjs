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

const protocols = await loadProtocols();
const byId = new Map(protocols.map(protocol => [protocol.id, protocol]));
const projects = [...JSON.parse(await readFile(path.join(root, 'public/console-projects.json'), 'utf8')), { key: 'wire', title: 'Wire', path: '/wire/', prompt: '~/wire' }];

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
  const nav = [['', 'Protokoller'], ['yontem', 'Yöntem'], ['kaynakca', 'Kaynakça']];
  const chevron = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const menu = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const selected = current === 'kaynakca' || current === 'yontem' ? current : '';
  return `<a class="skip-link" href="#main">İçeriğe geç</a>
<header class="console-header"><div class="console-header__inner">
  <div class="console-identity"><a class="console-brand" href="${origin}/">zaryob</a><span class="console-prompt-separator">:</span>
    <details class="console-projects" data-console-projects><summary aria-label="Proje değiştir"><span class="console-project-path">~/wire</span><span class="console-prompt-dollar">$</span>${chevron}</summary><div class="console-project-menu">
      ${projects.map(project => `<a href="${project.key === 'wire' ? url('') : `${origin}${e(project.path)}`}"${project.key === 'wire' ? ' aria-current="location"' : ''}><span>${e(project.title)}</span><small>${e(project.prompt)}</small></a>`).join('\n      ')}
    </div></details>
  </div>
  <div class="console-header-actions"><button type="button" class="console-menu" data-console-menu aria-label="Menüyü aç" aria-controls="console-navigation" aria-expanded="false">${menu}</button></div>
  <nav class="console-nav" id="console-navigation" aria-label="Ana gezinme">${nav.map(([id, label]) => `<a href="${url(id)}"${selected === id ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
    <div class="console-tools"><label class="console-theme"><span>Tema</span><select data-console-theme aria-label="Renk teması"><option value="system">Sistem</option><option value="light">Açık</option><option value="dark">Koyu</option></select></label></div>
  </nav>
</div></header>`;
}

function page({ id, title, description, body, indexable = true }) {
  const fullTitle = id === '' ? 'wire · Ağ protokolü başlıkları, bit bit' : `${title} · wire`;
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f5f3ed" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#171a1f" media="(prefers-color-scheme: dark)"><meta name="description" content="${e(description)}"><title>${e(fullTitle)}</title><link rel="icon" type="image/svg+xml" href="${asset('favicon.svg')}">${indexable ? `<link rel="canonical" href="${origin}${url(id)}">` : '<meta name="robots" content="noindex">'}<meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}"><meta property="og:site_name" content="wire"><meta property="og:locale" content="tr_TR"><meta property="og:type" content="website"><script src="${asset('assets/console/theme.js')}"></script><link rel="stylesheet" href="${asset('assets/console/theme.css')}"><link rel="stylesheet" href="${asset('style.css')}"><script type="module" src="${asset('app.js')}"></script></head>
<body class="console-site wire-site">${header(id)}
<main id="main" class="wire-main" tabindex="-1">${body}</main>
<footer class="console-footer wire-footer"><div><a href="${url('')}">wire</a> / Ağ protokolü başlıkları, bit bit.<br><span class="footer-note">Her alan bir RFC’ye dayanır; genişlikler RFC metnindeki şemalarla karşılaştırılır.</span></div><div class="footer-links"><a href="${url('kaynakca')}">Kaynakça</a><a href="${url('yontem')}">Yöntem</a><a href="${asset('lisanslar/')}">Lisanslar</a><a href="#main">Başa dön ↑</a></div></footer>
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
  const ruler = Array.from({ length: cols }, (_, bit) => `<span>${bit % 10}</span>`).join('');
  return `<div class="bits-scroll" tabindex="0" role="region" aria-label="${e(protocol.title)} bit şeması"><div class="bits" style="--cols:${cols}"><div class="bits-ruler" aria-hidden="true">${ruler}</div>${cells.map(cell => `<a class="bit-cell${cell.span === 1 ? ' bit-cell--narrow' : ''}${cell.variable ? ' bit-cell--variable' : ''}" style="grid-column:span ${cell.span}" href="#f-${cell.field.key}" data-field="${cell.field.key}"><span>${e(cell.label)}</span></a>`).join('')}</div></div>`;
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

function protocolPage(protocol) {
  const { bytes, headerLength, ranges } = example(protocol.id);
  const fieldsAt = index => protocol.fields.filter(field => ranges[field.key] && ranges[field.key].offset < (index + 1) * 8 && ranges[field.key].offset + ranges[field.key].bits > index * 8).map(field => field.key);
  const rows = [];
  for (let start = 0; start < bytes.length; start += 8) {
    rows.push(`<div class="hex-row"><span class="hex-offset">${hex(start, 4)}</span>${bytes.slice(start, start + 8).map((byte, i) => {
      const index = start + i;
      return index < headerLength ? `<span class="hex-byte" data-fields="${fieldsAt(index).join(' ')}">${hex(byte)}</span>` : `<span class="hex-byte hex-byte--payload">${hex(byte)}</span>`;
    }).join('')}</div>`);
  }
  const table = protocol.fields.map(field => {
    const range = ranges[field.key];
    const position = range ? (range.bits === 1 ? `${range.offset}` : `${range.offset}–${range.offset + range.bits - 1}`) : '—';
    const values = field.values ? `<dl class="field-values">${field.values.map(([value, label]) => `<div><dt>${e(value)}</dt><dd>${e(label)}</dd></div>`).join('')}</dl>` : '';
    return `<tr id="f-${field.key}" data-field="${field.key}" tabindex="0"><th scope="row">${e(field.name)}</th><td class="num">${position}</td><td class="num">${Number.isInteger(field.bits) ? field.bits : 'değişken'}</td><td class="num"><code>${e(exampleValue(field, range, bytes))}</code></td><td><p>${e(field.desc)}</p>${values}<p class="field-ref">${refLink(field.ref)}</p></td></tr>`;
  }).join('');
  const layoutRef = { rfc: protocol.layout.rfc, section: protocol.layout.section, label: protocol.layout.section ? undefined : protocol.layout.label };
  const index = protocols.indexOf(protocol);
  const neighbor = (item, label) => item ? `<a href="${url(item.id)}"><small>${label}</small>${e(item.name)}</a>` : '<span></span>';
  return page({ id: protocol.id, title: protocol.title, description: protocol.summary, body: `
<nav class="breadcrumbs" aria-label="Konum"><a href="${url('')}">~/wire</a><span aria-hidden="true">/</span><span>${e(protocol.id)}</span></nav>
<header class="page-header"><p class="eyebrow">${e(protocol.layer)} katmanı · ${headerLength} sekizli${protocol.fields.some(field => !Number.isInteger(field.bits)) ? ' + değişken kısım' : ''}</p><h1>${e(protocol.title)}</h1><p class="lead">${e(protocol.summary)}</p></header>
<section aria-labelledby="layout-title"><h2 id="layout-title">Yerleşim</h2>${diagram(protocol)}
<p class="verified">Alan genişlikleri ${refLink(layoutRef)}${protocol.layout.section ? ` (${e(protocol.layout.label)})` : ''} ile derleme sırasında karşılaştırıldı: <code>${checks.get(protocol.id).found.join(' · ')}</code>${protocol.layout.kind === 'rfc826' && protocol.layout.part === 'arp' ? ' (n ve m: ar$hln ve ar$pln sekizli)' : ' bit'}.</p></section>
<section aria-labelledby="example-title"><h2 id="example-title">Örnek paket</h2><p>${e(protocol.example.note)}</p><div class="hex" role="group" aria-label="Örnek paketin onaltılık dökümü">${rows.join('')}</div><p class="small">Bu paket gerçek bir yakalama değildir: aşağıdaki tablodaki örnek değerlerden derleme sırasında üretilir, sağlama toplamları RFC 1071’deki yöntemle hesaplanır. Bir alanın üzerine gelin ya da alana tıklayın; karşılık gelen sekizliler vurgulanır.${bytes.length > headerLength ? ' Soluk sekizliler başlıktan sonraki yüktür.' : ''}</p></section>
<section aria-labelledby="fields-title"><h2 id="fields-title">Alanlar</h2><div class="table-scroll" tabindex="0" role="region" aria-label="${e(protocol.title)} alanları"><table class="fields"><thead><tr><th scope="col">Alan</th><th scope="col">Bit</th><th scope="col">Genişlik</th><th scope="col">Örnek</th><th scope="col">Açıklama ve kaynak</th></tr></thead><tbody>${table}</tbody></table></div></section>
${protocol.notes?.length ? `<section aria-labelledby="notes-title"><h2 id="notes-title">Notlar</h2><ul class="notes">${protocol.notes.map(note => `<li>${e(note)}</li>`).join('')}</ul></section>` : ''}
<section aria-labelledby="refs-title"><h2 id="refs-title">Kaynaklar</h2><ol class="references">${protocol.refs.map(number => { const entry = rfcEntry(number); return `<li><a href="${url('kaynakca')}#rfc${number}">[RFC ${number}]</a> ${citation(entry)}</li>`; }).join('')}</ol></section>
<nav class="page-neighbors" aria-label="Önceki ve sonraki protokol">${neighbor(protocols[index - 1], '← Önceki')}${neighbor(protocols[index + 1], 'Sonraki →')}</nav>` });
}

function home() {
  const layers = [...new Set(protocols.map(protocol => protocol.layer))];
  return page({ id: '', title: 'wire', description: 'Ethernet, ARP, IPv4, IPv6, ICMP, UDP, TCP ve DNS başlıklarının RFC kaynaklı, bit düzeyinde Türkçe başvurusu.', body: `
<header class="page-header"><p class="eyebrow">~/wire · ağ protokolü başlıkları</p><h1>Tel üzerindeki her bit, kaynağıyla.</h1><p class="lead">Bir protokol seçin: başlığın bit şemasını, her alanın anlamını ve örnek bir paketin sekizlilerini yan yana görün. Bütün bilgiler RFC’lerden alınmıştır ve her alan dayandığı bölüme bağlanır.</p></header>
<label class="filter"><span>Protokol ara</span><input id="protocol-filter" type="search" placeholder="tcp, sağlama toplamı, 791…" autocomplete="off" spellcheck="false"></label>
<p id="filter-status" class="small" role="status" aria-live="polite"></p>
${layers.map(layer => `<section class="layer" aria-labelledby="layer-${e(layer)}"><h2 id="layer-${e(layer)}">${e(layer)} katmanı</h2><ul class="protocol-list">${protocols.filter(protocol => protocol.layer === layer).map(protocol => {
    const { headerLength } = example(protocol.id);
    return `<li class="protocol-card" data-search="${e(`${protocol.name} ${protocol.title} ${protocol.summary} ${protocol.fields.map(field => field.name).join(' ')} ${protocol.refs.join(' ')}`.toLocaleLowerCase('tr'))}"><p class="protocol-card__path">~/wire/${e(protocol.id)}</p><h3><a href="${url(protocol.id)}">${e(protocol.title)}</a></h3><p>${e(protocol.summary)}</p><p class="protocol-card__meta">${headerLength} sekizli · ${protocol.fields.filter(field => Number.isInteger(field.bits)).length} alan · RFC ${protocol.layout.rfc}</p></li>`;
  }).join('')}</ul></section>`).join('')}` });
}

function bibliographyPage() {
  const citedBy = number => protocols.filter(protocol => protocol.refs.includes(number));
  const list = values => values.length ? values.map(value => e(value.replace(/^RFC0*/, 'RFC '))).join(', ') : '—';
  return page({ id: 'kaynakca', title: 'Kaynakça', description: 'wire sitesindeki bilgilerin dayandığı RFC’lerin künyeleri, bağlantıları ve indirilen metinlerin sha256 özetleri.', body: `
<nav class="breadcrumbs" aria-label="Konum"><a href="${url('')}">~/wire</a><span aria-hidden="true">/</span><span>kaynakca</span></nav>
<header class="page-header"><p class="eyebrow">${bibliography.entries.length} RFC · ${e(bibliography.retrieved)} tarihinde indirildi</p><h1>Kaynakça</h1><p class="lead">Sitedeki her bilgi aşağıdaki RFC’lerden birine dayanır. Metinler <a href="${e(bibliography.source)}">rfc-editor.org</a> adresinden indirilmiştir; sha256 özeti, alan genişliklerinin hangi metne karşı doğrulandığını gösterir.</p></header>
<ol class="bibliography">${bibliography.entries.map(entry => `<li id="rfc${entry.number}"><h2>RFC ${entry.number}</h2><p class="citation">${citation(entry)} <a href="${e(entry.url)}">${e(entry.url.replace('https://', ''))}</a></p><dl><div><dt>Durum</dt><dd>${e(entry.status)}</dd></div><div><dt>DOI</dt><dd><a href="https://doi.org/${e(entry.doi)}">${e(entry.doi)}</a></dd></div><div><dt>Yerine geçtiği</dt><dd>${list(entry.obsoletes)}</dd></div><div><dt>Yerine geçen</dt><dd>${list(entry.obsoleted_by)}</dd></div><div><dt>Güncelleyen</dt><dd>${list(entry.updated_by)}</dd></div><div><dt>Burada kullanımı</dt><dd>${e(entry.use)}</dd></div><div><dt>Atıf yapan sayfalar</dt><dd>${citedBy(entry.number).map(protocol => `<a href="${url(protocol.id)}">${e(protocol.name)}</a>`).join(', ') || '—'}</dd></div><div><dt>sha256</dt><dd><code>${entry.sha256}</code> (${entry.bytes} sekizli)</dd></div></dl></li>`).join('')}</ol>` });
}

function methodPage() {
  return page({ id: 'yontem', title: 'Yöntem', description: 'wire sitesindeki verinin RFC’lerden nasıl alındığı ve nasıl doğrulandığı.', body: `
<nav class="breadcrumbs" aria-label="Konum"><a href="${url('')}">~/wire</a><span aria-hidden="true">/</span><span>yontem</span></nav>
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
await save('kaynakca/index.html', bibliographyPage());
await save('yontem/index.html', methodPage());
await save('lisanslar/index.html', page({ id: 'lisanslar', title: 'Lisanslar', description: 'wire sitesinin, ortak temanın ve yazı tiplerinin lisansları.', body: `<header class="page-header"><h1>Lisanslar ve kaynak bildirimleri</h1></header><ul class="notes"><li>Proje kodu ve Türkçe metinler: GPL-3.0-or-later. <a href="${asset('LICENSE.txt')}">Lisans metni</a>.</li><li>Ortak konsol teması <a href="https://github.com/Zaryob/console-theme">console-theme</a> projesinden gelir; CSS ve JavaScript dosyaları GPL-2.0-or-later bildirimlerini korur. <a href="${asset('assets/console/COPYING')}">GPL v2 metni</a>.</li><li>IBM Plex yazı tipleri SIL Open Font License 1.1 ile dağıtılır. <a href="${asset('assets/console/fonts/OFL.txt')}">OFL metni</a>.</li><li>Simgeler için <a href="${asset('assets/console/ICONS-LICENSE.txt')}">simge lisans bildirimi</a>.</li><li>RFC’ler yazarlarına ve IETF Trust’a aittir; bu sitede metinleri yeniden yayımlanmaz, yalnızca atıf yapılır ve bağlantı verilir.</li></ul>` }));
await save('404.html', page({ id: '404', title: 'Sayfa bulunamadı', description: 'Aradığınız sayfa yok.', indexable: false, body: `<header class="page-header"><p class="eyebrow">wire: böyle bir dosya ya da dizin yok</p><h1>404</h1><p class="lead"><a href="${url('')}">Protokol listesine dön →</a></p></header>` }));
await save('LICENSE.txt', await readFile(path.join(root, 'LICENSE'), 'utf8'));
await save('.nojekyll', '');
await save('search.json', JSON.stringify(protocols.map(protocol => ({ title: protocol.title, description: protocol.summary, text: protocol.fields.map(field => `${field.name} ${field.desc}`).join(' '), url: `${protocol.id}/`, type: 'wire/', lang: 'tr' })), null, 2));
await save('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...protocols.map(protocol => protocol.id), 'yontem', 'kaynakca'].map(id => `<url><loc>${origin}${url(id)}</loc></url>`).join('')}</urlset>`);
console.log(`wire: ${protocols.length} protokol, ${bibliography.entries.length} RFC → _site/ (base: ${base || '/'})`);
