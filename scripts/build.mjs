import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { root, bibliography, standards, rfcEntry, standardEntry, isRfc, refKey, verifyLayout, loadProtocols } from '../src/sources.mjs';
import { encodeExample } from '../src/encode.mjs';
import { englishTitles, englishSummaries, layerNames, osiDescriptionsEn, groupTitlesEn } from '../src/translations.mjs';

const out = path.join(root, '_site');
const base = (process.env.SITE_BASEURL ?? '/wire').replace(/\/+$/, '');
const origin = 'https://zaryob.github.io';
const e = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const url = (id, lang = 'en') => {
  if (lang === 'tr') return `${base}/tr/${id ? `${id}/` : ''}`;
  return `${base}/${id ? `${id}/` : ''}`;
};
const canonicalUrl = (id, lang = 'en') => `${origin}${url(id, lang)}`;
const asset = name => `${base}/${name}`;
const hex = (value, digits = 2) => value.toString(16).padStart(digits, '0');

const layerKey = layer => {
  switch (layer) {
    case 'Bağlantı':
    case 'Link': return 'link';
    case 'Ağ':
    case 'Network':
    case 'Internet': return 'network';
    case 'Taşıma':
    case 'İletim':
    case 'Transport': return 'transport';
    case 'Uygulama':
    case 'Application': return 'application';
    default: return 'default';
  }
};

const layerName = (layer, lang = 'en') => layerNames[lang]?.[layerKey(layer)] ?? layer;
const protocolTitle = (protocol, lang = 'en') => lang === 'tr' ? protocol.title : (englishTitles[protocol.id] || `${protocol.name} Header`);
const protocolSummary = (protocol, lang = 'en') => lang === 'tr' ? (protocol.summary_tr || protocol.summary) : (protocol.summary_en || englishSummaries[protocol.id] || protocol.summary);
const protocolNotes = (protocol, lang = 'en') => lang === 'tr' ? (protocol.notes_tr || protocol.notes || []) : (protocol.notes_en || protocol.notes || []);
const protocolExampleNote = (protocol, lang = 'en') => {
  if (!protocol.example) return '';
  return lang === 'tr' ? (protocol.example.note_tr || protocol.example.note) : (protocol.example.note_en || protocol.example.note);
};
const fieldDesc = (field, lang = 'en') => lang === 'tr' ? (field.desc_tr || field.desc || '') : (field.desc_en || field.desc || '');
const fieldValues = (field, lang = 'en') => lang === 'tr' ? (field.values_tr || field.values || null) : (field.values_en || field.values || null);

const protocols = await loadProtocols();
const byId = new Map(protocols.map(protocol => [protocol.id, protocol]));
const projects = JSON.parse(await readFile(path.join(root, 'public/console-projects.json'), 'utf8'));
const layersData = JSON.parse(await readFile(path.join(root, 'data/layers.json'), 'utf8'));
const layersRefs = [...new Set([...layersData.refs, ...layersData.groups.flatMap(group => group.items.flatMap(item => item.refs))])];

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
  if (check.stale) throw new Error(`${protocol.id}: ${protocol.layout.std} metni veya MIB dosyası doğrulama kaydıyla uyuşmuyor. npm run sync:ieee komutunu çalıştırıp değişikliği inceleyin.`);
  const failed = [...(check.partial ?? []), ...(check.items ?? []), ...(check.mibItems ?? [])].filter(item => !item.ok);
  if (failed.length) throw new Error(`${protocol.id}: Veri ${protocol.layout.std} ile uyuşmuyor. ${failed.map(item => item.what).join('; ')}`);
  const against = protocol.layout.kind === 'ieee' ? protocol.layout.std : `RFC ${protocol.layout.rfc}`;
  if (!check.ok) throw new Error(`${protocol.id}: Alanlar ${against} ile uyuşmuyor. Veri: ${check.expected}. Kaynak: ${check.found}.`);
  checks.set(protocol.id, check);
  for (const ref of protocol.refs) if (isRfc(ref)) rfcEntry(ref); else standardEntry(ref);
  for (const field of protocol.fields) if (!protocol.refs.includes(refKey(field.ref))) throw new Error(`${protocol.id}.${field.key}: ${refKey(field.ref)} sayfanın kaynak listesinde bulunamadı.`);
}

const refText = (ref, lang = 'en') => {
  const isTr = lang === 'tr';
  const pageLabel = isTr ? 's.' : 'p.';
  return `${ref.std ? standardEntry(ref.std).short : `RFC ${ref.rfc}`}${ref.section ? ` §${ref.section}` : ref.label ? `, “${ref.label}”` : ''}${ref.page ? `, ${pageLabel} ${ref.page}` : ''}`;
};
const refUrl = ref => (ref.std ? standardEntry(ref.std).url : `${rfcEntry(ref.rfc).url}${ref.section ? `#section-${ref.section}` : ''}`);
const refLink = (ref, lang = 'en') => `<a class="rfc-ref" href="${refUrl(ref)}">${e(refText(ref, lang))}</a>`;
const citation = entry => `${e(entry.authors.join(', '))}, “${e(entry.title)}”, RFC ${entry.number}, ${e(entry.date)}.`;
const standardCitation = entry => `${e(entry.publisher)}, “${e(entry.title)}”, ${e(entry.designation)}${entry.doi ? `, DOI ${e(entry.doi)}` : ''}.`;
const source = ref => isRfc(ref)
  ? { label: `RFC ${ref}`, anchor: `rfc${ref}`, citation: citation(rfcEntry(ref)) }
  : { label: standardEntry(ref).short, anchor: ref, citation: standardCitation(standardEntry(ref)) };
const layoutRefs = protocol => {
  const { layout } = protocol;
  if (layout.kind === 'standard' || layout.kind === 'ieee') return [];
  if (!layout.parts) return [{ rfc: layout.rfc, section: layout.section, label: layout.section ? undefined : layout.label }];
  const seen = new Map();
  for (const part of layout.parts) {
    const ref = { rfc: part.rfc ?? layout.rfc, section: part.section ?? (part.rfc ? undefined : layout.section) };
    seen.set(`${ref.rfc} ${ref.section}`, ref);
  }
  return [...seen.values()];
};
const isVerified = protocol => protocol.layout.kind !== 'standard';
const rangeText = (range, lang = 'en') => {
  if (lang === 'tr') {
    if (range === 'i') return 'değişken uzunluklu tamsayı';
    if (range === '..') return 'herhangi bir uzunluk';
    const bounds = range.match(/^(\d*)\.\.(\d*)$/);
    if (!bounds) return range;
    if (bounds[1] && bounds[2]) return `${bounds[1]}–${bounds[2]} bit`;
    return bounds[1] ? `en az ${bounds[1]} bit` : `en çok ${bounds[2]} bit`;
  }
  if (range === 'i') return 'variable-length integer';
  if (range === '..') return 'any length';
  const bounds = range.match(/^(\d*)\.\.(\d*)$/);
  if (!bounds) return range;
  if (bounds[1] && bounds[2]) return `${bounds[1]}–${bounds[2]} bits`;
  return bounds[1] ? `at least ${bounds[1]} bits` : `at most ${bounds[2]} bits`;
};
const widthText = (field, lang = 'en') => {
  const unit = lang === 'tr' ? ' bit' : ' bits';
  const varText = lang === 'tr' ? 'değişken' : 'variable';
  return `${Number.isInteger(field.bits) ? `${field.bits}${unit}` : varText}${field.range ? ` (${rangeText(field.range, lang)})` : ''}`;
};
const joinTr = items => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ve ${items.at(-1)}`);
const joinEn = items => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

function verifiedNote(protocol, lang = 'en') {
  const isTr = lang === 'tr';
  const { layout } = protocol;
  const check = checks.get(protocol.id);
  const found = (check.widths ?? check.found).join(' · ');
  if (isTr) {
    if (layout.kind === 'ieee' && layout.method) {
      const entry = standardEntry(layout.std);
      const refs = joinTr(layout.refs.map(ref => `${refLink(ref, 'tr')} (${e(ref.label)})`));
      const how = check.source === 'text'
        ? `Bu derleme standardın metnini lisanslı kopyadan${layout.mib ? ', MIB modüllerini de kendi dosyalarından' : ''} okudu.`
        : `Bu derlemede metin yoktu; karşılaştırma ${e(layout.checked.date)} tarihinde lisanslı bir kopya üzerinde yapıldı ve sonucu veri dosyasına kaydedildi. Derleme veriyi bu kayda karşı denetler.`;
      const mib = layout.mib ? ` Ayrıca ${e(entry.mib.clause)} maddesindeki MIB modülleriyle (${entry.mib.files.map(item => e(item.module)).join(', ')}) ${check.mibItems.length} denetim yapılır.` : '';
      return `<p class="verified">Alan genişlikleri (<code>${found}</code> bit), ${layout.method === 'lldp' ? 'tür numaraları ve değerler' : 'değerler'} ${refs} ile karşılaştırıldı. Standardın figürleri PDF'te tam olarak metin halinde bulunmadığı için yerleşim, aynı bilgiyi yazıyla ve tablolarla veren maddelerden okunur: ${e(check.items.map(item => item.what).join('; '))}.${mib} ${e(entry.short)} metni lisanslı olduğu için depoda bulunmaz. ${how} Kullanılan kopyanın sha256 özeti <code>${e(layout.checked.sha256.slice(0, 16))}…</code>.</p>`;
    }
    if (layout.kind === 'ieee') {
      const entry = standardEntry(layout.std);
      const refs = joinTr(layout.refs.map(ref => `${refLink(ref, 'tr')} (${e(ref.label)})`));
      const how = check.source === 'text'
        ? 'Bu derleme metni lisanslı kopyadan okudu.'
        : `Bu derlemede metin yoktu; karşılaştırma ${e(layout.checked.date)} tarihinde lisanslı bir kopya üzerinde yapıldı ve sonucu veri dosyasına kaydedildi. Derleme alanları bu kayda karşı denetler.`;
      return `<p class="verified">Alan adları ve genişlikleri ${refs} ile karşılaştırıldı: <code>${found}</code> bit. ${e(entry.short)} metni lisanslı olduğu için depoda bulunmaz. ${how} Kullanılan kopyanın sha256 özeti <code>${e(layout.checked.sha256.slice(0, 16))}…</code>; IEEE her indirmeye kendi filigranını eklediği için başka kopyaların özeti farklıdır.</p>`;
    }
    if (layout.kind === 'standard') {
      const ref = refLink({ std: layout.std }, 'tr');
      if (check.partial) {
        const entry = standardEntry(layout.std);
        const how = check.source === 'text'
          ? 'Bu derleme MIB dosyalarını okudu.'
          : `Bu derlemede MIB dosyaları yoktu; karşılaştırma ${e(layout.mib.checked.date)} tarihinde yapıldı ve sonucu veri dosyasına kaydedildi. Derleme veriyi bu kayda karşı denetler.`;
        return `<p class="verified verified--manual"><strong>Kısmen doğrulandı.</strong> Bu protokolü ${ref} tanımlar; standardın gövde metni okunmadı, bu yüzden TLV'lerin sırası ve tür numaraları gibi yerleşim bilgileri doğrulanmamıştır. Standardın ${e(entry.mib.clause)} maddesinde yayımlanan MIB modülleri (${entry.mib.files.map(item => e(item.module)).join(', ')}) ise okundu ve şunlar onlara karşı karşılaştırıldı: ${e(check.partial.map(item => item.what).join('; '))}. ${how}</p>`;
      }
      return `<p class="verified verified--manual"><strong>Makineyle doğrulanmadı, kaynağı okunmadı.</strong> Bu protokolü ${ref} tanımlar, ancak o standardın metni okunmadı ve alanları çizen bir RFC yok. Alan adları, genişlikler (<code>${found}</code> bit) ve değer tabloları genel bilgiden yazıldı; hiçbir kaynak metne karşı karşılaştırılmadı.</p>`;
    }
    if (layout.kind === 'ber') {
      return `<p class="verified">Örnek paket, ${refLink({ rfc: layout.rfc, section: layout.section }, 'tr')} içindeki BER kodlamasıyla sekizli sekizli (${check.octets} sekizli) karşılaştırıldı; değer alanlarının sırası ${refLink({ rfc: layout.asn1.rfc, section: layout.asn1.section }, 'tr')} içindeki tanımla aynıdır: <code>${e(check.members.join(' · '))}</code>. BER'de alan genişlikleri sabit değildir; tablodaki genişlikler bu kodlamaya aittir.</p>`;
    }
    const refs = joinTr(layoutRefs(protocol).map(ref => refLink(ref, 'tr')));
    const label = !layout.parts && layout.section ? ` (${e(layout.label)})` : '';
    const unit = layout.kind === 'rfc826' && layout.part === 'arp' ? ' (n ve m: ar$hln ve ar$pln sekizli)'
      : layout.kind === 'figure' ? ' (sayılar bit; i: değişken uzunluklu tamsayı, a..b: bit cinsinden aralık). Aralığı olan alanlar bu örnek için boyutlandırılmıştır ve genişlikleri o aralıkta olmalıdır'
      : layout.kind === 'struct' || layout.kind === 'ssh' ? ' (sayılar bit; var: uzunluğu başka bir alandan hesaplanan alan). Değişken alanlar bu örnek için boyutlandırılmıştır'
      : ' bit';
    return `<p class="verified">Alan genişlikleri ${refs}${label} ile derleme sırasında karşılaştırıldı: <code>${found}</code>${unit}.${layout.note ? ` ${e(layout.note)}` : ''}</p>`;
  }

  // English
  if (layout.kind === 'ieee' && layout.method) {
    const entry = standardEntry(layout.std);
    const refs = joinEn(layout.refs.map(ref => `${refLink(ref, 'en')} (${e(ref.label)})`));
    const how = check.source === 'text'
      ? `This build read the standard's text from a licensed copy${layout.mib ? ', and MIB modules from their own files' : ''}.`
      : `This build lacked the text; comparison was performed on a licensed copy on ${e(layout.checked.date)} and recorded in the data file. The build validates data against this record.`;
    const mib = layout.mib ? ` In addition, ${check.mibItems.length} checks are performed against MIB modules in clause ${e(entry.mib.clause)} (${entry.mib.files.map(item => e(item.module)).join(', ')}).` : '';
    return `<p class="verified">Field widths (<code>${found}</code> bits), ${layout.method === 'lldp' ? 'type numbers, and values' : 'values'} were compared against ${refs}. Because standard figures are not fully textual in PDF, layout is extracted from clauses providing the same data in prose and tables: ${e(check.items.map(item => item.what).join('; '))}.${mib} ${e(entry.short)} text is licensed and not included in this repository. ${how} SHA-256 digest of the copy used: <code>${e(layout.checked.sha256.slice(0, 16))}…</code>.</p>`;
  }
  if (layout.kind === 'ieee') {
    const entry = standardEntry(layout.std);
    const refs = joinEn(layout.refs.map(ref => `${refLink(ref, 'en')} (${e(ref.label)})`));
    const how = check.source === 'text'
      ? 'This build read the text from a licensed copy.'
      : `This build lacked the text; comparison was performed on a licensed copy on ${e(layout.checked.date)} and recorded in the data file. The build checks fields against this record.`;
    return `<p class="verified">Field names and widths were compared against ${refs}: <code>${found}</code> bits. ${e(entry.short)} text is licensed and not stored in this repository. ${how} SHA-256 digest of the copy used: <code>${e(layout.checked.sha256.slice(0, 16))}…</code>; IEEE adds unique watermarks per download, so other copies may differ in digest.</p>`;
  }
  if (layout.kind === 'standard') {
    const ref = refLink({ std: layout.std }, 'en');
    if (check.partial) {
      const entry = standardEntry(layout.std);
      const how = check.source === 'text'
        ? 'This build read the MIB files.'
        : `This build lacked MIB files; comparison was performed on ${e(layout.mib.checked.date)} and recorded in the data file. The build checks data against this record.`;
      return `<p class="verified verified--manual"><strong>Partially verified.</strong> This protocol is defined in ${ref}; the standard body text was not read, so layout details such as TLV ordering and type numbers are not verified. However, MIB modules published in clause ${e(entry.mib.clause)} (${entry.mib.files.map(item => e(item.module)).join(', ')}) were read and verified: ${e(check.partial.map(item => item.what).join('; '))}. ${how}</p>`;
    }
    return `<p class="verified verified--manual"><strong>Not machine-verified, source not read.</strong> This protocol is defined in ${ref}, but the standard text was not read and no RFC draws its fields. Field names, widths (<code>${found}</code> bits), and value tables were authored from general knowledge; not compared against primary source text.</p>`;
  }
  if (layout.kind === 'ber') {
    return `<p class="verified">The example packet was compared octet-by-octet (${check.octets} octets) with the BER encoding in ${refLink({ rfc: layout.rfc, section: layout.section }, 'en')}; value field ordering matches ${refLink({ rfc: layout.asn1.rfc, section: layout.asn1.section }, 'en')}: <code>${e(check.members.join(' · '))}</code>. BER field widths are not fixed; widths in the table reflect this sample encoding.</p>`;
  }
  const refs = joinEn(layoutRefs(protocol).map(ref => refLink(ref, 'en')));
  const label = !layout.parts && layout.section ? ` (${e(layout.label)})` : '';
  const unit = layout.kind === 'rfc826' && layout.part === 'arp' ? ' (n and m: ar$hln and ar$pln octets)'
    : layout.kind === 'figure' ? ' (numbers in bits; i: variable-length integer, a..b: range in bits). Fields with a range are sized for this example and must fall within that range'
    : layout.kind === 'struct' || layout.kind === 'ssh' ? ' (numbers in bits; var: length computed from another field). Variable fields are sized for this example'
    : ' bits';
  return `<p class="verified">Field widths were verified against ${refs}${label} during build: <code>${found}</code>${unit}.${layout.note ? ` ${e(layout.note)}` : ''}</p>`;
}

function header(current, lang = 'en') {
  const isTr = lang === 'tr';
  const chevron = '<svg class="console-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const menu = '<svg class="console-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const search = `<svg class="console-icon" aria-hidden="true" focusable="false"><use href="${asset('assets/console/site.svg#search')}"></use></svg>`;

  return `<a class="skip-link" href="#main">${isTr ? 'İçeriğe geç' : 'Skip to content'}</a>
<header class="console-header"><div class="console-header__inner">
  <div class="console-identity"><a class="console-brand" href="${origin}/" aria-label="${isTr ? 'Zaryob ana sayfa' : 'Zaryob home'}">zaryob</a><span class="console-prompt-separator" aria-hidden="true">:</span>
    <details class="console-projects" data-console-projects><summary role="button" aria-controls="console-project-menu"><span class="console-project-path"><span class="console-prompt-separator">~/</span>wire</span><span class="console-sr-only"> — ${isTr ? 'Proje değiştir' : 'Switch project'}</span><span class="console-prompt-dollar" aria-hidden="true">$</span><span class="console-prompt-cursor" aria-hidden="true"></span>${chevron}</summary><nav class="console-project-menu" id="console-project-menu" aria-label="${isTr ? 'Zaryob projeleri' : 'Zaryob projects'}">
      ${projects.map(project => {
        const tr = project.key === 'wire' ? url('', 'tr') : origin + (project.path_tr ?? project.path);
        const en = project.key === 'wire' ? url('', 'en') : origin + (project.path_en ?? project.path);
        const active = project.key === 'wire' ? ' aria-current="location"' : '';
        const title = isTr ? project.title : (project.title_en || project.title);
        const target = isTr ? tr : en;
        return `<a href="${e(target)}" data-project-tr="${e(tr)}" data-project-en="${e(en)}"${active}><span>${e(title)}</span><small>${e(project.prompt)}</small></a>`;
      }).join('\n      ')}
    </nav></details>
  </div>
  <div class="console-header-actions">
    <button class="console-search-compact" type="button" data-console-search-compact aria-haspopup="dialog" aria-label="${isTr ? 'Zaryob içeriklerinde ara' : 'Search Zaryob content'}">${search}</button>
    <button type="button" class="console-menu" data-console-menu aria-label="${isTr ? 'Menüyü aç' : 'Open menu'}" aria-controls="console-navigation" aria-expanded="false">${menu}</button>
  </div>
  <nav class="console-nav" id="console-navigation" aria-label="${isTr ? 'Zaryob gezinme' : 'Zaryob navigation'}">
    <div class="console-tools">
      <button class="console-search-open" type="button" data-console-search data-suite-root="${origin}/" data-wire-root="${url('', lang)}" aria-haspopup="dialog">
        ${search}
        <span><span data-i18n="Search">${isTr ? 'Ara' : 'Search'}</span><span class="console-sr-only"> — <span data-i18n="Zaryob content">${isTr ? 'Zaryob içerikleri' : 'Zaryob content'}</span></span></span>${current === '' ? '' : '<kbd aria-hidden="true">/</kbd>'}
      </button>
      <label class="console-theme"><span><span data-i18n="Theme">${isTr ? 'Tema' : 'Theme'}</span></span><select id="console-theme-select" name="theme" data-console-theme aria-label="${isTr ? 'Renk teması' : 'Color theme'}" data-i18n-aria-label="Color theme"><option value="system" data-i18n="System">${isTr ? 'Sistem' : 'System'}</option><option value="dark" data-i18n="Dark">${isTr ? 'Koyu' : 'Dark'}</option><option value="light" data-i18n="Light">${isTr ? 'Açık' : 'Light'}</option></select></label>
      <label class="console-language"><span data-i18n="Language">${isTr ? 'Dil' : 'Language'}</span><select id="console-language-select" name="language" data-console-language aria-label="Language / Dil"><option value="tr" lang="tr"${isTr ? ' selected' : ''}>TR</option><option value="en" lang="en"${!isTr ? ' selected' : ''}>EN</option></select></label>
    </div>
  </nav>
</div></header>`;
}

function topbar(current, title = '', layer = '', lang = 'en') {
  const isTr = lang === 'tr';
  const gridIcon = '<svg class="button-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
  const homeIcon = '<svg class="button-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  const layersIcon = '<svg class="button-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>';
  const bookIcon = '<svg class="button-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

  let breadcrumbsHtml = `<a href="${url('', lang)}" class="home-crumb">${homeIcon}<span>${isTr ? 'Ana sayfa' : 'Home'}</span></a>`;
  if (current) {
    if (layer) {
      breadcrumbsHtml += `<span class="crumb-sep" aria-hidden="true">/</span><span>${e(layerName(layer, lang))}</span>`;
    }
    breadcrumbsHtml += `<span class="crumb-sep" aria-hidden="true">/</span><strong aria-current="page">${e(title || current)}</strong>`;
  }

  return `<header class="topbar">
  <div class="topbar-left">
    <a href="${url('', lang)}" class="button primary board-picker-btn">
      ${gridIcon}
      <span>${isTr ? 'Protokoller' : 'Protocols'}</span>
      <span class="count">${protocols.length}</span>
      <span class="console-sr-only"> — ${isTr ? 'protokol kütüphanesi' : 'protocol library'}</span>
    </a>
    <nav class="breadcrumbs" aria-label="${isTr ? 'Konum' : 'Location'}">
      ${breadcrumbsHtml}
    </nav>
  </div>
  <div class="topbar-right">
    <a href="${url('', lang)}#${isTr ? 'katmanlar' : 'layers'}" class="button secondary help-btn layers-btn">
      ${layersIcon}
      <span>${isTr ? 'Katmanlar' : 'Layers'}</span>
      <span class="console-sr-only"> — ${isTr ? 'OSI ve TCP/IP katmanları, sık kullanılan protokoller' : 'OSI and TCP/IP layers, common protocols'}</span>
    </a>
    <a href="${url('kilavuz', lang)}" class="button secondary help-btn">
      ${bookIcon}
      <span>${isTr ? 'Kılavuz' : 'Guide'}</span>
      <span class="console-sr-only"> — ${isTr ? 'nasıl kullanılır ve RFC kılavuzu' : 'how to use and RFC guide'}</span>
    </a>
  </div>
</header>`;
}

function suiteFooter(lang = 'en') {
  const isTr = lang === 'tr';
  const column = (title, label, links, listClass = '') => `<nav class="suite-footer__col" aria-label="${e(label)}"><p class="suite-footer__title">${title}</p><ul${listClass ? ` class="${listClass}"` : ''}>${links.map(link => `<li>${link}</li>`).join('')}</ul></nav>`;
  const siteLinks = [
    `<a href="${url('', lang)}#${isTr ? 'katmanlar' : 'layers'}">#${isTr ? 'katmanlar' : 'layers'}<span class="console-sr-only"> — ${isTr ? 'Katmanlar' : 'Layers'}</span></a>`,
    `<a href="${url('kilavuz', lang)}">${isTr ? 'kilavuz/' : 'guide/'}<span class="console-sr-only"> — ${isTr ? 'Kılavuz' : 'Guide'}</span></a>`,
    `<a href="${url('kaynakca', lang)}">${isTr ? 'kaynakca/' : 'references/'}<span class="console-sr-only"> — ${isTr ? 'Kaynakça' : 'References'}</span></a>`,
    `<a href="${url('yontem', lang)}">${isTr ? 'yontem/' : 'methodology/'}<span class="console-sr-only"> — ${isTr ? 'Yöntem' : 'Methodology'}</span></a>`,
    `<a href="${url('lisanslar', lang)}">${isTr ? 'lisanslar/' : 'licenses/'}<span class="console-sr-only"> — ${isTr ? 'Lisanslar' : 'Licenses'}</span></a>`
  ];
  const site = column('~/wire/', 'Wire', siteLinks);
  const suite = column(
    isTr ? '~/siteler/' : '~/sites/',
    isTr ? 'Zaryob siteleri' : 'Zaryob sites',
    projects.filter(project => project.key !== 'home').map(project => {
      const target = project.key === 'wire' ? url('', lang) : (origin + ((isTr ? project.path_tr : project.path_en) ?? project.path));
      const title = isTr ? project.title : (project.title_en || project.title);
      return `<a href="${e(target)}"${project.key === 'wire' ? ' aria-current="location"' : ''}>${e(project.prompt)}/<span class="console-sr-only"> — ${e(title)}</span></a>`;
    }),
    'console-suite__list'
  );
  const contact = column(
    isTr ? '~/iletişim' : '~/contact',
    isTr ? 'Sosyal bağlantılar' : 'Social links',
    [
      '<a href="https://github.com/Zaryob" rel="me">GitHub <span aria-hidden="true">↗</span></a>',
      '<a href="https://linkedin.com/in/suleyman_poyraz" rel="me">LinkedIn <span aria-hidden="true">↗</span></a>',
      '<a href="https://medium.com/@zaryob" rel="me">Medium <span aria-hidden="true">↗</span></a>',
      `<a href="mailto:zaryob.dev@gmail.com">${isTr ? 'E-posta' : 'Email'}</a>`
    ]
  );
  const legalLine1 = isTr
    ? '<span aria-hidden="true"># </span>© Süleyman Poyraz · Ağ protokolü başlıkları, bit bit.'
    : '<span aria-hidden="true"># </span>© Süleyman Poyraz · Network protocol headers, bit by bit.';
  const legalLine2 = isTr
    ? `Her alan bir RFC’ye dayanır.<a class="suite-footer__top" href="#main"><span aria-hidden="true">↑ </span>Başa dön</a>`
    : `Every field is backed by an RFC.<a class="suite-footer__top" href="#main"><span aria-hidden="true">↑ </span>Back to top</a>`;
  return `<footer class="suite-footer" id="site-footer"><div class="suite-footer__inner"><p class="suite-footer__prompt" aria-hidden="true"><span class="suite-footer__host">zaryob</span>:~/wire $ <span class="suite-footer__cmd">ls -F</span></p><div class="suite-footer__cols">${site}${suite}${contact}</div><div class="suite-footer__legal"><span>${legalLine1}</span><span>${legalLine2}</span></div></div></footer>`;
}

function page({ id, title, description, body, hero = '', indexable = true, className = '', pageTitle = '', layer = '', lang = 'en' }) {
  const isTr = lang === 'tr';
  const fullTitle = id === ''
    ? (isTr ? 'Wire · Ağ protokolü başlıkları, bit bit' : 'Wire · Network protocol headers, bit by bit')
    : `${title} · Wire`;
  const canonical = canonicalUrl(id, lang);
  const altEn = canonicalUrl(id, 'en');
  const altTr = canonicalUrl(id, 'tr');
  const routeEn = url(id, 'en');
  const routeTr = url(id, 'tr');

  return `<!doctype html>
<html lang="${lang}" data-route-language="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content"><meta name="theme-color" content="#f5f3ed" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#171a1f" media="(prefers-color-scheme: dark)"><meta name="description" content="${e(description)}"><title>${e(fullTitle)}</title><link rel="icon" type="image/svg+xml" href="${asset('favicon.svg')}">${indexable ? `<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${altEn}" data-language-route="${routeEn}">
<link rel="alternate" hreflang="tr" href="${altTr}" data-language-route="${routeTr}">
<link rel="alternate" hreflang="x-default" href="${altEn}">` : '<meta name="robots" content="noindex">'}<meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}"><meta property="og:site_name" content="wire"><meta property="og:locale" content="${isTr ? 'tr_TR' : 'en_US'}"><meta property="og:type" content="website"><script src="${asset('assets/console/language.js')}"></script><script src="${asset('assets/console/i18n.js')}"></script><script src="${asset('assets/console/theme.js')}"></script><link rel="stylesheet" href="${asset('assets/console/theme.css')}"><link rel="stylesheet" href="${asset('style.css')}"><script type="module" src="${asset('app.js')}"></script></head>
<body class="console-site wire-site${className ? ` ${className}` : ''}">${header(id, lang)}
${topbar(id, pageTitle || title, layer, lang)}
<main id="main" tabindex="-1">${hero}<div class="wire-main">${body}</div></main>
${suiteFooter(lang)}
</body></html>`;
}

const fieldLabel = field => field.label ?? field.name;
const hasCompactFlag = field => field.label && field.bits <= 2 && /^[A-Z][A-Z0-9]{0,3}$/.test(field.name);
const bitLabel = field => (hasCompactFlag(field) ? field.name : fieldLabel(field));
const bitLabelAttributes = field => (hasCompactFlag(field) ? ` title="${e(field.label)}" aria-label="${e(`${field.label} (${field.name})`)}"` : '');

function diagram(protocol, lang = 'en') {
  const isTr = lang === 'tr';
  const cols = protocol.rowBits;
  const cells = [];
  let offset = 0;
  const getBitLabel = field => (isTr ? bitLabel(field) : field.name);
  const getBitAttrs = field => (isTr ? bitLabelAttributes(field) : '');
  for (const field of protocol.fields) {
    if (!Number.isInteger(field.bits)) {
      cells.push({ field, span: cols, label: `${getBitLabel(field)} ${isTr ? '(değişken)' : '(variable)'}`, variable: true });
      offset = 0;
      continue;
    }
    if (field.range && field.bits >= cols) {
      cells.push({ field, span: cols, label: `${getBitLabel(field)} ${isTr ? `(değişken, örnekte ${field.bits} bit)` : `(variable, ${field.bits} bits in example)`}`, variable: true });
      offset = 0;
      continue;
    }
    if (field.bits > cols && offset % cols === 0 && field.bits % cols === 0) {
      cells.push({ field, span: cols, label: `${getBitLabel(field)} (${field.bits} ${isTr ? 'bit' : 'bits'})` });
    } else {
      let left = field.bits;
      let at = offset;
      let first = true;
      while (left > 0) {
        const span = Math.min(left, cols - (at % cols));
        cells.push({ field, span, label: first ? getBitLabel(field) : '…' });
        left -= span;
        at += span;
        first = false;
      }
    }
    offset += field.bits;
  }

  const byteCount = cols / 8;
  const byteBands = Array.from({ length: byteCount }, (_, i) => {
    const startBit = i * 8;
    const endBit = startBit + 7;
    const bandTitle = isTr ? `Sekizli ${i}, bit ${startBit}–${endBit}` : `Octet ${i}, bits ${startBit}–${endBit}`;
    const bandLabel = isTr ? `Sekizli ${i} <small>(Bit ${startBit}–${endBit})</small>` : `Octet ${i} <small>(Bits ${startBit}–${endBit})</small>`;
    return `<div class="bits-byte-band" style="grid-column:span 8" title="${bandTitle}"><span>${bandLabel}</span></div>`;
  }).join('');

  const bitNumbers = Array.from({ length: cols }, (_, bit) => {
    const isByteBoundary = bit % 8 === 0;
    const byteIndex = Math.floor(bit / 8);
    const colTitle = isTr ? `Bit ${bit} (${byteIndex}. Sekizli, ${bit % 8}. bit)` : `Bit ${bit} (Octet ${byteIndex}, bit ${bit % 8})`;
    return `<span class="bits-col-num${isByteBoundary ? ' bits-col-num--boundary' : ''}" title="${colTitle}">${bit}</span>`;
  }).join('');

  const cadenceOf = field => {
    const fieldIdx = protocol.fields.indexOf(field);
    return fieldIdx >= 0 ? (fieldIdx % 2 === 0 ? 'bit-cell--even' : 'bit-cell--odd') : '';
  };
  const split = cols === 32 ? splitDiagram(protocol, cadenceOf, 16, lang) : '';
  const quarter = splitDiagram(protocol, cadenceOf, 8, lang);
  const quarterTitle = cols === 32
    ? (isTr ? 'dört 8 bitlik parçada (bit 0–7, 8–15, 16–23, 24–31)' : 'in four 8-bit slices (bits 0–7, 8–15, 16–23, 24–31)')
    : (isTr ? 'iki 8 bitlik parçada (bit 0–7, sonra 8–15)' : 'in two 8-bit slices (bits 0–7, then 8–15)');

  const badgeText = isTr ? 'Bit Cetveli' : 'Bit Ruler';
  const rowTitle = isTr ? `${cols} bitlik satır (${byteCount} sekizli / bayt)` : `${cols}-bit row (${byteCount} octets / bytes)`;
  const splitRowTitle = isTr ? `${cols} bitlik satır, iki 16 bitlik yarıda (bit 0–15, sonra 16–31)` : `${cols}-bit row, in two 16-bit halves (bits 0–15, then 16–31)`;
  const quarterRowTitle = isTr ? `${cols} bitlik satır, ${quarterTitle}` : `${cols}-bit row, ${quarterTitle}`;
  const scrollHint = isTr
    ? 'Şemanın tamamı için yatay kaydırın; klavyede sağ ve sol ok tuşlarını kullanabilirsiniz.'
    : 'Scroll horizontally for the full diagram; you can use the left and right arrow keys.';
  const orderSpan = protocol.fields.some(field => field.endian === 'little')
    ? (isTr
        ? '<span class="bits-header__order" title="Şema alanların yerini gösterir; çok sekizlili alanların baytları en anlamsız sekizli önce (küçük-endian) iletilir">Alan sırası; çok sekizlili alanlar küçük-endian</span>'
        : '<span class="bits-header__order" title="Diagram shows field layout; multi-octet fields are transmitted least significant octet first (little-endian)">Field order; multi-octet fields are little-endian</span>')
    : (isTr
        ? '<span class="bits-header__order" title="Ağ Bayt Sıralaması (Network Byte Order): En anlamlı bit (MSB) daima en soldadır (Bit 0)">Ağ Sırası: En anlamlı bit (Bit 0) en solda</span>'
        : '<span class="bits-header__order" title="Network Byte Order: Most significant bit (Bit 0) is leftmost">Network Byte Order: Most significant bit (Bit 0) leftmost</span>');

  return `<div class="bits-diagram-wrap${split ? ' bits-diagram-wrap--splittable' : ''}${cols === 16 ? ' bits-diagram-wrap--16' : ''}">
  <div class="bits-header">
    <div class="bits-header__info">
      <span class="bits-header__badge">${badgeText}</span>
      <span class="bits-header__title">${rowTitle}</span>${split ? `
      <span class="bits-header__title bits-header__title--split">${splitRowTitle}</span>` : ''}
      <span class="bits-header__title bits-header__title--quarter">${quarterRowTitle}</span>
    </div>
    ${orderSpan}
  </div>
  <p class="bits-scroll-hint" id="bits-scroll-hint" hidden>${scrollHint}</p>
  <div class="bits-scroll" tabindex="0" role="region" aria-describedby="bits-scroll-hint" aria-label="${e(protocolTitle(protocol, lang))} ${isTr ? 'bit şeması' : 'bit diagram'}">
    <div class="bits" style="--cols:${cols}">
      <div class="bits-ruler bits-ruler--bytes" aria-hidden="true">${byteBands}</div>
      <div class="bits-ruler bits-ruler--bits" aria-hidden="true">${bitNumbers}</div>
      ${cells.map(cell => {
        const fieldIdx = protocol.fields.indexOf(cell.field);
        const cadence = fieldIdx >= 0 ? (fieldIdx % 2 === 0 ? 'bit-cell--even' : 'bit-cell--odd') : '';
        return `<a class="bit-cell${cell.span === 1 ? ' bit-cell--narrow' : ''}${cell.variable ? ' bit-cell--variable' : ''}${cadence ? ' ' + cadence : ''}" style="grid-column:span ${cell.span}" href="#f-${cell.field.key}" data-field="${cell.field.key}"${getBitAttrs(cell.field)}><span>${e(cell.label)}</span></a>`;
      }).join('')}
    </div>${quarter}${split}
  </div>
</div>`;
}

function splitDiagram(protocol, cadenceOf, half = 16, lang = 'en') {
  const isTr = lang === 'tr';
  const rowBits = protocol.rowBits;
  const lines = [];
  let line = null;
  let offset = 0;
  const getBitLabel = field => (isTr ? bitLabel(field) : field.name);
  const getBitAttrs = field => (isTr ? bitLabelAttributes(field) : '');
  const cell = (field, span, label, extra = {}) => ({ field, span, label, ...extra });
  for (const field of protocol.fields) {
    if (!Number.isInteger(field.bits)) {
      lines.push({ start: null, cells: [cell(field, half, `${getBitLabel(field)} ${isTr ? '(değişken)' : '(variable)'}`, { variable: true })] });
      line = null; offset = 0; continue;
    }
    if (field.range && field.bits >= rowBits) {
      lines.push({ start: null, cells: [cell(field, half, `${getBitLabel(field)} ${isTr ? `(değişken, örnekte ${field.bits} bit)` : `(variable, ${field.bits} bits in example)`}`, { variable: true })] });
      line = null; offset = 0; continue;
    }
    if (field.bits > rowBits && offset % rowBits === 0 && field.bits % rowBits === 0) {
      lines.push({ start: null, cells: [cell(field, half, `${getBitLabel(field)} (${field.bits} ${isTr ? 'bit' : 'bits'})`)] });
      line = null; offset += field.bits; continue;
    }
    let left = field.bits;
    let at = offset;
    let first = true;
    while (left > 0) {
      if (at % half === 0 || !line) { line = { start: at - (at % half), cells: [] }; lines.push(line); }
      const span = Math.min(left, half - (at % half));
      line.cells.push(cell(field, span, first ? getBitLabel(field) : `${getBitLabel(field)} ${isTr ? '(devam)' : '(cont.)'}`, { continued: !first }));
      left -= span; at += span; first = false;
    }
    offset += field.bits;
  }

  const ruler = start => `<div class="bits-ruler bits-ruler--bits bits-ruler--half" aria-hidden="true">${Array.from({ length: half }, (_, i) => {
    const bit = (start % rowBits) + i;
    const colTitle = isTr ? `Bit ${bit} (${Math.floor(bit / 8)}. Sekizli, ${bit % 8}. bit)` : `Bit ${bit} (Octet ${Math.floor(bit / 8)}, bit ${bit % 8})`;
    return `<span class="bits-col-num${bit % 8 === 0 ? ' bits-col-num--boundary' : ''}" title="${colTitle}">${bit}</span>`;
  }).join('')}</div>`;
  const piece = item => {
    const cadence = cadenceOf(item.field);
    const hidden = item.continued ? ' aria-hidden="true" tabindex="-1"' : '';
    return `<a class="bit-cell${item.span === 1 ? ' bit-cell--narrow' : ''}${item.variable ? ' bit-cell--variable' : ''}${item.continued ? ' bit-cell--continued' : ''}${cadence ? ' ' + cadence : ''}" style="grid-column:span ${item.span}" href="#f-${item.field.key}" data-field="${item.field.key}"${hidden || getBitAttrs(item.field)}><span>${e(item.label)}</span></a>`;
  };
  return `
    <div class="bits ${half === 8 ? 'bits--quarter' : 'bits--split'}" style="--cols:${half}">
      ${lines.map(item => `${item.start === null ? '' : ruler(item.start)}${item.cells.map(piece).join('')}`).join('\n      ')}
    </div>`;
}

function exampleValue(field, range, bytes) {
  if (!range) return '—';
  if (field.checksum || field.hex) {
    const first = Math.floor(range.offset / 8);
    const last = Math.ceil((range.offset + range.bits) / 8);
    let value = 0n;
    for (let i = first; i < last; i += 1) value = (value << 8n) | BigInt(bytes[i]);
    value = (value >> BigInt(last * 8 - range.offset - range.bits)) & ((1n << BigInt(range.bits)) - 1n);
    if (field.endian === 'little') {
      let reversed = 0n;
      for (let i = 0; i < range.bits / 8; i += 1) reversed = (reversed << 8n) | ((value >> BigInt(i * 8)) & 255n);
      value = reversed;
    }
    return `0x${value.toString(16).padStart(Math.ceil(range.bits / 4), '0')}`;
  }
  return String(field.example);
}

function protocolPage(protocol, lang = 'en') {
  const isTr = lang === 'tr';
  const { bytes, fieldsLength, ranges } = example(protocol.id);
  const { layout } = protocol;
  const formatSources = layout.std ? [{ std: layout.std }] : layoutRefs(protocol);
  const myLayer = layerKey(protocol.layer);
  const fromId = protocol.example?.payloadFrom;
  const subProto = fromId ? byId.get(fromId) : null;
  const subHeaderLen = subProto ? example(subProto.id).fieldsLength : 0;
  const subLayer = subProto ? layerKey(subProto.layer) : null;

  const fieldIndexMap = new Map();
  protocol.fields.forEach((f, i) => fieldIndexMap.set(f.key, i));

  const protoTitle = protocolTitle(protocol, lang);
  const legendItems = [];
  legendItems.push(`<div class="hex-legend__item">
    <span class="hex-legend__swatch hex-legend__swatch--proto" aria-hidden="true"></span>
    <span><strong>${e(protoTitle)}</strong> (${fieldsLength} ${isTr ? 'bayt gösterilen alan — alanlar ardışık tonlarla ayrılmıştır' : 'bytes shown header — fields distinguished by alternating shades'})</span>
  </div>`);

  if (subProto) {
    legendItems.push(`<div class="hex-legend__item">
      <span class="hex-legend__swatch hex-legend__swatch--sub hex-legend__swatch--${subLayer}" aria-hidden="true"></span>
      <span>${isTr ? `Sarmalanmış ${e(subProto.name)} başlığı (${subHeaderLen} sekizli)` : `Encapsulated ${e(subProto.name)} header (${subHeaderLen} octets)`}</span>
    </div>`);
    const remaining = bytes.length - (fieldsLength + subHeaderLen);
    if (remaining > 0) {
      legendItems.push(`<div class="hex-legend__item">
        <span class="hex-legend__swatch hex-legend__swatch--data" aria-hidden="true"></span>
        <span>${isTr ? `Uygulama yükü (${remaining} sekizli veri)` : `Application payload (${remaining} octets of data)`}</span>
      </div>`);
    }
  } else if (bytes.length > fieldsLength) {
    const remaining = bytes.length - fieldsLength;
    const label = protocol.id === 'dns'
      ? (isTr ? 'Soru ve yanıt kayıtları' : 'Query and response records')
      : (protocol.id === 'icmp' || protocol.id === 'icmpv6')
      ? (isTr ? 'Hata / yankı verisi' : 'Error / echo data')
      : (isTr ? 'Yük verisi' : 'Payload data');
    legendItems.push(`<div class="hex-legend__item">
      <span class="hex-legend__swatch hex-legend__swatch--data" aria-hidden="true"></span>
      <span>${label} (${remaining} ${isTr ? 'sekizli' : 'octets'})</span>
    </div>`);
  }

  const fieldsAt = index => protocol.fields.filter(field => ranges[field.key] && ranges[field.key].offset < (index + 1) * 8 && ranges[field.key].offset + ranges[field.key].bits > index * 8).map(field => field.key);
  const rows = [];
  for (let start = 0; start < bytes.length; start += 8) {
    rows.push(`<div class="hex-row"><span class="hex-offset">${hex(start, 4)}</span>${bytes.slice(start, start + 8).map((byte, i) => {
      const index = start + i;
      const isPayload = index >= fieldsLength;
      const fields = fieldsAt(index);
      const dataAttr = fields.length ? ` data-fields="${fields.join(' ')}"` : '';

      let colorClass = '';
      if (!isPayload) {
        const fieldIdx = fields.length ? fieldIndexMap.get(fields[0]) : 0;
        colorClass = fieldIdx % 2 === 0 ? 'hex-byte--even' : 'hex-byte--odd';
      } else if (subProto && index < fieldsLength + subHeaderLen) {
        const subIndex = index - fieldsLength;
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

  const columns = isTr
    ? ['Alan', 'Bit', 'Genişlik', 'Örnek', 'Açıklama ve kaynak']
    : ['Field', 'Bits', 'Width', 'Example', 'Description and source'];

  const table = protocol.fields.map(field => {
    const range = ranges[field.key];
    const position = range ? (range.bits === 1 ? `${range.offset}` : `${range.offset}–${range.offset + range.bits - 1}`) : '—';
    const valuesList = fieldValues(field, lang);
    const values = valuesList ? `<dl class="field-values">${valuesList.map(([value, label]) => `<div><dt>${e(value)}</dt><dd>${e(label)}</dd></div>`).join('')}</dl>` : '';
    const nameHtml = isTr
      ? `${e(fieldLabel(field))}${field.label ? `<small class="field-source-name" lang="en">${e(field.name)}</small>` : ''}`
      : `${e(field.name)}${field.label ? `<small class="field-source-name" lang="tr">${e(field.label)}</small>` : ''}`;
    return `<tr id="f-${field.key}" data-field="${field.key}" tabindex="0" role="row"><th scope="row" role="rowheader">${nameHtml}</th><td class="num" role="cell" data-label="${columns[1]}">${position}</td><td class="num" role="cell" data-label="${columns[2]}">${e(widthText(field, lang))}</td><td class="num" role="cell" data-label="${columns[3]}"><code>${e(exampleValue(field, range, bytes))}</code></td><td role="cell" data-label="${columns[4]}"><p>${e(fieldDesc(field, lang))}</p>${values}<p class="field-ref">${refLink(field.ref, lang)}</p></td></tr>`;
  }).join('');

  const index = protocols.indexOf(protocol);
  const prevLabel = isTr ? '← Önceki' : '← Previous';
  const nextLabel = isTr ? 'Sonraki →' : 'Next →';
  const neighborNavLabel = isTr ? 'Önceki ve sonraki protokol' : 'Previous and next protocol';
  const neighbor = (item, label) => item ? `<a href="${url(item.id, lang)}"><small>${label}</small>${e(item.name)}</a>` : '<span></span>';

  const pageDesc = protocolSummary(protocol, lang);
  const notes = protocolNotes(protocol, lang);
  const exampleNote = protocolExampleNote(protocol, lang);
  const formatSourceText = isTr
    ? `Biçim kaynağı ${joinTr(formatSources.map(ref => refLink(ref, 'tr')))}`
    : `Format source ${joinEn(formatSources.map(ref => refLink(ref, 'en')))}`;
  const hexSmallText = isTr
    ? `Bu paket gerçek bir yakalama değildir: aşağıdaki tablodaki örnek değerlerden derleme sırasında üretilir, sağlama toplamları RFC 1071’deki yöntemle hesaplanır. Bir alanın üzerine gelin ya da alana tıklayın; karşılık gelen sekizliler vurgulanır.${bytes.length > fieldsLength ? ' Soluk sekizliler başlıktan sonraki yüktür.' : ''}`
    : `This packet is not a live capture: it is generated during build from the sample values in the table below, with checksums calculated using RFC 1071. Hover or click on a field to highlight corresponding octets.${bytes.length > fieldsLength ? ' Dimmed octets are payload following the header.' : ''}`;

  return page({
    id: protocol.id,
    title: protoTitle,
    pageTitle: protoTitle,
    layer: protocol.layer,
    lang,
    description: pageDesc,
    className: `protocol-page--${myLayer}`,
    body: `
<header class="page-header"><p class="eyebrow"><a class="layer-badge layer-badge--${myLayer}" href="${url('', lang)}#tcpip-${myLayer}">${e(layerName(protocol.layer, lang))} ${isTr ? 'katmanı' : 'layer'}</a></p><h1>${e(protoTitle)}</h1><p class="lead">${e(pageDesc)}</p><p class="small">${formatSourceText}</p></header>
<div class="overview-grid">
  <section class="overview-grid__col" aria-labelledby="layout-title"><h2 id="layout-title">${isTr ? 'Yerleşim' : 'Layout'}</h2>${diagram(protocol, lang)}
${verifiedNote(protocol, lang)}</section>
  <section class="overview-grid__col" aria-labelledby="example-title"><h2 id="example-title">${isTr ? 'Örnek paket' : 'Example packet'}</h2><p>${e(exampleNote)}</p><div class="hex-legend" aria-label="${isTr ? 'Paket katmanları' : 'Packet layers'}">${legendItems.join('')}</div><div class="hex" role="group" aria-label="${isTr ? 'Örnek paketin onaltılık dökümü' : 'Hexadecimal dump of example packet'}">${rows.join('')}</div><p class="small">${hexSmallText}</p></section>
</div>
<section aria-labelledby="fields-title"><h2 id="fields-title">${isTr ? 'Alanlar' : 'Fields'}</h2><div class="table-scroll" tabindex="0" role="region" aria-label="${e(protoTitle)} ${isTr ? 'alanları' : 'fields'}"><table class="fields fields--cards" role="table"><thead role="rowgroup"><tr role="row">${columns.map(label => `<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead><tbody role="rowgroup">${table}</tbody></table></div></section>
${notes.length ? `<section aria-labelledby="notes-title"><h2 id="notes-title">${isTr ? 'Notlar' : 'Notes'}</h2><ul class="notes">${notes.map(note => `<li>${e(note)}</li>`).join('')}</ul></section>` : ''}
<section aria-labelledby="refs-title"><h2 id="refs-title">${isTr ? 'Kaynaklar' : 'References'}</h2><ol class="references">${protocol.refs.map(ref => { const item = source(ref); return `<li><a href="${url('kaynakca', lang)}#${item.anchor}">[${e(item.label)}]</a> ${item.citation}</li>`; }).join('')}</ol></section>
<nav class="page-neighbors" aria-label="${neighborNavLabel}">${neighbor(protocols[index - 1], prevLabel)}${neighbor(protocols[index + 1], nextLabel)}</nav>`
  });
}

const fieldSearchNames = field => (field.label ? `${field.label} ${field.name}` : field.name);

function home(lang = 'en') {
  const isTr = lang === 'tr';
  const layers = [...new Set(protocols.map(protocol => protocol.layer))];
  const totalFields = protocols.reduce((sum, p) => sum + p.fields.length, 0);
  const verifiedRfcs = new Set(protocols.flatMap(protocol => layoutRefs(protocol).map(ref => ref.rfc))).size;
  const verifiedShare = Math.round(100 * protocols.filter(isVerified).length / protocols.length);

  const heroBadge = isTr ? 'v0.1 · RFC Doğrulamalı Protokol Atlası' : 'v0.1 · RFC-Verified Protocol Atlas';
  const heroLead = isTr
    ? 'Tel üzerindeki her bit, kaynağıyla: RFC standartlarıyla doğrulanmış ağ protokolleri, başlık yerleşimleri ve etkileşimli onaltılık paket dökümleri.'
    : 'Every bit on the wire, with its source: network protocols verified against RFC standards, header layouts, and interactive hexadecimal packet dumps.';
  const searchPlaceholder = isTr
    ? 'Protokol, RFC veya alan ara (örn. IPv4, TCP, 791, Bayraklar…)'
    : 'Search protocols, RFCs, or fields (e.g. IPv4, TCP, 791, Flags…)';
  const searchAria = isTr ? 'Protokol ara' : 'Search protocols';
  const inspectLabel = isTr ? 'protokolü incele →' : 'inspect protocol →';
  const panelTitle = isTr ? 'IPv4 Datagram · 20 sekizli' : 'IPv4 Datagram · 20 octets';

  const screenLines = isTr
    ? `      <span class="h-dim">Ofset</span>  <span class="h-dim">Sekizli</span>      <span class="h-dim">Alan ve Değer</span>
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
<span class="h-dim">      …                   12 sekizli yük (UDP + Veri)</span>`
    : `      <span class="h-dim">Offset</span> <span class="h-dim">Octets</span>       <span class="h-dim">Field and Value</span>
      <span class="h-dim">[00]</span>   <span class="h-bus">45</span>           <span class="h-bus">Ver: 4, IHL: 5</span> <span class="h-dim">(20 bytes)</span>
      <span class="h-dim">[01]</span>   <span class="h-dim">00</span>           <span class="h-dim">DSCP: CS0, ECN: Not-ECT</span>
      <span class="h-dim">[02]</span>   <span class="h-ok">00 20</span>        <span class="h-ok">Total Length: 32 bytes</span>
      <span class="h-dim">[04]</span>   <span class="h-dim">1c 46</span>        <span class="h-dim">ID: 0x1c46</span>
      <span class="h-dim">[06]</span>   <span class="h-hot">40 00</span>        <span class="h-hot">Flags: [DF]</span> <span class="h-dim">Offset: 0</span>
      <span class="h-dim">[08]</span>   <span class="h-ok">40</span>           <span class="h-ok">TTL: 64</span> <span class="h-dim">(64 hops)</span>
      <span class="h-dim">[09]</span>   <span class="h-bus">11</span>           <span class="h-bus">Protocol: UDP (17)</span>
      <span class="h-dim">[10]</span>   <span class="h-ok">72 c2</span>        <span class="h-ok">Checksum: Valid</span> <span class="h-dim">(RFC 1071)</span>
      <span class="h-dim">[12]</span>   <span class="h-bus">c0 a8 01 64</span>  <span class="h-bus">Source: 192.168.1.100</span>
      <span class="h-dim">[16]</span>   <span class="h-hot">01 01 01 01</span>  <span class="h-hot">Destination: 1.1.1.1</span>
<span class="h-dim">      …                   12 octets payload (UDP + Data)</span>`;

  const hero = `
<div class="home-hero console-hero console-hero--wire">
  <div class="console-hero__inner">
    <div class="console-hero__copy">
      <div class="home-badge">
        <span class="tiny-dot" aria-hidden="true"></span>
        <span>${heroBadge}</span>
      </div>
      <h1 class="home-title console-hero__title">Wire</h1>
      <p class="home-lead console-hero__lead">${heroLead}</p>

      <div class="home-search-wrap">
        <label class="home-search-box" for="protocol-filter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="protocol-filter" type="search" placeholder="${searchPlaceholder}" autocomplete="off" spellcheck="false" aria-label="${searchAria}">
          <kbd aria-hidden="true">/</kbd>
        </label>
        <p id="filter-status" class="home-search-status" role="status" aria-live="polite"></p>
      </div>
    </div>
    <figure class="console-hero__panel">
      <figcaption class="console-hero__panel-head">
        <span>${panelTitle}</span>
        <a href="${url('ipv4', lang)}">${inspectLabel}</a>
      </figcaption>
      <div class="console-hero__screen">${screenLines}</div>
    </figure>
  </div>
</div>`;

  const stats = isTr
    ? `<div class="home-stats" aria-label="Wire istatistikleri">
  <div class="home-stat-item"><strong class="stat-number">${protocols.length}</strong><span class="stat-label">Protokol Başlığı</span></div>
  <div class="home-stat-item"><strong class="stat-number">${verifiedRfcs}</strong><span class="stat-label">Doğrulanmış RFC</span></div>
  <div class="home-stat-item"><strong class="stat-number">${totalFields}</strong><span class="stat-label">Bit Düzeyinde Alan</span></div>
  <div class="home-stat-item"><strong class="stat-number">${layers.length}</strong><span class="stat-label">Ağ Katmanı</span></div>
  <div class="home-stat-item"><strong class="stat-number">%${verifiedShare}</strong><span class="stat-label">Derleme Doğrulaması</span></div>
</div>`
    : `<div class="home-stats" aria-label="Wire statistics">
  <div class="home-stat-item"><strong class="stat-number">${protocols.length}</strong><span class="stat-label">Protocol Headers</span></div>
  <div class="home-stat-item"><strong class="stat-number">${verifiedRfcs}</strong><span class="stat-label">Verified RFCs</span></div>
  <div class="home-stat-item"><strong class="stat-number">${totalFields}</strong><span class="stat-label">Bit-Level Fields</span></div>
  <div class="home-stat-item"><strong class="stat-number">${layers.length}</strong><span class="stat-label">Network Layers</span></div>
  <div class="home-stat-item"><strong class="stat-number">${verifiedShare}%</strong><span class="stat-label">Build Verification</span></div>
</div>`;

  const catalogHeader = isTr
    ? `<div class="home-catalog__header">
    <h2>Protokol Kataloğu</h2>
    <p class="small">TCP/IP'nin dört katmanına göre (${layersRef(1122, 'tr')} §1.1.3). Bit düzeni, alanlar ve örnek paketin onaltılık dökümü için bir protokol seçin; katmanların anlamı ve sık kullanılan protokollerin özetleri <a href="#katmanlar">aşağıda</a>.</p>
  </div>`
    : `<div class="home-catalog__header">
    <h2>Protocol Catalog</h2>
    <p class="small">According to the four layers of TCP/IP (${layersRef(1122, 'en')} §1.1.3). Select a protocol for bit layout, fields, and hexadecimal packet dump; layer descriptions and common protocol summaries <a href="#layers">below</a>.</p>
  </div>`;

  const body = `
${stats}
<div class="home-catalog">
  ${catalogHeader}
  ${layersData.ips.slice().reverse().map(ips => ips.wire).filter(layer => layers.includes(layer)).map(layer => {
    const ips = layersData.ips.find(item => item.wire === layer);
    const key = layerKey(layer);
    const heading = isTr ? `${e(layer)} katmanı` : `${e(layerName(layer, 'en'))} layer`;
    return `<section class="layer layer--${key}" id="tcpip-${key}" aria-labelledby="layer-${key}"><h2 id="layer-${key}" class="layer-heading layer-heading--${key}"><span class="layer-heading__indicator" aria-hidden="true"></span>${heading} <span class="layer-heading__note">OSI ${e(ips.osi)}</span></h2><ul class="protocol-list protocol-list--compact">${protocols.filter(protocol => protocol.layer === layer).map(protocol => {
      const searchTerms = isTr
        ? `${protocol.name} ${protocol.title} ${protocolSummary(protocol, 'tr')} ${protocolNotes(protocol, 'tr').join(' ')} ${protocol.fields.map(fieldSearchNames).join(' ')} ${protocol.refs.join(' ')}`.toLocaleLowerCase('tr')
        : `${protocol.name} ${protocolTitle(protocol, 'en')} ${protocolSummary(protocol, 'en')} ${protocolNotes(protocol, 'en').join(' ')} ${protocol.fields.map(fieldSearchNames).join(' ')} ${protocol.refs.join(' ')}`.toLocaleLowerCase('en');
      return `<li class="protocol-card protocol-card--compact protocol-card--${key}" data-layer="${key}" data-search="${e(searchTerms)}"><p class="protocol-card__path">~/wire/${e(protocol.id)}</p><h3><a href="${url(protocol.id, lang)}">${e(protocolTitle(protocol, lang))}</a></h3></li>`;
    }).join('')}</ul></section>`;
  }).join('')}
</div>
${layersSection(lang)}`;

  const pageDesc = isTr
    ? 'Ağ protokolü başlıklarının RFC kaynaklı, bit düzeyinde Türkçe başvurusu; OSI ve TCP/IP katmanları ve sık kullanılan protokollerin kısa özetleriyle.'
    : 'RFC-sourced, bit-level reference for network protocol headers; with OSI and TCP/IP layers and summaries of common protocols.';

  return page({ id: '', title: 'Wire', lang, description: pageDesc, hero, body });
}

function roadmapStatus(id, lang = 'en') {
  const protocol = byId.get(id);
  if (lang === 'tr') return protocol ? `<a href="${url(id, 'tr')}">Yayında</a>` : 'Aday';
  return protocol ? `<a href="${url(id, 'en')}">Published</a>` : 'Candidate';
}

function roadmapNote(id, lang = 'en') {
  if (!byId.has(id)) return '';
  return lang === 'tr' ? ` (<a href="${url(id, 'tr')}">yayında</a>)` : ` (<a href="${url(id, 'en')}">published</a>)`;
}

const layersRef = (number, lang = 'en') => (isRfc(number) ? `<a href="${url('kaynakca', lang)}#rfc${number}">RFC ${number}</a>` : `<a href="${url('kaynakca', lang)}#${e(number)}">${e(standardEntry(number).short)}</a>`);

function layersSection(lang = 'en') {
  const isTr = lang === 'tr';
  const pageLink = id => `<a href="${url(id, lang)}">${e(byId.get(id).name)}</a>`;
  const ref = num => layersRef(num, lang);

  const chain = [];
  for (let id = 'ipv4'; id; id = byId.get(id).example?.payloadFrom) chain.push(id);
  const sizes = chain.map(id => example(id));
  const innermost = sizes.at(-1);

  const encapLabel = isTr ? 'IPv4 örneğinin katmanları' : 'Layers of the IPv4 example';
  const encapsulation = `<ol class="encap" aria-label="${encapLabel}">${chain.map((id, i) => {
    const protocol = byId.get(id);
    const own = i === chain.length - 1 ? innermost.bytes.length : sizes[i].bytes.length - sizes[i + 1].bytes.length;
    const msg = i === chain.length - 1
      ? (isTr ? `${own} sekizli ileti` : `${own} octets message`)
      : (isTr ? `${own} sekizli başlık` : `${own} octets header`);
    return `<li class="encap__layer encap__layer--${layerKey(protocol.layer)}" style="--depth:${i}"><span class="layer-badge layer-badge--${layerKey(protocol.layer)}">${e(layerName(protocol.layer, lang))}</span> ${pageLink(id)} <span class="small">${msg}</span></li>`;
  }).join('')}</ol>`;

  const osiRows = layersData.osi.map(layer => {
    const desc = isTr ? layer.desc : (osiDescriptionsEn[layer.number] || layer.desc);
    const wireEquiv = layer.wire ? `<a href="#tcpip-${layerKey(layer.wire)}">${e(layerName(layer.wire, lang))}</a>` : '—';
    const layerHeading = isTr ? `<strong>${e(layer.tr)}</strong><br><span class="small" lang="en">${e(layer.name)}</span>` : `<strong>${e(layer.name)}</strong><br><span class="small" lang="tr">${e(layer.tr)}</span>`;
    return `<tr id="osi-${layer.number}"><th scope="row">${layer.number}</th><td>${layerHeading}</td><td>${e(desc)}</td><td>${wireEquiv}</td></tr>`;
  }).join('');

  const groups = layersData.groups.map(group => {
    const groupTitle = isTr ? group.title : (groupTitlesEn[group.title] || group.title);
    const countNote = isTr ? `${group.items.length} özet` : `${group.items.length} summaries`;
    return `<details class="layers-group"><summary id="group-${e(group.title)}">${e(groupTitle)} <span class="small">${countNote}</span></summary><dl class="layers-summary">${group.items.map(item => {
      const textBadge = item.text ? (isTr ? ' <span class="small">metin tabanlı</span>' : ' <span class="small">text-based</span>') : '';
      const portsVal = isTr ? (item.ports_tr || item.ports) : (item.ports_en || item.ports);
      const portNote = portsVal ? `Port: ${e(portsVal)} · ` : '';
      const itemSummary = isTr ? (item.summary_tr || item.summary) : (item.summary_en || item.summary);
      const wireNote = item.pages.length
        ? `wire: ${item.pages.map(pageLink).join(', ')}`
        : (isTr ? 'wire’da başlık sayfası yok: metin tabanlı komutlar ve yanıtlarla çalışır.' : 'no header page in wire: operates via text commands and responses.');
      const sourceNote = isTr ? `Kaynak: ${item.refs.map(ref).join(', ')}` : `Source: ${item.refs.map(ref).join(', ')}`;
      return `<div><dt><strong>${e(item.name)}</strong> <a class="layer-badge layer-badge--${layerKey(item.layer)}" href="#tcpip-${layerKey(item.layer)}">${e(layerName(item.layer, lang))}</a>${textBadge}</dt><dd><p>${e(itemSummary)}</p><p class="small">${portNote}${wireNote} · ${sourceNote}</p></dd></div>`;
    }).join('')}</dl></details>`;
  }).join('');

  if (isTr) {
    return `<section class="home-layers" id="katmanlar" aria-labelledby="katmanlar-title"><span id="layers" aria-hidden="true"></span><h2 id="katmanlar-title">Katmanlar</h2><p>Ağ protokolleri üst üste çalışır: her katman, üstündeki katmanın verisini kendi başlığıyla sarar ve bir alttakine teslim eder.</p>
<section aria-labelledby="encap-title"><h3 id="encap-title">Bir paketin katmanları</h3><p>wire'ın örnek paketleri birbirinin içine yerleşir. IPv4 örneği bir UDP datagramı taşır, o da bir DNS sorgusu taşır: her katman yalnızca kendi başlığını ekler ve içindekini olduğu gibi taşır. Alıcıda katmanlar ters sırayla açılır.</p>${encapsulation}<p class="small">Sekizli sayıları derleme sırasında wire'ın örneklerinden hesaplanır; Ethernet çerçevesi ve onun altındaki fiziksel ortam bu zincirde gösterilmez.</p></section>
<section aria-labelledby="osi-title"><h3 id="osi-title">OSI başvuru modeli</h3><p>OSI modeli, ISO ve ITU-T'nin ortak standardı olan yedi katmanlı bir başvuru çerçevesidir. Katmanlar yukarıdan aşağı (7) Uygulama, (6) Sunum, (5) Oturum, (4) Taşıma, (3) Ağ, (2) Veri bağlantı ve (1) Fiziksel'dir (${ref(4949)}). Aşağıdaki açıklamalar ve İnternet protokol takımıyla eşleştirme de aynı kaynaktadır; eşleştirme yaklaşıktır.</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="OSI katmanları"><table class="fields"><thead><tr><th scope="col">No</th><th scope="col">Katman</th><th scope="col">Ne yapar</th><th scope="col">wire'daki karşılığı</th></tr></thead><tbody>${osiRows}</tbody></table></div></section>
<section aria-labelledby="tcpip-title"><h3 id="tcpip-title">TCP/IP katmanları</h3><p>İnternet protokol takımı (TCP/IP), ${ref(1122)} §1.1.3'te dört katmanla anlatılır: Uygulama, Taşıma, İnternet ve Bağlantı. ${ref(4949)}'a göre OSI gibi katmanlı bir başvuru modeli tanımlayan bir İnternet standardı yoktur; katmanlar bir anlatım aracıdır. Yukarıdaki katalog bu dört katmana göre gruplanmıştır.</p>
<p class="small">Katman sınırları her zaman kesin değildir. ARP Bağlantı ile Ağ arasında çalışır; MPLS etiketi bağlantı başlığı ile IP başlığı arasına girer; ICMP, IGMP, OSPF ve VRRP doğrudan IP üzerinde taşınır ama ağ katmanının işini görür; VXLAN ve Geneve UDP üzerinde taşınır ama bağlantı katmanı çerçeveleri taşır. wire bu protokolleri işlevlerine en yakın gruba yerleştirir.</p></section>
<section aria-labelledby="common-title"><h3 id="common-title">Sık kullanılan protokoller</h3><p>Günlük internet ve ağ kullanımında en sık karşılaşılan protokollerin kısa özetleri; son üç grup uygulamaların altındaki bağlantı, ağ ve taşıma katmanları içindir. Metin tabanlı protokoller (HTTP/1.1, FTP, SMTP, POP3, IMAP, SIP) alanlar yerine satır satır komut ve yanıt taşıdıkları için wire'da bit düzeyinde başlık sayfaları yoktur; yalnızca burada özetlenir. Her özetin dayandığı ifade, derleme testlerinde atıf yapılan kaynağın metninde denetlenir.</p>${groups}</section></section>`;
  }

  // English
  return `<section class="home-layers" id="layers" aria-labelledby="layers-title"><span id="katmanlar" aria-hidden="true"></span><h2 id="layers-title">Layers</h2><p>Network protocols operate in a stack: each layer encapsulates data from the layer above with its own header and passes it to the layer below.</p>
<section aria-labelledby="encap-title"><h3 id="encap-title">Layers of a packet</h3><p>wire's example packets encapsulate one another. The IPv4 example carries a UDP datagram, which in turn carries a DNS query: each layer adds only its own header and transfers its payload intact. The receiver decapsulates layers in reverse order.</p>${encapsulation}<p class="small">Octet counts are computed during build from wire's examples; the Ethernet frame and physical medium below it are omitted from this chain.</p></section>
<section aria-labelledby="osi-title"><h3 id="osi-title">OSI reference model</h3><p>The OSI model is a 7-layer reference framework standardized jointly by ISO and ITU-T. Layers from top to bottom are (7) Application, (6) Presentation, (5) Session, (4) Transport, (3) Network, (2) Data Link, and (1) Physical (${ref(4949)}). The descriptions below and mapping to the Internet suite follow the same standard; mappings are approximate.</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="OSI layers"><table class="fields"><thead><tr><th scope="col">No</th><th scope="col">Layer</th><th scope="col">Function</th><th scope="col">wire equivalent</th></tr></thead><tbody>${osiRows}</tbody></table></div></section>
<section aria-labelledby="tcpip-title"><h3 id="tcpip-title">TCP/IP layers</h3><p>The Internet protocol suite (TCP/IP) is described in four layers in ${ref(1122)} §1.1.3: Application, Transport, Internet, and Link. According to ${ref(4949)}, no Internet standard defines a layered reference model like OSI; layers serve as an explanatory framework. The catalog above groups protocols by these four layers.</p>
<p class="small">Layer boundaries are not always rigid. ARP operates between Link and Network; MPLS labels sit between link and IP headers; ICMP, IGMP, OSPF, and VRRP are carried directly over IP but fulfill network-layer roles; VXLAN and Geneve ride over UDP but carry link-layer frames. wire assigns protocols to the group closest to their operational role.</p></section>
<section aria-labelledby="common-title"><h3 id="common-title">Common protocols</h3><p>Short summaries of the most common protocols encountered in everyday networking; the last three groups cover link, network, and transport layers below applications. Text-based protocols (HTTP/1.1, FTP, SMTP, POP3, IMAP, SIP) carry newline-delimited commands and responses rather than binary fields, so they are summarized here rather than having bit-level header diagrams. Every summary statement is tested against the cited source text during build.</p>${groups}</section></section>`;
}

function layersRedirect(lang = 'en') {
  const isTr = lang === 'tr';
  const targetAnchor = isTr ? '#katmanlar' : '#layers';
  const targetText = isTr ? 'ana sayfada' : 'on the home page';
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${isTr ? 'Katmanlar' : 'Layers'} · Wire</title><link rel="canonical" href="${origin}${url('', lang)}"><meta http-equiv="refresh" content="0; url=${url('', lang)}${targetAnchor}"><script>location.replace(${JSON.stringify(url('', lang))} + (location.hash || ${JSON.stringify(targetAnchor)}));</script></head>
<body><p>${isTr ? 'Katmanlar artık' : 'Layers are now'} <a href="${url('', lang)}${targetAnchor}">${targetText}</a>.</p></body></html>`;
}

function guidePage(lang = 'en') {
  const isTr = lang === 'tr';
  const title = isTr ? 'Kılavuz' : 'Guide';
  const eyebrow = isTr ? 'kapsamlı protokol ve paket referansı' : 'comprehensive protocol and packet reference';
  const heading = isTr
    ? 'Ethernet Haberleşme Protokolleri, Paket Mimarisi ve RFC Kılavuzu'
    : 'Ethernet Communication Protocols, Packet Architecture, and RFC Guide';
  const lead = isTr
    ? 'Tel üzerindeki fiziksel Ethernet çerçevesinden başlayarak adres çözümleme, IP yönlendirme, TCP/UDP iletimi ve DNS çözümlemesine kadar bütün katmanların, paket yapılarının ve RFC standartlarının ayrıntılı Türkçe anlatımı.'
    : 'Comprehensive reference covering every protocol layer on the wire: from physical Ethernet framing and address resolution (ARP/NDP) to IP routing, TCP/UDP transport, and DNS resolution, detailed octet by octet with RFC citations.';

  const tocTitle = isTr ? 'İçindekiler' : 'Table of Contents';
  const tocItems = isTr ? [
    ['#bolum-1', '1. Ağ Mimarisi ve Kapsülleme (Encapsulation) Prensipleri'],
    ['#bolum-2', '2. Fiziksel ve Veri Bağlantı Katmanı: Ethernet Mimarisi'],
    ['#bolum-3', '3. Adres Çözümleme Protokolleri (ARP, RARP, NDP)'],
    ['#bolum-4', '4. Ağ / İnternet Katmanı Protokolleri (IPv4, IPv6, ICMP, ICMPv6)'],
    ['#bolum-5', '5. İletim Katmanı Protokolleri (UDP, TCP, SCTP)'],
    ['#bolum-6', '6. Uygulama ve Ağ Yapılandırma Protokolleri (DNS, DHCPv4, DHCPv6)'],
    ['#bolum-7', '7. İnternet Sağlama Toplamı (Checksum) Hesaplama Algoritması'],
    ['#bolum-8', '8. Bütün Temel Ağ RFC’lerinin Kapsamlı Kataloğu'],
    ['#bolum-9', '9. Uçtan Uca Paket Analizleri ve Onaltılık (Hex) İncelemeler'],
    ['#bolum-10', '10. Ağ Analizi ve Paket İnceleme Araçları Rehberi'],
    ['#bolum-11', '11. Tüm Katmanlardaki Protokollerin Araştırması ve wire Genişleme Yol Haritası']
  ] : [
    ['#section-1', '1. Network Architecture and Encapsulation Principles'],
    ['#section-2', '2. Physical and Data Link Layer: Ethernet Architecture'],
    ['#section-3', '3. Address Resolution Protocols (ARP, RARP, NDP)'],
    ['#section-4', '4. Network / Internet Layer Protocols (IPv4, IPv6, ICMP, ICMPv6)'],
    ['#section-5', '5. Transport Layer Protocols (UDP, TCP, SCTP)'],
    ['#section-6', '6. Application and Network Configuration Protocols (DNS, DHCPv4, DHCPv6)'],
    ['#section-7', '7. Internet Checksum Computation Algorithm'],
    ['#section-8', '8. Comprehensive Catalogue of Core Network RFCs'],
    ['#section-9', '9. End-to-End Packet Analysis and Hexadecimal Walkthroughs'],
    ['#section-10', '10. Network Analysis and Packet Inspection Tools Guide'],
    ['#section-11', '11. Protocol Survey Across Layers and wire Roadmap']
  ];

  const tocHtml = `<div class="guide-toc" role="navigation" aria-label="${tocTitle}">
  <h2>${tocTitle}</h2>
  <ul class="toc-list">
    ${tocItems.map(([href, label]) => `<li><a href="${href}">${e(label)}</a></li>`).join('\n    ')}
  </ul>
</div>`;

  const articleContent = isTr ? `
<section id="bolum-1">
  <span id="section-1" aria-hidden="true"></span>
  <h2>1. Ağ Mimarisi ve Kapsülleme (Encapsulation) Prensipleri</h2>
  <p>Bilgisayar ağlarında veri iletimi katmanlı bir mimari üzerinden yürütülür. En temel iki referans model 7 katmanlı <strong>OSI Modeli</strong> ve pratik internet standardı olan 4 katmanlı <strong>TCP/IP Modeli</strong>dir:</p>
  <div class="table-scroll" tabindex="0" role="region" aria-label="OSI ve TCP/IP katmanları tablosu"><table class="fields">
    <thead><tr><th>Katman (OSI)</th><th>TCP/IP Katmanı</th><th>PDU Adı</th><th>Protokol Örnekleri</th><th>İşlevi</th></tr></thead>
    <tbody>
      <tr><td>7. Uygulama, 6. Sunum, 5. Oturum</td><td>Uygulama (Application)</td><td>Veri (Data)</td><td><a href="${url('dns', 'tr')}">DNS</a>, HTTP, DHCP, NTP</td><td>Kullanıcı ve süreç düzeyinde veri üretimi ve sunumu.</td></tr>
      <tr><td>4. İletim (Transport)</td><td>İletim (Transport)</td><td>Segment / Datagram</td><td><a href="${url('tcp', 'tr')}">TCP</a>, <a href="${url('udp', 'tr')}">UDP</a>, SCTP</td><td>Uçtan uca süreçler arası güvenilir veya hızlı veri aktarımı.</td></tr>
      <tr><td>3. Ağ (Network)</td><td>Ağ / İnternet (Internet)</td><td>Paket / Datagram</td><td><a href="${url('ipv4', 'tr')}">IPv4</a>, <a href="${url('ipv6', 'tr')}">IPv6</a>, <a href="${url('icmp', 'tr')}">ICMP</a>, <a href="${url('icmpv6', 'tr')}">ICMPv6</a></td><td>Mantıksal adresleme ve yönlendirme (routing).</td></tr>
      <tr><td>2. Veri Bağlantısı (Data Link)</td><td rowspan="2">Bağlantı (Link / Network Access)</td><td>Çerçeve (Frame)</td><td><a href="${url('ethernet', 'tr')}">Ethernet</a>, <a href="${url('arp', 'tr')}">ARP</a>, 802.1Q VLAN, PPPoE</td><td>Yerel ağda fiziksel MAC adresleriyle doğrudan düğümler arası iletim.</td></tr>
      <tr><td>1. Fiziksel (Physical)</td><td>Bit Akışı</td><td>1000BASE-T, Fiber Optik, Bakır Hat</td><td>Elektriksel, optik veya radyo dalgalarıyla 0 ve 1 sinyallerinin aktarımı.</td></tr>
    </tbody>
  </table></div>
  <h3>Kapsülleme (Encapsulation) Süreci</h3>
  <p>Uygulama katmanında üretilen veri alt katmanlara indikçe her katman kendi denetim bilgilerini içeren bir başlık (header) ekler. Veri bağlantı katmanında ise çerçevenin sonuna bir Frame Check Sequence (FCS / CRC-32) kuyruğu (trailer) eklenir. Alıcı cihazda ise alt katmandan yukarıya doğru başlıklar soyularak (de-encapsulation) ilgili uygulama sürecine ulaştırılır.</p>
  <h3>Ağ Bayt Sıralaması (Network Byte Order)</h3>
  <p>İnternet protokollerinde çok baytlı alanlar (16 bit portlar, 32 bit IP adresleri vb.) <strong>Big-Endian</strong> (büyük sonlu) formatında iletilir. En anlamlı sekizli (MSB) hatta ilk çıkan sekizlidir. RFC başlık şemalarında ise Bit 0 daima en sol ve en anlamlı bit (MSB) olarak çizilir.</p>
</section>

<section id="bolum-2">
  <span id="section-2" aria-hidden="true"></span>
  <h2>2. Fiziksel ve Veri Bağlantı Katmanı: Ethernet Mimarisi</h2>
  <p>Yerel ağların (LAN) tartışmasız standardı olan Ethernet, fiziksel kablo üzerindeki çerçeve yapısını ve adresleme kurallarını belirler.</p>
  <h3>Ethernet II (DIX) ve IEEE 802.3</h3>
  <p>Modern internet trafiği <a href="${url('kaynakca', 'tr')}#rfc894">RFC 894</a>'te tanımlanan <strong>Ethernet II</strong> standardını kullanır. 12. ve 13. baytlardaki alan değeri <code>&ge; 1536 (0x0600)</code> ise bu alan bir <strong>EtherType</strong> alanıdır (0x0800 IPv4, 0x0806 ARP, 0x86DD IPv6). Değer <code>&le; 1500</code> ise IEEE 802.3 uzunluk alanıdır ve ardından LLC/SNAP başlığı gelir.</p>
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
    <li><strong>Belgeleme MAC Adresleri (<a href="${url('kaynakca', 'tr')}#rfc9542">RFC 9542 §2.1.4</a>)</strong>: <code>00:00:5e:00:53:00</code> &ndash; <code>00:00:5e:00:53:ff</code> aralığı.</li>
  </ul>
  <h3>MTU ve Minimum 64 Bayt Kuralı</h3>
  <p>Standart Ethernet çerçevesi en az 64 bayt (14 bayt başlık + 46 bayt veri + 4 bayt FCS) olmak zorundadır. Yük 46 bayttan küçükse sıfır sekizlileriyle doldurulur (padding). Standart maksimum iletim birimi (MTU) 1500 sekizlidir; Gigabit ağlarda ise 9000 bayta kadar Jumbo Frame kullanılabilir.</p>
  <h3>VLAN Etiketleme (IEEE 802.1Q) ve PPPoE (RFC 2516)</h3>
  <p>Yerel ağları mantıksal olarak izole eden 802.1Q standardı, kaynak MAC ile EtherType arasına 4 baytlık etiket ekler: <strong>TPID (0x8100)</strong> ve 16 bitlik <strong>TCI</strong> (3 bit PCP öncelik, 1 bit DEI, 12 bit VLAN ID). Genişbant ağlarda kimlik doğrulama sağlayan <strong>PPPoE (<a href="${url('kaynakca', 'tr')}#rfc2516">RFC 2516</a>)</strong> ise Ethernet üzerinde PPP oturumu açarak MTU'yu 1492 bayta sınırlandırır.</p>
</section>

<section id="bolum-3">
  <span id="section-3" aria-hidden="true"></span>
  <h2>3. Adres Çözümleme Protokolleri (ARP, RARP, NDP)</h2>
  <h3>ARP (Address Resolution Protocol - <a href="${url('arp', 'tr')}">RFC 826</a>)</h3>
  <p>Bir ana bilgisayar yerel ağdaki bir cihazın IP adresini bildiğinde ancak hedef MAC adresini bilmediğinde ARP devreye girer. Ethernet üzerinde 28 sekizli uzunluğundadır:</p>
  <div class="table-scroll" tabindex="0" role="region" aria-label="ARP alanları tablosu"><table class="fields">
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
  <span id="section-4" aria-hidden="true"></span>
  <h2>4. Ağ / İnternet Katmanı Protokolleri (IPv4, IPv6, ICMP, ICMPv6)</h2>
  <h3>IPv4 (Internet Protocol Version 4 - <a href="${url('ipv4', 'tr')}">RFC 791</a>)</h3>
  <p>IPv4 başlığı seçenek içermediğinde 20 sekizlidir. IHL alanı 32 bitlik sözcük sayısını (en az 5) belirtir. Hizmet türü (ToS) sekizlisi modern standartlarda <a href="${url('kaynakca', 'tr')}#rfc2474">RFC 2474</a> ile 6 bit <strong>DSCP</strong> (hizmet kalitesi) ve <a href="${url('kaynakca', 'tr')}#rfc3168">RFC 3168</a> ile 2 bit <strong>ECN</strong> (tıkanıklık uyarısı) olarak ikiye ayrılmıştır.</p>
  <p><strong>Parçalama (Fragmentation)</strong>: Identification (16 bit), Flags (DF, MF) ve Fragment Offset (13 bit, 8 sekizli biriminde) alanlarıyla yönlendiriciler MTU'yu aşan paketleri parçalayabilir. DF=1 olan paketler düşürülür ve geriye ICMP Type 3 Code 4 dönülerek Path MTU Discovery (PMTUD) sağlanır.</p>
  <h3>IPv6 (Internet Protocol Version 6 - <a href="${url('ipv6', 'tr')}">RFC 8200</a>)</h3>
  <p>IPv6 başlığı kesinlikle <strong>sabit 40 sekizli (320 bit)</strong> uzunluğundadır. 128 bitlik kaynak ve hedef adresleri, 20 bitlik Akış Etiketi (Flow Label) ve 8 bitlik Sonraki Başlık (Next Header) alanı içerir. IPv6 başlığında yönlendirme gecikmesini önlemek için <em>sağlama toplamı (checksum) kaldırılmıştır</em> ve ara yönlendiricilerin parçalama yapması yasaklanmıştır.</p>
  <h3>ICMPv4 (<a href="${url('icmp', 'tr')}">RFC 792</a>) ve ICMPv6 (<a href="${url('icmpv6', 'tr')}">RFC 4443</a>)</h3>
  <p>Ağ katmanında kontrol ve teşhis iletilerini taşır. En sık kullanılan iletiler: Echo Request (Ping isteği) ve Echo Reply (Ping yanıtı), Destination Unreachable (Hedefe ulaşılamaz - Port/Ağ/Host kapalı), Time Exceeded (TTL/Hop Limit sıfırlandı - Traceroute temeli) ve ICMPv6 Packet Too Big iletisidir.</p>
</section>

<section id="bolum-5">
  <span id="section-5" aria-hidden="true"></span>
  <h2>5. İletim Katmanı Protokolleri (UDP, TCP, SCTP)</h2>
  <h3>UDP (User Datagram Protocol - <a href="${url('udp', 'tr')}">RFC 768</a>)</h3>
  <p>Yalnızca 8 sekizli uzunluğunda minimal bir başlık taşır: Kaynak Port (16 bit), Hedef Port (16 bit), Toplam Uzunluk (16 bit) ve Sağlama Toplamı (16 bit). Bağlantısızdır, akış denetimi yapmaz; DNS, DHCP, VoIP ve QUIC için temel iletim mekanizmasıdır.</p>
  <h3>TCP (Transmission Control Protocol - <a href="${url('tcp', 'tr')}">RFC 9293</a>)</h3>
  <p>Güvenilir, sıralı ve çift yönlü bayt akışı sunar. Seçeneksiz başlık 20 sekizlidir. Sıra numarası (Sequence Number), kümülatif onay numarası (Acknowledgment Number), alıcı pencere boyutu (Window Size) ve kontrol bayrakları taşır:</p>
  <ul class="notes">
    <li><strong>SYN</strong>: Bağlantı kurma ve sıra numaralarını senkronize etme.</li>
    <li><strong>ACK</strong>: Onay alanının geçerli olduğunu bildirme (kurulumdan sonraki tüm paketlerde 1'dir).</li>
    <li><strong>FIN</strong>: Göndericinin veri aktarımını sonlandırması.</li>
    <li><strong>RST</strong>: Bağlantıyı anında koparma / reddetme.</li>
    <li><strong>PSH</strong>: Alıcı tamponunu beklemeden veriyi uygulamaya iletme.</li>
    <li><strong>CWR ve ECE (<a href="${url('kaynakca', 'tr')}#rfc3168">RFC 3168</a>)</strong>: Paket düşürmeden açık tıkanıklık bildirimi yönetimi.</li>
  </ul>
  <p><strong>3 Aşamalı Bağlantı Kurulumu (3-Way Handshake)</strong>: <code>SYN (Seq=X) &rarr; SYN-ACK (Seq=Y, Ack=X+1) &rarr; ACK (Seq=X+1, Ack=Y+1)</code> akışıyla iki yönlü kanal kurulur. Kapanış ise <code>FIN &rarr; ACK &rarr; FIN &rarr; ACK</code> ile 4 adımda gerçekleşir.</p>
</section>

<section id="bolum-6">
  <span id="section-6" aria-hidden="true"></span>
  <h2>6. Uygulama ve Ağ Yapılandırma Protokolleri (DNS, DHCPv4, DHCPv6)</h2>
  <h3>DNS (Domain Name System - <a href="${url('dns', 'tr')}">RFC 1035</a>)</h3>
  <p>12 sekizli sabit başlığında Transaction ID, sorgu/yanıt bayrakları (QR, Opcode, AA, TC, RD, RA, RCODE) ve soru/kayıt sayaçlarını taşır. Ardından gelen soru bölümünde etiket uzunluklarıyla kodlanmış QNAME, QTYPE (A=1, AAAA=28, CNAME=5, MX=15 vb.) ve QCLASS (IN=1) yer alır.</p>
  <h3>DHCPv4 (RFC 2131) ve DHCPv6 (RFC 8415)</h3>
  <p>Otomatik ağ yapılandırması sunar. IPv4'te <strong>DORA</strong> (Discover &rarr; Offer &rarr; Request &rarr; Acknowledge) döngüsü UDP 67/68 portları üzerinden yürütülür ve <code>0x63825363</code> Magic Cookie sekizlileriyle başlar. IPv6'da ise <strong>SARR</strong> (Solicit &rarr; Advertise &rarr; Request &rarr; Reply) akışı UDP 546/547 portlarında multicast ile çalışır.</p>
</section>

<section id="bolum-7">
  <span id="section-7" aria-hidden="true"></span>
  <h2>7. İnternet Sağlama Toplamı (Checksum) Hesaplama Algoritması</h2>
  <h3>RFC 1071 Bire Tümleyen Toplamı</h3>
  <p><a href="${url('kaynakca', 'tr')}#rfc1071">RFC 1071</a>'de tarif edilen standart yöntem şudur: Korunan alanlar 16 bitlik kelimeler halinde 32 bitlik akümülatörde toplanır. Taşma bitleri (carry bits) alt 16 bite eklenir; nihai toplamın 1'e tümleyeni (tüm bitlerin tersi) alınır. Doğrulama sırasında checksum dahil tüm paket toplandığında sonuç <code>0x0000</code> çıkmalıdır.</p>
  <h3>Sözde Başlık (Pseudo-Header) Mimarisi</h3>
  <p>TCP, UDP ve ICMPv6 sağlama toplamı hesaplanırken, paketin yanlış bir IP'ye veya protokole teslimini engellemek için IP katmanındaki Kaynak IP, Hedef IP, Protokol Numarası ve L4 Uzunluğu sanal bir <strong>Sözde Başlık</strong> olarak hesaplamaya dahil edilir (IPv4 için 12 bayt, IPv6 için 40 bayt).</p>
</section>

<section id="bolum-8">
  <span id="section-8" aria-hidden="true"></span>
  <h2>8. Bütün Temel Ağ RFC’lerinin Kapsamlı Kataloğu</h2>
  <div class="table-scroll" tabindex="0" role="region" aria-label="RFC kataloğu tablosu"><table class="fields">
    <thead><tr><th>RFC No</th><th>Başlık</th><th>Durum</th><th>Kapsam ve Kullanım</th></tr></thead>
    <tbody>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc768">RFC 768</a></td><td>User Datagram Protocol</td><td>Standart</td><td>8 baytlık minimal UDP başlığı ve sözde başlık.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc791">RFC 791</a></td><td>Internet Protocol</td><td>Standart</td><td>IPv4 datagram başlığı, parçalama ve yönlendirme.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc792">RFC 792</a></td><td>Internet Control Message Protocol</td><td>Standart</td><td>ICMP hata ve kontrol iletileri.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc826">RFC 826</a></td><td>Ethernet Address Resolution Protocol</td><td>Standart</td><td>ARP paketi ve Ethernet iletim katmanı eşlemesi.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc894">RFC 894</a></td><td>Transmission of IP Datagrams over Ethernet</td><td>Standart</td><td>IP paketlerinin Ethernet II çerçevelerinde taşınması.</td></tr>
      <tr><td>RFC 903</td><td>Reverse Address Resolution Protocol</td><td>Standart</td><td>Disksiz terminallerin MAC'ten IP öğrenmesi (RARP).</td></tr>
      <tr><td>RFC 951</td><td>Bootstrap Protocol (BOOTP)</td><td>Standart</td><td>RARP'ın yerini alan UDP tabanlı açılış protokolü.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc1035">RFC 1035</a></td><td>Domain Names - Implementation and Specification</td><td>Standart</td><td>DNS ileti başlığı, bayraklar ve kaynak kayıt formatı.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc1071">RFC 1071</a></td><td>Computing the Internet Checksum</td><td>Bilgilendirme</td><td>16-bit bire tümleyen sağlama toplamı algoritması.</td></tr>
      <tr><td>RFC 1112</td><td>Host Extensions for IP Multicasting</td><td>Standart</td><td>IPv4 multicast adresleme ve Multicast MAC haritalaması.</td></tr>
      <tr><td>RFC 2131</td><td>Dynamic Host Configuration Protocol</td><td>Öneri</td><td>Otomatik IP ve ağ parametresi dağıtımı (DHCPv4).</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc2474">RFC 2474</a></td><td>Definition of the Differentiated Services Field</td><td>Öneri</td><td>IPv4 ToS ve IPv6 Traffic Class alanında 6 bit DSCP.</td></tr>
      <tr><td>RFC 2516</td><td>A Method for Transmitting PPP Over Ethernet</td><td>Bilgilendirme</td><td>Ethernet üzerinde PPPoE oturumu açma standardı.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc2606">RFC 2606</a></td><td>Reserved Top Level DNS Names</td><td>BCP</td><td>Belgelendirme TLD'leri (.example, .test, .invalid, .localhost).</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc3168">RFC 3168</a></td><td>Addition of Explicit Congestion Notification to IP</td><td>Öneri</td><td>IP ve TCP başlıklarında 2 bitlik açık tıkanıklık uyarısı (ECN).</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc3849">RFC 3849</a></td><td>IPv6 Address Prefix Reserved for Documentation</td><td>Bilgilendirme</td><td>IPv6 belgeleme adresi öneki (2001:db8::/32).</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc4443">RFC 4443</a></td><td>ICMPv6 for the IPv6 Specification</td><td>Standart</td><td>IPv6 kontrol ve hata iletileri (ICMPv6).</td></tr>
      <tr><td>RFC 4861</td><td>Neighbor Discovery for IPv6 (NDP)</td><td>Öneri</td><td>IPv6'da komşu keşfi, yönlendirici ilanı ve adres çözümleme.</td></tr>
      <tr><td>RFC 5227</td><td>IPv4 Address Conflict Detection</td><td>Öneri</td><td>ARP Probe ve Announcement ile adres çakışma tespiti.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc5737">RFC 5737</a></td><td>IPv4 Address Blocks Reserved for Documentation</td><td>Bilgilendirme</td><td>IPv4 belgeleme blokları (192.0.2.0/24, 198.51.100.0/24).</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc8200">RFC 8200</a></td><td>Internet Protocol, Version 6 Specification</td><td>Standart</td><td>Sabit 40 sekizli IPv6 başlığı ve uzantı başlıkları.</td></tr>
      <tr><td>RFC 8415</td><td>Dynamic Host Configuration Protocol for IPv6</td><td>Öneri</td><td>IPv6 dinamik yapılandırma protokolü (DHCPv6).</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc9293">RFC 9293</a></td><td>Transmission Control Protocol (TCP)</td><td>Standart</td><td>Modern TCP başlığı, durum makinesi ve kontrol bayrakları.</td></tr>
      <tr><td><a href="${url('kaynakca', 'tr')}#rfc9542">RFC 9542</a></td><td>IANA Considerations for IEEE 802 Parameters</td><td>BCP</td><td>Belgelendirme MAC adresleri (00:00:5e:00:53:xx).</td></tr>
    </tbody>
  </table></div>
</section>

<section id="bolum-9">
  <span id="section-9" aria-hidden="true"></span>
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
  <span id="section-10" aria-hidden="true"></span>
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
  <span id="section-11" aria-hidden="true"></span>
  <h2>11. Tüm Katmanlardaki Protokollerin Araştırması ve wire Genişleme Yol Haritası</h2>
  <p>wire sistemine yeni bir protokolün eklenebilmesi için resmi bir IETF RFC'sinde yayımlanmış olması, <code>src/rfc.mjs</code> tarafından doğrulanabilir bir ASCII başlık şemasına ya da RFC 9000 biçiminde bir şekle sahip olması ve deterministik olarak örnek bayt dizisi üretilebilmesi gerekir. Hiçbir RFC'nin tanımlamadığı protokoller (LLDP, PTP) IEEE standardına dayanabilir; bu sayfalar makineyle doğrulanmadıklarını belirtir.</p>

  <h3>Katman Katman Aday Protokoller</h3>
  <div class="table-scroll" tabindex="0" role="region" aria-label="Aday protokoller tablosu"><table class="fields">
    <thead><tr><th>Katman</th><th>Aday Protokol</th><th>RFC</th><th>Başlık Boyutu</th><th>Durum</th><th>Değerlendirme ve Fizibilite</th></tr></thead>
    <tbody>
      <tr><td>Bağlantı</td><td><strong>PPPoE</strong></td><td>RFC 2516 §4</td><td>6 sekizli</td><td class="roadmap-status">${roadmapStatus('pppoe', 'tr')}</td><td><strong>Çok Yüksek</strong>. Version, Type, Code, Session_ID, Length alanları. DSL ve fiber optik genişbant erişiminde evrenseldir.</td></tr>
      <tr><td>Bağlantı</td><td><strong>IEEE 802.1Q (VLAN)</strong></td><td>IEEE 802.1Q-2022 §9.4, §9.6</td><td>4 sekizli</td><td class="roadmap-status">${roadmapStatus('vlan', 'tr')}</td><td><strong>Yüksek</strong>. TPID (0x8100), PCP (3 bit), DEI (1 bit), VID (12 bit). IEEE 802.1Q-2022’nin lisanslı bir kopyasına karşı doğrulanır.</td></tr>
      <tr><td>Bağlantı</td><td><strong>LLDP</strong></td><td>IEEE 802.1AB</td><td>TLV dizisi</td><td class="roadmap-status">${roadmapStatus('lldp', 'tr')}</td><td><strong>Orta</strong>. 7 bit tür, 9 bit uzunluk. IEEE 802.1AB-2016’nın lisanslı bir kopyasına ve MIB modüllerine karşı doğrulanır.</td></tr>
      <tr><td>Bağlantı</td><td><strong>MPLS</strong></td><td>RFC 3032 §2.1, RFC 5462</td><td>4 sekizli / etiket</td><td class="roadmap-status">${roadmapStatus('mpls', 'tr')}</td><td><strong>Yüksek</strong>. Label (20), TC (3), S (1), TTL (8).</td></tr>
      <tr><td>Bağlantı</td><td><strong>RARP</strong></td><td>RFC 903</td><td>28 sekizli</td><td class="roadmap-status">${roadmapStatus('rarp', 'tr')}</td><td><strong>Yüksek</strong>. RFC 826 ARP ile birebir aynı yerleşimi paylaşır (op=3/4).</td></tr>
      <tr><td>Ağ</td><td><strong>IGMPv2</strong></td><td>RFC 2236 §2</td><td>8 sekizli</td><td class="roadmap-status">${roadmapStatus('igmp', 'tr')}</td><td><strong>Çok Yüksek</strong>. Type (8), Max Resp Time (8), Checksum (16), Group Address (32). IP multicast ve IPTV için kritik; RFC 1071 sağlama toplamı kullanır.</td></tr>
      <tr><td>Ağ</td><td><strong>IPv6 Fragment</strong></td><td>RFC 8200 §4.5</td><td>8 sekizli</td><td class="roadmap-status">${roadmapStatus('ipv6-frag', 'tr')}</td><td><strong>Çok Yüksek</strong>. Next Header (8), Reserved (8), Fragment Offset (13), M Flag (1), Identification (32). Sabit 32 bit ızgaraya oturur.</td></tr>
      <tr><td>Ağ</td><td><strong>IPsec ESP</strong></td><td>RFC 4303 §2</td><td>8 sekizli + kuyruk</td><td class="roadmap-status">${roadmapStatus('esp', 'tr')}</td><td><strong>Yüksek</strong>. SPI (32), Sequence Number (32); kuyrukta Pad Length (8) ve Next Header (8).</td></tr>
      <tr><td>Ağ</td><td><strong>GRE</strong></td><td>RFC 2784 §2.1</td><td>4 sekizli</td><td class="roadmap-status">${roadmapStatus('gre', 'tr')}</td><td><strong>Yüksek</strong>. Temel tünelleme başlığı (Flags/Reserved 16, Protocol Type 16).</td></tr>
      <tr><td>Taşıma</td><td><strong>SCTP</strong></td><td>RFC 9260 §3</td><td>12 sekizli + chunk</td><td class="roadmap-status">${roadmapStatus('sctp', 'tr')}</td><td><strong>Çok Yüksek</strong>. Source Port (16), Destination Port (16), Verification Tag (32), Checksum (32). Telekom altyapısı ve WebRTC için standarttır.</td></tr>
      <tr><td>Taşıma</td><td><strong>QUIC</strong></td><td>RFC 9000 §17.2.2</td><td>değişken</td><td class="roadmap-status">${roadmapStatus('quic', 'tr')}</td><td><strong>Orta</strong>. RFC 9000’in şekil gösterimi ayrıca okunur; aralıklar ve değişken uzunluklu tamsayılar da karşılaştırılır.</td></tr>
      <tr><td>Taşıma</td><td><strong>Geneve</strong></td><td>RFC 8926 §3.1</td><td>8 sekizli + seçenekler</td><td class="roadmap-status">${roadmapStatus('geneve', 'tr')}</td><td><strong>Yüksek</strong>. VXLAN’ın seçenek taşıyabilen halefi.</td></tr>
      <tr><td>Uygulama</td><td><strong>DHCPv4 / BOOTP</strong></td><td>RFC 2131 §2</td><td>236 sekizli + seçenekler</td><td class="roadmap-status">${roadmapStatus('dhcp', 'tr')}</td><td><strong>Çok Yüksek</strong>. 32-bit ASCII şeması tamdır. Paket yakalamalarında en çok aranan ve incelenen protokoldür.</td></tr>
      <tr><td>Uygulama</td><td><strong>NTP</strong></td><td>RFC 5905 §7.3</td><td>48 sekizli</td><td class="roadmap-status">${roadmapStatus('ntp', 'tr')}</td><td><strong>Çok Yüksek</strong>. Sabit 384 bitlik şeması vardır; zaman senkronizasyonunun küresel standardıdır.</td></tr>
      <tr><td>Uygulama</td><td><strong>PTP</strong></td><td>IEEE 1588-2008 Table 18, Table 26</td><td>34 sekizli + gövde</td><td class="roadmap-status">${roadmapStatus('ptp', 'tr')}</td><td><strong>Orta</strong>. Alanı çizen bir RFC yok; alanlar IEEE 1588-2008’in lisanslı bir kopyasındaki ileti tablolarına karşı doğrulanır.</td></tr>
      <tr><td>Uygulama</td><td><strong>RTCP SR</strong></td><td>RFC 3550 §6.4.1</td><td>28 sekizli + raporlar</td><td class="roadmap-status">${roadmapStatus('rtcp', 'tr')}</td><td><strong>Yüksek</strong>. RTP sayfasının denetim akışı.</td></tr>
      <tr><td>Uygulama</td><td><strong>STUN</strong></td><td>RFC 8489 §5</td><td>20 sekizli + öznitelikler</td><td class="roadmap-status">${roadmapStatus('stun', 'tr')}</td><td><strong>Yüksek</strong>. NAT geçişi ve WebRTC için temel.</td></tr>
      <tr><td>Uygulama</td><td><strong>WebSocket</strong></td><td>RFC 6455 §5.2</td><td>2–14 sekizli</td><td class="roadmap-status">${roadmapStatus('websocket', 'tr')}</td><td><strong>Yüksek</strong>. Maskeleme anahtarı ABNF’den, diğer alanlar şemadan doğrulanır.</td></tr>
      <tr><td>Uygulama</td><td><strong>HTTP/2</strong></td><td>RFC 9113 §4.1</td><td>9 sekizli</td><td class="roadmap-status">${roadmapStatus('http2', 'tr')}</td><td><strong>Yüksek</strong>. RFC 9000 ile aynı şekil gösterimini kullanır.</td></tr>
    </tbody>
  </table></div>

  <h3>Önerilen Uygulama Sıralaması</h3>
  <ul class="notes">
    <li><strong>1. Faz (Hızlı Entegrasyon)</strong>: <code>PPPoE (RFC 2516)</code>${roadmapNote('pppoe', 'tr')}, <code>IGMPv2 (RFC 2236)</code>${roadmapNote('igmp', 'tr')} ve <code>NTP (RFC 5905)</code>${roadmapNote('ntp', 'tr')} &mdash; Sabit boyutlu şemalar ve standart sağlama toplamları sayesinde altyapıya anında uyum sağlar.</li>
    <li><strong>2. Faz (Temel Altyapı)</strong>: <code>DHCPv4 (RFC 2131)</code>${roadmapNote('dhcp', 'tr')}, <code>SCTP (RFC 9260)</code>${roadmapNote('sctp', 'tr')} ve <code>IPv6 Fragment Header (RFC 8200)</code>${roadmapNote('ipv6-frag', 'tr')} &mdash; Eğitsel değeri yüksek, genişletilmiş başlıklar.</li>
    <li><strong>3. Faz (Tünelleme ve Güvenlik)</strong>: <code>GRE (RFC 2784)</code>${roadmapNote('gre', 'tr')}, <code>IPsec AH (RFC 4302)</code>${roadmapNote('ah', 'tr')} ve <code>DHCPv6 (RFC 8415)</code>${roadmapNote('dhcpv6', 'tr')}.</li>
  </ul>
</section>` : `
<section id="section-1">
  <span id="bolum-1" aria-hidden="true"></span>
  <h2>1. Network Architecture and Encapsulation Principles</h2>
  <p>Data transmission across computer networks is structured hierarchically. The two foundational reference frameworks are the 7-layer <strong>OSI Model</strong> and the practical standard 4-layer <strong>TCP/IP Model</strong>:</p>
  <div class="table-scroll" tabindex="0" role="region" aria-label="OSI and TCP/IP layers table"><table class="fields">
    <thead><tr><th>Layer (OSI)</th><th>TCP/IP Layer</th><th>PDU Name</th><th>Example Protocols</th><th>Function</th></tr></thead>
    <tbody>
      <tr><td>7. Application, 6. Presentation, 5. Session</td><td>Application</td><td>Data</td><td><a href="${url('dns', 'en')}">DNS</a>, HTTP, DHCP, NTP</td><td>User and process level data creation, formatting, and presentation.</td></tr>
      <tr><td>4. Transport</td><td>Transport</td><td>Segment / Datagram</td><td><a href="${url('tcp', 'en')}">TCP</a>, <a href="${url('udp', 'en')}">UDP</a>, SCTP</td><td>End-to-end process-to-process reliable or high-throughput data delivery.</td></tr>
      <tr><td>3. Network</td><td>Internet / Network</td><td>Packet / Datagram</td><td><a href="${url('ipv4', 'en')}">IPv4</a>, <a href="${url('ipv6', 'en')}">IPv6</a>, <a href="${url('icmp', 'en')}">ICMP</a>, <a href="${url('icmpv6', 'en')}">ICMPv6</a></td><td>Logical addressing and routing across multiple network boundaries.</td></tr>
      <tr><td>2. Data Link</td><td rowspan="2">Link / Network Access</td><td>Frame</td><td><a href="${url('ethernet', 'en')}">Ethernet</a>, <a href="${url('arp', 'en')}">ARP</a>, 802.1Q VLAN, PPPoE</td><td>Direct node-to-node frame delivery across physical local-area media.</td></tr>
      <tr><td>1. Physical</td><td>Bit Stream</td><td>1000BASE-T, Optical Fiber, Radio</td><td>Physical transmission of binary 0 and 1 electrical, optical, or RF signals.</td></tr>
    </tbody>
  </table></div>
  <h3>Encapsulation Flow</h3>
  <p>As data generated by the application traverses down through the protocol stack, each layer wraps the payload with a control header. At the data link layer, a Frame Check Sequence (FCS / CRC-32) trailer is appended. The receiving node reverses this process (decapsulation), stripping headers at each layer before delivering data to the target process.</p>
  <h3>Network Byte Order</h3>
  <p>Multi-byte binary fields in Internet protocol headers (such as 16-bit port numbers and 32-bit IP addresses) are transmitted in <strong>Big-Endian</strong> (network byte order). The most significant octet (MSB) is placed on the wire first. In IETF RFC diagrams, Bit 0 is drawn as the leftmost, most significant bit.</p>
</section>

<section id="section-2">
  <span id="bolum-2" aria-hidden="true"></span>
  <h2>2. Physical and Data Link Layer: Ethernet Architecture</h2>
  <p>Ethernet is the ubiquitous standard for wired local area networks (LANs), defining frame framing, synchronization, and physical hardware addressing.</p>
  <h3>Ethernet II (DIX) vs. IEEE 802.3</h3>
  <p>Virtually all modern IP traffic uses <a href="${url('kaynakca', 'en')}#rfc894">RFC 894</a> <strong>Ethernet II</strong> framing. When octets 12–13 evaluate to <code>&ge; 1536 (0x0600)</code>, the field functions as an <strong>EtherType</strong> (0x0800 for IPv4, 0x0806 for ARP, 0x86DD for IPv6). When <code>&le; 1500</code>, it indicates an IEEE 802.3 length field followed by LLC/SNAP encapsulation.</p>
  <pre><code>+--------------------+-------------------+--------------------+--------------------+--------------------+--------------------+--------------------+
| Preamble           | SFD               | Destination MAC    | Source MAC         | EtherType          | Payload            | FCS (CRC-32)       |
| 7 octets (0xAA...) | 1 octet (0xAB)    | 6 octets (48 bits) | 6 octets (48 bits) | 2 octets (16 bits) | 46 - 1500 octets   | 4 octets (32 bits) |
+--------------------+-------------------+--------------------+--------------------+--------------------+--------------------+--------------------+</code></pre>
  <h3>MAC Address Structure and Special Ranges</h3>
  <p>The first octet of a 48-bit MAC address determines transmission scope: <strong>b0 (I/G bit)</strong> indicates Unicast (0) vs. Multicast/Broadcast (1). <strong>b1 (U/L bit)</strong> indicates Universally Administered OUI (0) vs. Locally Administered (1).</p>
  <ul class="notes">
    <li><strong>Broadcast</strong>: <code>ff:ff:ff:ff:ff:ff</code> (all bits set).</li>
    <li><strong>IPv4 Multicast (RFC 1112)</strong>: <code>01:00:5e:00:00:00</code> &ndash; <code>01:00:5e:7f:ff:ff</code> range.</li>
    <li><strong>IPv6 Multicast (RFC 2464)</strong>: <code>33:33:xx:xx:xx:xx</code> prefix.</li>
    <li><strong>Documentation MAC Addresses (<a href="${url('kaynakca', 'en')}#rfc9542">RFC 9542 §2.1.4</a>)</strong>: <code>00:00:5e:00:53:00</code> &ndash; <code>00:00:5e:00:53:ff</code>.</li>
  </ul>
  <h3>MTU and the 64-Octet Minimum Frame Rule</h3>
  <p>Standard Ethernet frames must be at least 64 octets (14-octet header + 46-octet minimum payload + 4-octet FCS). Payloads smaller than 46 octets are padded with zero octets. The maximum transmission unit (MTU) is 1500 octets; Gigabit switches often support Jumbo Frames up to 9000 octets.</p>
  <h3>VLAN Tagging (IEEE 802.1Q) and PPPoE (RFC 2516)</h3>
  <p>IEEE 802.1Q inserts a 4-octet tag between source MAC and EtherType: <strong>TPID (0x8100)</strong> and a 16-bit <strong>TCI</strong> (3-bit PCP priority, 1-bit DEI, 12-bit VLAN ID). For broadband authentication, <strong>PPPoE (<a href="${url('kaynakca', 'en')}#rfc2516">RFC 2516</a>)</strong> encapsulates PPP frames over Ethernet, reducing MTU to 1492 octets.</p>
</section>

<section id="section-3">
  <span id="bolum-3" aria-hidden="true"></span>
  <h2>3. Address Resolution Protocols (ARP, RARP, NDP)</h2>
  <h3>ARP (Address Resolution Protocol - <a href="${url('arp', 'en')}">RFC 826</a>)</h3>
  <p>ARP resolves a known destination IPv4 address to its physical hardware MAC address on a local broadcast segment. The packet is 28 octets over Ethernet:</p>
  <div class="table-scroll" tabindex="0" role="region" aria-label="ARP fields table"><table class="fields">
    <thead><tr><th>Field</th><th>Width</th><th>Sample</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td>Hardware Type (ar$hrd)</td><td>16 bits</td><td><code>1</code></td><td>Ethernet hardware.</td></tr>
      <tr><td>Protocol Type (ar$pro)</td><td>16 bits</td><td><code>0x0800</code></td><td>IPv4 protocol.</td></tr>
      <tr><td>HLN / PLN</td><td>8 + 8 bits</td><td><code>6 / 4</code></td><td>Hardware (MAC) and protocol (IPv4) address lengths.</td></tr>
      <tr><td>Operation (ar$op)</td><td>16 bits</td><td><code>1 / 2</code></td><td>1: ARP Request, 2: ARP Reply.</td></tr>
      <tr><td>Sender MAC / IP</td><td>48 + 32 bits</td><td><code>00:00:5e:00:53:01 / 192.0.2.1</code></td><td>Addresses of the requesting device.</td></tr>
      <tr><td>Target MAC / IP</td><td>48 + 32 bits</td><td><code>00:00:00:00:00:00 / 192.0.2.2</code></td><td>Target MAC is zero in request; target IP is queried.</td></tr>
    </tbody>
  </table></div>
  <p><strong>Gratuitous ARP and ACD (RFC 5227)</strong>: Requests sent by a host for its own IP to detect address conflicts and update switch forwarding tables. Historical <strong>RARP (RFC 903)</strong> is replaced by DHCP. In IPv6, ARP is replaced by ICMPv6-based <strong>NDP (RFC 4861)</strong>.</p>
</section>

<section id="section-4">
  <span id="bolum-4" aria-hidden="true"></span>
  <h2>4. Network / Internet Layer Protocols (IPv4, IPv6, ICMP, ICMPv6)</h2>
  <h3>IPv4 (Internet Protocol Version 4 - <a href="${url('ipv4', 'en')}">RFC 791</a>)</h3>
  <p>An options-free IPv4 header is 20 octets. The IHL field indicates header length in 32-bit words (minimum 5). The Type of Service (ToS) octet is modernized by <a href="${url('kaynakca', 'en')}#rfc2474">RFC 2474</a> into 6-bit <strong>DSCP</strong> (quality of service) and <a href="${url('kaynakca', 'en')}#rfc3168">RFC 3168</a> into 2-bit <strong>ECN</strong> (congestion notification).</p>
  <p><strong>Fragmentation</strong>: Identification (16 bits), Flags (DF, MF), and Fragment Offset (13 bits in 8-octet units) allow routers to fragment oversized datagrams. When DF=1, routers drop the packet and return ICMP Type 3 Code 4 to enable Path MTU Discovery (PMTUD).</p>
  <h3>IPv6 (Internet Protocol Version 6 - <a href="${url('ipv6', 'en')}">RFC 8200</a>)</h3>
  <p>The IPv6 base header is strictly <strong>fixed at 40 octets (320 bits)</strong>, carrying 128-bit source and destination addresses, a 20-bit Flow Label, and an 8-bit Next Header field. To reduce per-hop routing latency, the IPv6 header <em>eliminates the header checksum</em> and disallows intermediate fragmentation.</p>
  <h3>ICMPv4 (<a href="${url('icmp', 'en')}">RFC 792</a>) and ICMPv6 (<a href="${url('icmpv6', 'en')}">RFC 4443</a>)</h3>
  <p>Delivers diagnostic and error reporting messages at the network layer. Common messages include Echo Request/Reply (Ping), Destination Unreachable, Time Exceeded (TTL/Hop Limit expired &ndash; foundation of Traceroute), and Packet Too Big.</p>
</section>

<section id="section-5">
  <span id="bolum-5" aria-hidden="true"></span>
  <h2>5. Transport Layer Protocols (UDP, TCP, SCTP)</h2>
  <h3>UDP (User Datagram Protocol - <a href="${url('udp', 'en')}">RFC 768</a>)</h3>
  <p>Carries an 8-octet minimal header: Source Port (16 bits), Destination Port (16 bits), Length (16 bits), and Checksum (16 bits). Connectionless with zero handshake overhead; foundation for DNS, DHCP, VoIP, and QUIC.</p>
  <h3>TCP (Transmission Control Protocol - <a href="${url('tcp', 'en')}">RFC 9293</a>)</h3>
  <p>Provides reliable, ordered, full-duplex stream transport. Base header is 20 octets, featuring Sequence Number, Acknowledgment Number, Window Size, and control flags:</p>
  <ul class="notes">
    <li><strong>SYN</strong>: Synchronize sequence numbers to establish connection.</li>
    <li><strong>ACK</strong>: Indicates that the Acknowledgment field is significant.</li>
    <li><strong>FIN</strong>: Sender has finished transmitting data.</li>
    <li><strong>RST</strong>: Reset/abort connection immediately.</li>
    <li><strong>PSH</strong>: Push data directly to receiving application without waiting for buffer fills.</li>
    <li><strong>CWR and ECE (<a href="${url('kaynakca', 'en')}#rfc3168">RFC 3168</a>)</strong>: Explicit Congestion Notification negotiation and response.</li>
  </ul>
  <p><strong>3-Way Handshake</strong>: <code>SYN (Seq=X) &rarr; SYN-ACK (Seq=Y, Ack=X+1) &rarr; ACK (Seq=X+1, Ack=Y+1)</code>. Teardown requires a 4-step <code>FIN &rarr; ACK &rarr; FIN &rarr; ACK</code> exchange.</p>
</section>

<section id="section-6">
  <span id="bolum-6" aria-hidden="true"></span>
  <h2>6. Application and Network Configuration Protocols (DNS, DHCPv4, DHCPv6)</h2>
  <h3>DNS (Domain Name System - <a href="${url('dns', 'en')}">RFC 1035</a>)</h3>
  <p>A fixed 12-octet header containing Transaction ID, flags (QR, Opcode, AA, TC, RD, RA, RCODE), and question/record counts, followed by length-prefixed QNAMEs, QTYPE (A=1, AAAA=28, CNAME=5, MX=15), and QCLASS (IN=1).</p>
  <h3>DHCPv4 (RFC 2131) and DHCPv6 (RFC 8415)</h3>
  <p>Automated network configuration. IPv4 uses the <strong>DORA</strong> (Discover &rarr; Offer &rarr; Request &rarr; Acknowledge) cycle over UDP 67/68 with magic cookie <code>0x63825363</code>. IPv6 uses <strong>SARR</strong> (Solicit &rarr; Advertise &rarr; Request &rarr; Reply) multicast over UDP 546/547.</p>
</section>

<section id="section-7">
  <span id="bolum-7" aria-hidden="true"></span>
  <h2>7. Internet Checksum Computation Algorithm</h2>
  <h3>RFC 1071 One's Complement Sum</h3>
  <p><a href="${url('kaynakca', 'en')}#rfc1071">RFC 1071</a> specifies summing 16-bit words into a 32-bit accumulator, folding overflow carry bits into the lower 16 bits, and taking the one's complement (bitwise inversion). Summing an intact packet including its checksum yields <code>0x0000</code>.</p>
  <h3>Pseudo-Header Architecture</h3>
  <p>When computing TCP, UDP, and ICMPv6 checksums, a virtual <strong>Pseudo-Header</strong> comprising Source IP, Destination IP, Protocol/Next-Header number, and L4 Length is prepended (12 octets for IPv4, 40 octets for IPv6) to protect against misdelivery.</p>
</section>

<section id="section-8">
  <span id="bolum-8" aria-hidden="true"></span>
  <h2>8. Comprehensive Catalogue of Core Network RFCs</h2>
  <div class="table-scroll" tabindex="0" role="region" aria-label="RFC catalogue table"><table class="fields">
    <thead><tr><th>RFC No</th><th>Title</th><th>Status</th><th>Scope and Usage</th></tr></thead>
    <tbody>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc768">RFC 768</a></td><td>User Datagram Protocol</td><td>Standard</td><td>8-octet UDP header and pseudo-header specification.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc791">RFC 791</a></td><td>Internet Protocol</td><td>Standard</td><td>IPv4 datagram header, fragmentation, and routing.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc792">RFC 792</a></td><td>Internet Control Message Protocol</td><td>Standard</td><td>ICMP error and diagnostic message formats.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc826">RFC 826</a></td><td>Ethernet Address Resolution Protocol</td><td>Standard</td><td>ARP packet layout and Ethernet delivery mapping.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc894">RFC 894</a></td><td>Transmission of IP Datagrams over Ethernet</td><td>Standard</td><td>Standard encapsulation of IP datagrams in Ethernet II frames.</td></tr>
      <tr><td>RFC 903</td><td>Reverse Address Resolution Protocol</td><td>Standard</td><td>Diskless workstation IP discovery via MAC address (RARP).</td></tr>
      <tr><td>RFC 951</td><td>Bootstrap Protocol (BOOTP)</td><td>Standard</td><td>UDP bootstrap protocol predecessor to DHCP.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc1035">RFC 1035</a></td><td>Domain Names - Implementation and Specification</td><td>Standard</td><td>DNS message format, flags, and resource record encoding.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc1071">RFC 1071</a></td><td>Computing the Internet Checksum</td><td>Informational</td><td>16-bit one's complement checksum algorithm.</td></tr>
      <tr><td>RFC 1112</td><td>Host Extensions for IP Multicasting</td><td>Standard</td><td>IPv4 multicast addressing and MAC mapping.</td></tr>
      <tr><td>RFC 2131</td><td>Dynamic Host Configuration Protocol</td><td>Proposed</td><td>Dynamic host IP and network parameter assignment (DHCPv4).</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc2474">RFC 2474</a></td><td>Definition of the Differentiated Services Field</td><td>Proposed</td><td>6-bit DSCP field in IPv4 ToS and IPv6 Traffic Class.</td></tr>
      <tr><td>RFC 2516</td><td>A Method for Transmitting PPP Over Ethernet</td><td>Informational</td><td>PPPoE session discovery and framing standard.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc2606">RFC 2606</a></td><td>Reserved Top Level DNS Names</td><td>BCP</td><td>Documentation TLDs (.example, .test, .invalid, .localhost).</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc3168">RFC 3168</a></td><td>Addition of Explicit Congestion Notification to IP</td><td>Proposed</td><td>2-bit ECN explicit congestion notification in IP and TCP.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc3849">RFC 3849</a></td><td>IPv6 Address Prefix Reserved for Documentation</td><td>Informational</td><td>IPv6 documentation address prefix (2001:db8::/32).</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc4443">RFC 4443</a></td><td>ICMPv6 for the IPv6 Specification</td><td>Standard</td><td>IPv6 control and error reporting messages (ICMPv6).</td></tr>
      <tr><td>RFC 4861</td><td>Neighbor Discovery for IPv6 (NDP)</td><td>Proposed</td><td>IPv6 neighbor discovery, router advertisement, and resolution.</td></tr>
      <tr><td>RFC 5227</td><td>IPv4 Address Conflict Detection</td><td>Proposed</td><td>ARP Probe and Announcement conflict detection.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc5737">RFC 5737</a></td><td>IPv4 Address Blocks Reserved for Documentation</td><td>Informational</td><td>IPv4 documentation blocks (192.0.2.0/24, 198.51.100.0/24).</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc8200">RFC 8200</a></td><td>Internet Protocol, Version 6 Specification</td><td>Standard</td><td>Fixed 40-octet IPv6 header and chained extension headers.</td></tr>
      <tr><td>RFC 8415</td><td>Dynamic Host Configuration Protocol for IPv6</td><td>Proposed</td><td>Dynamic IPv6 host configuration protocol (DHCPv6).</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc9293">RFC 9293</a></td><td>Transmission Control Protocol (TCP)</td><td>Standard</td><td>Modern TCP specification, state machine, and control flags.</td></tr>
      <tr><td><a href="${url('kaynakca', 'en')}#rfc9542">RFC 9542</a></td><td>IANA Considerations for IEEE 802 Parameters</td><td>BCP</td><td>Documentation MAC addresses (00:00:5e:00:53:xx).</td></tr>
    </tbody>
  </table></div>
</section>

<section id="section-9">
  <span id="bolum-9" aria-hidden="true"></span>
  <h2>9. End-to-End Packet Analysis and Hexadecimal Walkthroughs</h2>
  <h3>Sample 1: ARP Request over Ethernet (42 Octets + Padding)</h3>
  <pre><code>0000   ff ff ff ff ff ff 00 00 5e 00 53 01 08 06 00 01
0010   08 00 06 04 00 01 00 00 5e 00 53 01 c0 00 02 01
0020   00 00 00 00 00 00 c0 00 02 02 00 00 00 00 00 00
0030   00 00 00 00 00 00 00 00 00 00 00 00</code></pre>
  <p><code>ff:ff:ff:ff:ff:ff</code> is the destination broadcast MAC. <code>08 06</code> is EtherType. <code>00 01 08 00 06 04 00 01</code> represents Ethernet hardware, IPv4 protocol, 6-octet MAC, 4-octet IP, and ARP Request op. <code>c0 00 02 01</code> is sender IP (192.0.2.1), <code>c0 00 02 02</code> is target IP (192.0.2.2).</p>

  <h3>Sample 2: Ethernet + IPv4 + TCP SYN Packet (54 Octets)</h3>
  <pre><code>0000   00 00 5e 00 53 02 00 00 5e 00 53 01 08 00 45 00
0010   00 28 4a 12 40 00 40 06 86 5e c0 00 02 01 c6 33
0020   64 07 c4 12 00 50 12 34 56 78 00 00 00 00 50 02
0030   72 10 d3 c4 00 00</code></pre>
  <p><code>08 00</code> denotes IPv4. <code>45</code> is Version 4 and 20-octet IP header. Protocol <code>06</code> is TCP. Source IP is <code>192.0.2.1</code>, destination IP is <code>198.51.100.7</code>. Ports are <code>c4 12</code> (50194) and <code>00 50</code> (80 HTTP). <code>12 34 56 78</code> is initial sequence number (ISN). Control byte <code>02</code> asserts SYN.</p>
</section>

<section id="section-10">
  <span id="bolum-10" aria-hidden="true"></span>
  <h2>10. Network Analysis and Packet Inspection Tools Guide</h2>
  <p>Standard console commands for capturing and inspecting packets on the wire:</p>
  <pre><code># Live packet capture with Ethernet headers and complete hex dump:
sudo tcpdump -i eth0 -e -XX -nn "arp or ip"

# Filter and capture TCP SYN packets on port 80:
sudo tcpdump -i any -nn "tcp[tcpflags] & tcp-syn != 0 and port 80"

# Craft and send bit-accurate Ethernet + IP + TCP packets with Scapy:
# from scapy.all import Ether, IP, TCP, sendp
# p = Ether(dst="00:00:5e:00:53:02") / IP(dst="198.51.100.7") / TCP(dport=80, flags="S")
# sendp(p, iface="eth0")</code></pre>
</section>

<section id="section-11">
  <span id="bolum-11" aria-hidden="true"></span>
  <h2>11. Protocol Survey Across Layers and wire Roadmap</h2>
  <p>To be incorporated into wire, a candidate protocol must be published in an official IETF RFC, feature an ASCII layout verifiable by <code>src/rfc.mjs</code> or RFC 9000-style figures, and allow deterministic example generation. Protocols without RFC drawings (LLDP, PTP) reference verified IEEE standards.</p>

  <h3>Candidate Protocols by Layer</h3>
  <div class="table-scroll" tabindex="0" role="region" aria-label="Candidate protocols table"><table class="fields">
    <thead><tr><th>Layer</th><th>Protocol</th><th>RFC</th><th>Header Size</th><th>Status</th><th>Assessment and Feasibility</th></tr></thead>
    <tbody>
      <tr><td>Link</td><td><strong>PPPoE</strong></td><td>RFC 2516 §4</td><td>6 octets</td><td class="roadmap-status">${roadmapStatus('pppoe', 'en')}</td><td><strong>Very High</strong>. Version, Type, Code, Session_ID, Length. Universal in DSL/FTTH broadband access.</td></tr>
      <tr><td>Link</td><td><strong>IEEE 802.1Q (VLAN)</strong></td><td>IEEE 802.1Q-2022 §9.4, §9.6</td><td>4 octets</td><td class="roadmap-status">${roadmapStatus('vlan', 'en')}</td><td><strong>High</strong>. TPID (0x8100), PCP (3 bits), DEI (1 bit), VID (12 bits). Verified against licensed copy.</td></tr>
      <tr><td>Link</td><td><strong>LLDP</strong></td><td>IEEE 802.1AB</td><td>TLV sequence</td><td class="roadmap-status">${roadmapStatus('lldp', 'en')}</td><td><strong>Medium</strong>. 7-bit type, 9-bit length. Verified against licensed copy and MIB modules.</td></tr>
      <tr><td>Link</td><td><strong>MPLS</strong></td><td>RFC 3032 §2.1, RFC 5462</td><td>4 octets / label</td><td class="roadmap-status">${roadmapStatus('mpls', 'en')}</td><td><strong>High</strong>. Label (20), TC (3), S (1), TTL (8).</td></tr>
      <tr><td>Link</td><td><strong>RARP</strong></td><td>RFC 903</td><td>28 octets</td><td class="roadmap-status">${roadmapStatus('rarp', 'en')}</td><td><strong>High</strong>. Shares identical layout with RFC 826 ARP (op=3/4).</td></tr>
      <tr><td>Network</td><td><strong>IGMPv2</strong></td><td>RFC 2236 §2</td><td>8 octets</td><td class="roadmap-status">${roadmapStatus('igmp', 'en')}</td><td><strong>Very High</strong>. Type (8), Max Resp Time (8), Checksum (16), Group Address (32). Critical for IP multicast; uses RFC 1071 checksum.</td></tr>
      <tr><td>Network</td><td><strong>IPv6 Fragment</strong></td><td>RFC 8200 §4.5</td><td>8 octets</td><td class="roadmap-status">${roadmapStatus('ipv6-frag', 'en')}</td><td><strong>Very High</strong>. Next Header (8), Reserved (8), Fragment Offset (13), M Flag (1), Identification (32). Fits 32-bit grid.</td></tr>
      <tr><td>Network</td><td><strong>IPsec ESP</strong></td><td>RFC 4303 §2</td><td>8 octets + trailer</td><td class="roadmap-status">${roadmapStatus('esp', 'en')}</td><td><strong>High</strong>. SPI (32), Sequence Number (32); trailer Pad Length (8) and Next Header (8).</td></tr>
      <tr><td>Network</td><td><strong>GRE</strong></td><td>RFC 2784 §2.1</td><td>4 octets</td><td class="roadmap-status">${roadmapStatus('gre', 'en')}</td><td><strong>High</strong>. Base tunneling header (Flags/Reserved 16, Protocol Type 16).</td></tr>
      <tr><td>Transport</td><td><strong>SCTP</strong></td><td>RFC 9260 §3</td><td>12 octets + chunks</td><td class="roadmap-status">${roadmapStatus('sctp', 'en')}</td><td><strong>Very High</strong>. Source Port (16), Destination Port (16), Verification Tag (32), Checksum (32). Standard in telecom and WebRTC.</td></tr>
      <tr><td>Transport</td><td><strong>QUIC</strong></td><td>RFC 9000 §17.2.2</td><td>variable</td><td class="roadmap-status">${roadmapStatus('quic', 'en')}</td><td><strong>Medium</strong>. Extracted from RFC 9000 figure notation including variable-length integers.</td></tr>
      <tr><td>Transport</td><td><strong>Geneve</strong></td><td>RFC 8926 §3.1</td><td>8 octets + options</td><td class="roadmap-status">${roadmapStatus('geneve', 'en')}</td><td><strong>High</strong>. Extensible successor to VXLAN.</td></tr>
      <tr><td>Application</td><td><strong>DHCPv4 / BOOTP</strong></td><td>RFC 2131 §2</td><td>236 octets + options</td><td class="roadmap-status">${roadmapStatus('dhcp', 'en')}</td><td><strong>Very High</strong>. Complete 32-bit ASCII layout. Highly referenced in packet captures.</td></tr>
      <tr><td>Application</td><td><strong>NTP</strong></td><td>RFC 5905 §7.3</td><td>48 octets</td><td class="roadmap-status">${roadmapStatus('ntp', 'en')}</td><td><strong>Very High</strong>. Fixed 384-bit layout; global clock synchronization standard.</td></tr>
      <tr><td>Application</td><td><strong>PTP</strong></td><td>IEEE 1588-2008 Table 18, Table 26</td><td>34 octets + body</td><td class="roadmap-status">${roadmapStatus('ptp', 'en')}</td><td><strong>Medium</strong>. Verified against IEEE 1588-2008 message tables.</td></tr>
      <tr><td>Application</td><td><strong>RTCP SR</strong></td><td>RFC 3550 §6.4.1</td><td>28 octets + reports</td><td class="roadmap-status">${roadmapStatus('rtcp', 'en')}</td><td><strong>High</strong>. Control stream companion to RTP.</td></tr>
      <tr><td>Application</td><td><strong>STUN</strong></td><td>RFC 8489 §5</td><td>20 octets + attributes</td><td class="roadmap-status">${roadmapStatus('stun', 'en')}</td><td><strong>High</strong>. Foundation for NAT traversal and WebRTC ICE.</td></tr>
      <tr><td>Application</td><td><strong>WebSocket</strong></td><td>RFC 6455 §5.2</td><td>2–14 octets</td><td class="roadmap-status">${roadmapStatus('websocket', 'en')}</td><td><strong>High</strong>. Masking key read from ABNF, other fields from diagram.</td></tr>
      <tr><td>Application</td><td><strong>HTTP/2</strong></td><td>RFC 9113 §4.1</td><td>9 octets</td><td class="roadmap-status">${roadmapStatus('http2', 'en')}</td><td><strong>High</strong>. Uses identical figure notation to RFC 9000.</td></tr>
    </tbody>
  </table></div>

  <h3>Recommended Implementation Phases</h3>
  <ul class="notes">
    <li><strong>Phase 1 (Rapid Integration)</strong>: <code>PPPoE (RFC 2516)</code>${roadmapNote('pppoe', 'en')}, <code>IGMPv2 (RFC 2236)</code>${roadmapNote('igmp', 'en')}, and <code>NTP (RFC 5905)</code>${roadmapNote('ntp', 'en')} &mdash; Fixed-size layouts and standard checksums seamlessly integrate into infrastructure.</li>
    <li><strong>Phase 2 (Core Infrastructure)</strong>: <code>DHCPv4 (RFC 2131)</code>${roadmapNote('dhcp', 'en')}, <code>SCTP (RFC 9260)</code>${roadmapNote('sctp', 'en')}, and <code>IPv6 Fragment Header (RFC 8200)</code>${roadmapNote('ipv6-frag', 'en')} &mdash; High educational value extended headers.</li>
    <li><strong>Phase 3 (Tunneling and Security)</strong>: <code>GRE (RFC 2784)</code>${roadmapNote('gre', 'en')}, <code>IPsec AH (RFC 4302)</code>${roadmapNote('ah', 'en')}, and <code>DHCPv6 (RFC 8415)</code>${roadmapNote('dhcpv6', 'en')}.</li>
  </ul>
</section>`;

  return page({
    id: 'kilavuz',
    title,
    pageTitle: title,
    lang,
    description: isTr
      ? 'Ethernet haberleşme protokolleri, paket mimarisi, başlık alanları ve kapsamlı RFC başvuru kılavuzu.'
      : 'Comprehensive reference guide on Ethernet protocols, packet architecture, header fields, and network RFC standards.',
    body: `
<header class="page-header">
  <p class="eyebrow">${eyebrow}</p>
  <h1>${heading}</h1>
  <p class="lead">${lead}</p>
</header>
${tocHtml}
<article class="guide-content console-prose">
${articleContent}
</article>`
  });
}

function bibliographyPage(lang = 'en') {
  const isTr = lang === 'tr';
  const citedBy = ref => protocols.filter(protocol => protocol.refs.includes(ref));
  const pages = ref => [...citedBy(ref).map(protocol => `<a href="${url(protocol.id, lang)}">${e(protocol.name)}</a>`), ...(layersRefs.includes(ref) ? [`<a href="${url('', lang)}#${isTr ? 'katmanlar' : 'layers'}">${isTr ? 'Ana sayfa: Katmanlar' : 'Home: Layers'}</a>`] : [])].join(', ') || '—';
  const list = values => values.length ? values.map(value => e(value.replace(/^RFC0*/, 'RFC '))).join(', ') : '—';

  const eyebrow = isTr
    ? `${bibliography.entries.length} RFC · ${standards.entries.length} standart (IEEE, Microsoft) · RFC’ler ${e(bibliography.retrieved)} tarihinde indirildi`
    : `${bibliography.entries.length} RFCs · ${standards.entries.length} standards (IEEE, Microsoft) · RFCs retrieved on ${e(bibliography.retrieved)}`;
  const title = isTr ? 'Kaynakça' : 'References';
  const lead = isTr
    ? `Sitedeki her bilgi aşağıdaki RFC’lerden ya da, alanı tanımlayan bir RFC yoksa, IEEE standartlarından birine dayanır. Metinler <a href="${e(bibliography.source)}">rfc-editor.org</a> adresinden indirilmiştir; sha256 özeti, alan genişliklerinin hangi metne karşı doğrulandığını gösterir.`
    : `Every piece of information on this site is grounded in one of the following RFCs, or in IEEE standards when no RFC specifies the format. Texts were downloaded from <a href="${e(bibliography.source)}">rfc-editor.org</a>; the SHA-256 digest indicates which text field widths were verified against.`;

  const labels = isTr ? {
    status: 'Durum',
    doi: 'DOI',
    obsoletes: 'Yerine geçtiği',
    obsoletedBy: 'Yerine geçen',
    updates: 'Güncelleyen',
    use: 'Burada kullanımı',
    citing: 'Atıf yapan sayfalar',
    sha256: 'sha256',
    nonRfcTitle: 'RFC dışı standartlar',
    nonRfcIntro: 'IEEE standartları ve Microsoft Open Specifications belgeleri lisanslıdır; depoya konmaz ve yeniden dağıtılmaz. IEEE künyeleri doi.org kayıtlarından, MS-SMB2 künyesi belgenin kendisinden alınmıştır. Lisanslı kopyası olan bir standardın metni yerelde çıkarılır, alanlar onun ileti tablolarına karşı doğrulanır ve sonuç kaydedilir. Kopyası olmayan standart okunmamıştır.',
    publisher: 'Yayımcı',
    isbn: 'ISBN',
    verification: 'Doğrulama'
  } : {
    status: 'Status',
    doi: 'DOI',
    obsoletes: 'Obsoletes',
    obsoletedBy: 'Obsoleted by',
    updates: 'Updates',
    use: 'Usage in wire',
    citing: 'Citing pages',
    sha256: 'SHA-256',
    nonRfcTitle: 'Non-RFC Standards',
    nonRfcIntro: 'IEEE standards and Microsoft Open Specifications documents are licensed; they are not committed to the repository or redistributed. IEEE citations originate from doi.org records, while MS-SMB2 citations come from the published specification. For standards with a licensed copy, text is extracted locally, fields are verified against message tables, and results are recorded. Standards without a copy were not read.',
    publisher: 'Publisher',
    isbn: 'ISBN',
    verification: 'Verification'
  };

  const getVerificationText = entry => {
    if (isTr) {
      return entry.mib
        ? `Gövde metni okunmadı. ${e(entry.mib.clause)} maddesinde yayımlanan MIB modülleri (${entry.mib.files.map(item => `${e(item.module)}, sha256 <code>${e(item.sha256.slice(0, 16))}…</code>`).join('; ')}) okundu; <a href="${e(entry.mib.url)}">IEEE indirme arşivi</a>.`
        : entry.copy
        ? `Lisanslı bir kopyanın metnine karşı (${entry.copy.pages} sayfa; ISBN ve sayfa sayısıyla tanınır). Kullanılan kopyanın sha256 özeti <code>${e(entry.copy.sha256)}</code>; IEEE her indirmeye filigran eklediği için başka kopyaların özeti farklıdır.`
        : 'Metni okunmadı';
    }
    return entry.mib
      ? `Body text was not read. Verified against MIB modules published in clause ${e(entry.mib.clause)} (${entry.mib.files.map(item => `${e(item.module)}, sha256 <code>${e(item.sha256.slice(0, 16))}…</code>`).join('; ')}); <a href="${e(entry.mib.url)}">IEEE download archive</a>.`
      : entry.copy
      ? `Verified against a licensed copy (${entry.copy.pages} pages). SHA-256 digest: <code>${e(entry.copy.sha256)}</code>; IEEE adds unique watermarks per download.`
      : 'Text not read';
  };

  return page({
    id: 'kaynakca',
    title,
    pageTitle: title,
    lang,
    description: isTr
      ? 'wire sitesindeki bilgilerin dayandığı RFC’lerin künyeleri, bağlantıları ve indirilen metinlerin sha256 özetleri.'
      : 'Bibliographic citations, links, and SHA-256 digests for all RFC and standard specifications backing wire.',
    body: `
<header class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${lead}</p></header>
<ol class="bibliography">${bibliography.entries.map(entry => `<li id="rfc${entry.number}"><h2>RFC ${entry.number}</h2><p class="citation">${citation(entry)} <a href="${e(entry.url)}">${e(entry.url.replace('https://', ''))}</a></p><dl><div><dt>${labels.status}</dt><dd>${e(entry.status)}</dd></div><div><dt>${labels.doi}</dt><dd><a href="https://doi.org/${e(entry.doi)}">${e(entry.doi)}</a></dd></div><div><dt>${labels.obsoletes}</dt><dd>${list(entry.obsoletes)}</dd></div><div><dt>${labels.obsoletedBy}</dt><dd>${list(entry.obsoleted_by)}</dd></div><div><dt>${labels.updates}</dt><dd>${list(entry.updated_by)}</dd></div><div><dt>${labels.use}</dt><dd>${e(entry.use)}</dd></div><div><dt>${labels.citing}</dt><dd>${pages(entry.number)}</dd></div><div><dt>${labels.sha256}</dt><dd><code>${entry.sha256}</code> (${entry.bytes} ${isTr ? 'sekizli' : 'octets'})</dd></div></dl></li>`).join('')}</ol>
<h2 id="standartlar">${labels.nonRfcTitle}</h2>
<p>${labels.nonRfcIntro}</p>
<ol class="bibliography">${standards.entries.map(entry => `<li id="${e(entry.id)}"><h2>${e(entry.short)}</h2><p class="citation">${standardCitation(entry)} <a href="${e(entry.url)}">${e(entry.url.replace('https://', ''))}</a></p><dl><div><dt>${labels.publisher}</dt><dd>${e(entry.publisher)}</dd></div>${entry.isbn ? `<div><dt>${labels.isbn}</dt><dd>${e(entry.isbn)}</dd></div>` : ''}<div><dt>${labels.use}</dt><dd>${e(entry.use)}</dd></div><div><dt>${labels.citing}</dt><dd>${pages(entry.id)}</dd></div><div><dt>${labels.verification}</dt><dd>${getVerificationText(entry)}</dd></div></dl></li>`).join('')}</ol>`
  });
}

function methodPage(lang = 'en') {
  const isTr = lang === 'tr';
  const title = isTr ? 'Yöntem' : 'Methodology';
  const eyebrow = isTr ? 'veri nereden geliyor' : 'where the data comes from';
  const lead = isTr
    ? 'Bu sitedeki alan adları, genişlikler, değerler ve açıklamalar RFC’lere, IEEE’nin tanımladığı protokollerde (802.1Q, LLDP, PTP) ise IEEE standartlarına dayanır. Neyin makineyle doğrulandığı, neyin elle yazıldığı aşağıda ayrı ayrı belirtilmiştir.'
    : 'All field names, widths, values, and explanations on this site are grounded in IETF RFCs and, where specified by IEEE (802.1Q, LLDP, PTP), IEEE standards. Details on what is machine-verified and what is manually authored are listed below.';

  const colProto = isTr ? 'Protokol' : 'Protocol';
  const colLayout = isTr ? 'Karşılaştırılan yerleşim' : 'Compared layout';
  const colWidths = isTr ? 'Okunan genişlikler' : 'Extracted widths';

  const rows = protocols.map(protocol => {
    let layoutText = '';
    if (protocol.layout.kind === 'ieee') {
      layoutText = isTr
        ? `${joinTr(protocol.layout.refs.map(r => refLink(r, 'tr')))} — lisanslı kopya, ${e(protocol.layout.checked?.date ?? '')}${protocol.layout.mib ? '; MIB modülleri' : ''}`
        : `${joinEn(protocol.layout.refs.map(r => refLink(r, 'en')))} — licensed copy, ${e(protocol.layout.checked?.date ?? '')}${protocol.layout.mib ? '; MIB modules' : ''}`;
    } else if (isVerified(protocol)) {
      layoutText = isTr
        ? `${joinTr(layoutRefs(protocol).map(r => refLink(r, 'tr')))} — ${e(protocol.layout.label)}`
        : `${joinEn(layoutRefs(protocol).map(r => refLink(r, 'en')))} — ${e(protocol.layout.label)}`;
    } else {
      layoutText = isTr
        ? `<strong>Doğrulanmadı</strong>: ${refLink({ std: protocol.layout.std }, 'tr')} metni okunmadı`
        : `<strong>Unverified</strong>: ${refLink({ std: protocol.layout.std }, 'en')} text not read`;
    }
    return `<tr><th scope="row"><a href="${url(protocol.id, lang)}">${e(protocol.name)}</a></th><td>${layoutText}</td><td><code>${(checks.get(protocol.id).widths ?? checks.get(protocol.id).found).join(' · ')}</code></td></tr>`;
  }).join('');

  if (isTr) {
    return page({
      id: 'yontem',
      title,
      pageTitle: title,
      lang,
      description: 'wire sitesindeki verinin RFC’lerden nasıl alındığı ve nasıl doğrulandığı.',
      body: `
<header class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${lead}</p></header>
<section><h2>Makineyle doğrulananlar</h2><p>Her protokolün alan genişlikleri, atıf yapılan RFC’nin düz metnindeki başlık şemasından okunur ve veri dosyasındaki değerlerle karşılaştırılır. Uyuşmazlıkta derleme durur. RFC metninin sha256 özeti <a href="${url('kaynakca', 'tr')}">kaynakçadaki</a> özetle aynı olmalıdır.</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="Doğrulama tablosu"><table class="fields"><thead><tr><th scope="col">${colProto}</th><th scope="col">${colLayout}</th><th scope="col">${colWidths}</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="small">RFC’si olmayan PTP, IEEE 1588-2008’in lisanslı bir kopyasına karşı doğrulanır: <code>npm run sync:ieee</code> metni yerelde çıkarır, alan adlarını ve genişliklerini Table 18 ile Table 26’dan, bileşik alanları <code>struct PortIdentity</code> ve <code>struct Timestamp</code> tanımlarından okur ve sonucu veri dosyasına kaydeder. Metin depoya girmez; kopyası olmayan derlemeler, CI dahil, veriyi bu kayda karşı denetler. Metin bulunduğunda atıf yapılan her bölümün verilen sayfada başladığı da denetlenir.</p>
<p class="small">Şema çizmeyen RFC’ler için ayrı okuyucular vardır: TLS kaydı RFC 9846’nın sunum dilinden (<code>struct { … }</code>), SSH paketi RFC 4253 §6’daki <code>uint32</code>/<code>byte[n]</code> listesinden okunur. SNMP sayfasının örneği ise RFC 3417 §8.1’deki BER kodlamasıyla sekizli sekizli karşılaştırılır. SMB2, Microsoft’un yayımladığı [MS-SMB2] belgesindeki “Alan (N bytes)” tanımlarına karşı doğrulanır; alanları küçük-endian’dır.</p>
<p class="small">Bir yerleşim aynı RFC’nin birden çok şemasından ve düzyazısından da okunabilir: BGP OPEN başlık ve gövde şemalarından, OSPF Hello iki satıra bölünmüş Authentication alanı için A.3.1’deki tanımdan, ESP başlık ve kuyruk satırlarından doğrulanır. QUIC, HTTP/2 ve HTTP/3, RFC 9000’in “Header Form (1) = 1,” biçimindeki şekilleriyle yazılmıştır; bu şekillerdeki aralıklar (örneğin 0..160) ve değişken uzunluklu tamsayılar (i) da karşılaştırılır.</p>
<p class="small">ARP ve Ethernet için RFC 826 bit şeması değil, “16.bit: (ar$hrd) …” biçiminde bir liste verir; karşılaştırma o listeyle yapılır. n ve m, uzunluğu ar$hln ve ar$pln alanlarından gelen adresleri gösterir.</p></section>
<section><h2>Elle yazılanlar</h2><ul class="notes"><li>Türkçe alan açıklamaları, ilgili RFC bölümü okunarak yazılmış özetlerdir; çeviri değil. Her açıklamanın altında dayandığı bölümün bağlantısı durur.</li><li>Değer tabloları (ICMP türleri, DNS yanıt kodları gibi) atıf yapılan bölümden aktarılmıştır. Güncel IANA kayıtlarındaki sonradan eklenmiş değerleri içermez.</li></ul></section>
<section><h2>Örnek paketler</h2><ul class="notes"><li>Örnek paketler gerçek trafik yakalamaları değildir. Alan tablosundaki örnek değerlerden derleme sırasında üretilir.</li><li>Sağlama toplamları RFC 1071’deki bire tümleyen toplamıyla, gerektiğinde RFC 768, RFC 9293 ve RFC 8200 §8.1’deki sözde başlıklarla hesaplanır.</li><li>Adresler belgeleme için ayrılmış aralıklardandır: IPv4 için RFC 5737, IPv6 için RFC 3849, MAC için RFC 9542 §2.1.4, alan adı için RFC 2606.</li></ul></section>
<section><h2>Kapsam dışı</h2><ul class="notes"><li>RFC olarak yayımlanmamış standartlar (IEEE 802.1Q, 802.1AB, 1588) protokolü tanımlayan belge oldukları için kaynak olarak kullanılır. Bu sayfalar standardın lisanslı bir kopyasına karşı doğrulanır (802.1Q için IEEE 802.1Q-2022, PTP için IEEE 1588-2008, LLDP için IEEE 802.1AB-2016). Bir standardın ne kopyası ne MIB’i okunmamışsa sayfa doğrulanmadığını açıkça belirtir; şu an böyle bir sayfa yoktur. Ethernet sayfası yine yalnızca RFC 826 ve RFC 894’ün tarif ettiği alanları içerir.</li><li>Seçenekler, uzantı başlıkları ve ileti gövdeleri bu sürümde alan alan çözümlenmemiştir.</li></ul></section>`
    });
  }

  // English
  return page({
    id: 'yontem',
    title,
    pageTitle: title,
    lang,
    description: 'How wire extracts, compares, and verifies protocol header data against RFC specifications.',
    body: `
<header class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${lead}</p></header>
<section><h2>Machine-Verified Data</h2><p>Every protocol's field widths are extracted directly from the plaintext header diagrams in the cited RFC and compared with the data files. Any disagreement halts the build. The SHA-256 digest of the downloaded RFC text must match the digest in <a href="${url('kaynakca', 'en')}">references</a>.</p>
<div class="table-scroll" tabindex="0" role="region" aria-label="Verification table"><table class="fields"><thead><tr><th scope="col">${colProto}</th><th scope="col">${colLayout}</th><th scope="col">${colWidths}</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="small">PTP (which lacks an IETF RFC) is verified against a licensed copy of IEEE 1588-2008: <code>npm run sync:ieee</code> extracts text locally, reads names and widths from Tables 18 and 26, and parses composite structs (<code>struct PortIdentity</code>, <code>struct Timestamp</code>), caching results in the data files. The text is not committed; builds without the PDF verify against the recorded values.</p>
<p class="small">Specialized parsers handle non-diagram RFCs: TLS 1.3 records from RFC 9846 presentation language (<code>struct { … }</code>), SSH packets from RFC 4253 §6 type lists, and SNMP GetBulkRequest PDUs from RFC 3417 BER byte encoding. SMB2 is verified against Microsoft [MS-SMB2] specifications with little-endian fields.</p>
</section>
<section><h2>Manually Authored Data</h2><ul class="notes"><li>Field descriptions are summaries synthesized from the cited standard sections, with direct section links on each row.</li><li>Value enumeration tables (e.g. ICMP types, DNS response codes) reflect the values defined in the primary cited RFC specification.</li></ul></section>
<section><h2>Sample Packets</h2><ul class="notes"><li>Sample packets are generated deterministically during build from the field example values; they are not live network captures.</li><li>Checksums are calculated using RFC 1071 one's complement arithmetic, incorporating pseudo-headers where required by RFC 768, RFC 9293, and RFC 8200 §8.1.</li><li>IP, MAC, and domain names strictly use reserved documentation ranges: RFC 5737 (IPv4), RFC 3849 (IPv6), RFC 9542 §2.1.4 (MAC), and RFC 2606 (domain names).</li></ul></section>
<section><h2>Scope Limitations</h2><ul class="notes"><li>Non-RFC standards (IEEE 802.1Q, 802.1AB, 1588) are referenced when they constitute the authoritative specification.</li><li>Optional variable-length TLVs, chained extension headers, and higher-layer application payloads are represented as blocks rather than fully unpacked fields in this version.</li></ul></section>`
  });
}

function licensePage(lang = 'en') {
  const isTr = lang === 'tr';
  const title = isTr ? 'Lisanslar' : 'Licenses';
  const heading = isTr ? 'Lisanslar ve kaynak bildirimleri' : 'Licenses and Attributions';
  const body = isTr ? `
<header class="page-header"><h1>${heading}</h1></header>
<ul class="notes">
  <li>Proje kodu ve Türkçe metinler: GPL-3.0-or-later. <a href="${asset('LICENSE.txt')}">Lisans metni</a>.</li>
  <li>Ortak konsol teması <a href="https://github.com/Zaryob/console-theme">console-theme</a> projesinden gelir; CSS ve JavaScript dosyaları GPL-2.0-or-later bildirimlerini korur. <a href="${asset('assets/console/COPYING')}">GPL v2 metni</a>.</li>
  <li>IBM Plex yazı tipleri SIL Open Font License 1.1 ile dağıtılır. <a href="${asset('assets/console/fonts/OFL.txt')}">OFL metni</a>.</li>
  <li>Simgeler için <a href="${asset('assets/console/ICONS-LICENSE.txt')}">simge lisans bildirimi</a>.</li>
  <li>RFC’ler yazarlarına ve IETF Trust’a aittir; bu sitede metinleri yeniden yayımlanmaz, yalnızca atıf yapılır ve bağlantı verilir.</li>
</ul>` : `
<header class="page-header"><h1>${heading}</h1></header>
<ul class="notes">
  <li>Project code and documentation: GPL-3.0-or-later. <a href="${asset('LICENSE.txt')}">License text</a>.</li>
  <li>Shared console theme originates from <a href="https://github.com/Zaryob/console-theme">console-theme</a>; CSS and JS retain GPL-2.0-or-later notices. <a href="${asset('assets/console/COPYING')}">GPL v2 text</a>.</li>
  <li>IBM Plex fonts are distributed under SIL Open Font License 1.1. <a href="${asset('assets/console/fonts/OFL.txt')}">OFL text</a>.</li>
  <li>Icons are subject to the <a href="${asset('assets/console/ICONS-LICENSE.txt')}">icon license notice</a>.</li>
  <li>RFC texts belong to their respective authors and the IETF Trust; they are cited with links and not redistributed here.</li>
</ul>`;

  return page({
    id: 'lisanslar',
    title,
    pageTitle: title,
    lang,
    description: isTr ? 'wire sitesinin, ortak temanın ve yazı tiplerinin lisansları.' : 'Licenses for wire, the shared console theme, and typography.',
    body
  });
}

function notFoundPage(lang = 'en') {
  const isTr = lang === 'tr';
  const title = isTr ? 'Sayfa bulunamadı' : 'Page Not Found';
  const eyebrow = isTr ? 'wire: böyle bir dosya ya da dizin yok' : 'wire: no such file or directory';
  const linkText = isTr ? 'Protokol listesine dön →' : 'Return to protocol list →';
  return page({
    id: '404',
    title,
    lang,
    description: isTr ? 'Aradığınız sayfa yok.' : 'The requested page does not exist.',
    indexable: false,
    body: `<header class="page-header"><p class="eyebrow">${eyebrow}</p><h1>404</h1><p class="lead"><a href="${url('', lang)}">${linkText}</a></p></header>`
  });
}

// Build output directory setup
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'public'), out, { recursive: true });

async function save(name, content) {
  const file = path.join(out, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

// Generate bilingual editions (English default at root, Turkish at /tr/)
for (const lang of ['en', 'tr']) {
  const prefix = lang === 'tr' ? 'tr/' : '';
  await save(`${prefix}index.html`, home(lang));
  for (const protocol of protocols) {
    await save(`${prefix}${protocol.id}/index.html`, protocolPage(protocol, lang));
  }
  await save(`${prefix}kilavuz/index.html`, guidePage(lang));
  await save(`${prefix}katmanlar/index.html`, layersRedirect(lang));
  await save(`${prefix}kaynakca/index.html`, bibliographyPage(lang));
  await save(`${prefix}yontem/index.html`, methodPage(lang));
  await save(`${prefix}lisanslar/index.html`, licensePage(lang));
  await save(`${prefix}404.html`, notFoundPage(lang));
}

// English convenience aliases matching English footer paths
await save('guide/index.html', guidePage('en'));
await save('references/index.html', bibliographyPage('en'));
await save('methodology/index.html', methodPage('en'));
await save('licenses/index.html', licensePage('en'));

await save('LICENSE.txt', await readFile(path.join(root, 'LICENSE'), 'utf8'));
await save('.nojekyll', '');

// Bilingual search index
await save('search.json', JSON.stringify([
  ...protocols.map(protocol => ({
    title: protocolTitle(protocol, 'en'),
    description: protocolSummary(protocol, 'en'),
    text: `${protocol.name} ${protocolSummary(protocol, 'en')} ${protocolNotes(protocol, 'en').join(' ')} ${protocol.fields.map(f => `${f.name} ${fieldDesc(f, 'en')}`).join(' ')} ${protocol.refs.join(' ')}`,
    url: `${protocol.id}/`,
    type: 'wire/',
    lang: 'en'
  })),
  ...protocols.map(protocol => ({
    title: protocol.title,
    description: protocolSummary(protocol, 'tr'),
    text: `${protocol.name} ${protocolSummary(protocol, 'tr')} ${protocolNotes(protocol, 'tr').join(' ')} ${protocol.fields.map(field => `${fieldSearchNames(field)} ${fieldDesc(field, 'tr')}`).join(' ')}`,
    url: `tr/${protocol.id}/`,
    type: 'wire/',
    lang: 'tr'
  })),
  {
    title: 'Layers: OSI and TCP/IP',
    description: 'OSI and TCP/IP layers, wire protocol layers, and summaries of common protocols.',
    text: `osi tcp/ip layer application presentation session transport network data link physical ${layersData.groups.flatMap(group => group.items.map(item => `${item.name} ${item.summary_en || item.summary}`)).join(' ')}`,
    url: '#layers',
    type: 'wire/',
    lang: 'en'
  },
  {
    title: 'Katmanlar: OSI ve TCP/IP',
    description: 'OSI ve TCP/IP katmanları, wire’daki protokollerin katmanları ve sık kullanılan protokollerin kısa özetleri.',
    text: `osi tcp/ip katman uygulama sunum oturum taşıma ağ veri bağlantı fiziksel ${layersData.groups.flatMap(group => group.items.map(item => `${item.name} ${item.summary_tr || item.summary}`)).join(' ')}`,
    url: 'tr/#katmanlar',
    type: 'wire/',
    lang: 'tr'
  },
  {
    title: 'Ethernet Communication Protocols, Packet Architecture, and RFC Guide',
    description: 'Detailed reference guide for Ethernet frame, VLAN, PPPoE, ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS, and all core networking RFCs.',
    text: 'ethernet vlan pppoe arp rarp ndp ipv4 ipv6 icmp icmpv6 tcp udp dns dhcp rfc packet header frame checksum',
    url: 'kilavuz/',
    type: 'wire/',
    lang: 'en'
  },
  {
    title: 'Ethernet Haberleşme Protokolleri, Paket Mimarisi ve RFC Kılavuzu',
    description: 'Ethernet çerçevesi, VLAN, PPPoE, ARP, IPv4, IPv6, ICMP, TCP, UDP, DNS ve bütün ağ RFC’lerinin ayrıntılı başvuru kılavuzu.',
    text: 'ethernet vlan pppoe arp rarp ndp ipv4 ipv6 icmp icmpv6 tcp udp dns dhcp rfc paket başlık çerçeve sağlama toplamı checksum',
    url: 'tr/kilavuz/',
    type: 'wire/',
    lang: 'tr'
  }
], null, 2));

const sitemapPages = ['', ...protocols.map(p => p.id), 'kilavuz', 'yontem', 'kaynakca'];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapPages.map(id => {
  const enLoc = `${origin}${url(id, 'en')}`;
  const trLoc = `${origin}${url(id, 'tr')}`;
  return `  <url>
    <loc>${enLoc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />
    <xhtml:link rel="alternate" hreflang="tr" href="${trLoc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />
  </url>
  <url>
    <loc>${trLoc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />
    <xhtml:link rel="alternate" hreflang="tr" href="${trLoc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />
  </url>`;
}).join('\n')}
</urlset>`;

await save('sitemap.xml', sitemapXml);

console.log(`wire: ${protocols.length} protokol, ${bibliography.entries.length} RFC → _site/ (EN default at ${base || '/'}, TR at ${base || ''}/tr/)`);
