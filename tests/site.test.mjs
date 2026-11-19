import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createContext, runInContext } from 'node:vm';
import path from 'node:path';
import { root, loadProtocols } from '../src/sources.mjs';
const layers = JSON.parse(await readFile(path.join(root, 'data/layers.json'), 'utf8'));

const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
const site = path.join(root, '_site');
const protocols = await loadProtocols();

async function htmlFiles(directory) {
  const found = [];
  for (const name of await readdir(directory)) {
    const file = path.join(directory, name);
    if ((await stat(file)).isDirectory()) found.push(...await htmlFiles(file));
    else if (name.endsWith('.html')) found.push(file);
  }
  return found;
}

test('the site builds', () => assert.equal(build.status, 0, build.stderr));

test('every protocol has an English and Turkish page with alternates and RFC links', async () => {
  for (const protocol of protocols) {
    // English edition
    const htmlEn = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    for (const field of protocol.fields) assert.ok(htmlEn.includes(`id="f-${field.key}"`), `en ${protocol.id}: ${field.key}`);
    if (protocol.layout.kind === 'standard') {
      const note = protocol.layout.mib ? 'Partially verified\\.' : 'Not machine-verified, source not read\\.';
      assert.match(htmlEn, new RegExp(`<p class="verified verified--manual"><strong>${note}</strong>`), `en ${protocol.id}`);
      assert.ok(htmlEn.includes('https://doi.org/10.1109/'), `en ${protocol.id}`);
    } else if (protocol.layout.kind === 'ieee') {
      assert.match(htmlEn, /<p class="verified">Field (names and widths|widths \(<code>[^<]+<\/code> bits?\), (?:type numbers, and )?values) (?:were compared against )?<a class="rfc-ref" href="https:\/\/[^"]+">(IEEE|MS-SMB2) /, `en ${protocol.id}`);
      assert.match(htmlEn, /licensed and not (?:included in this|stored in this) repository/, `en ${protocol.id}`);
      assert.doesNotMatch(htmlEn, /verified--manual/, `en ${protocol.id}`);
    } else {
      assert.ok(htmlEn.includes(`https://www.rfc-editor.org/rfc/rfc${protocol.layout.rfc}`), `en ${protocol.id}`);
      assert.doesNotMatch(htmlEn, /verified--manual/, `en ${protocol.id}`);
    }
    assert.match(htmlEn, /<html lang="en" data-route-language="en">/, `en ${protocol.id}`);
    assert.match(htmlEn, new RegExp(`<link rel="canonical" href="https://zaryob\\.github\\.io/wire/${protocol.id}/">`), `en ${protocol.id}`);
    assert.match(htmlEn, new RegExp(`<link rel="alternate" hreflang="en" href="https://zaryob\\.github\\.io/wire/${protocol.id}/" data-language-route="/wire/${protocol.id}/">`), `en ${protocol.id}`);
    assert.match(htmlEn, new RegExp(`<link rel="alternate" hreflang="tr" href="https://zaryob\\.github\\.io/wire/tr/${protocol.id}/" data-language-route="/wire/tr/${protocol.id}/">`), `en ${protocol.id}`);
    assert.match(htmlEn, /<select id="console-language-select"[^>]*><option value="tr" lang="tr">TR<\/option><option value="en" lang="en" selected>EN<\/option><\/select>/, `en ${protocol.id}`);

    // Turkish edition
    const htmlTr = await readFile(path.join(site, 'tr', protocol.id, 'index.html'), 'utf8');
    for (const field of protocol.fields) assert.ok(htmlTr.includes(`id="f-${field.key}"`), `tr ${protocol.id}: ${field.key}`);
    if (protocol.layout.kind === 'standard') {
      const note = protocol.layout.mib ? 'Kısmen doğrulandı\\.' : 'Makineyle doğrulanmadı, kaynağı okunmadı\\.';
      assert.match(htmlTr, new RegExp(`<p class="verified verified--manual"><strong>${note}</strong>`), `tr ${protocol.id}`);
      assert.ok(htmlTr.includes('https://doi.org/10.1109/'), `tr ${protocol.id}`);
    } else if (protocol.layout.kind === 'ieee') {
      assert.match(htmlTr, /<p class="verified">Alan (adları ve genişlikleri|genişlikleri \(<code>[^<]+<\/code> bit\), (?:tür numaraları ve )?değerler) <a class="rfc-ref" href="https:\/\/[^"]+">(IEEE|MS-SMB2) /, `tr ${protocol.id}`);
      assert.match(htmlTr, /metni lisanslı olduğu için depoda bulunmaz/, `tr ${protocol.id}`);
      assert.doesNotMatch(htmlTr, /verified--manual/, `tr ${protocol.id}`);
    } else {
      assert.ok(htmlTr.includes(`https://www.rfc-editor.org/rfc/rfc${protocol.layout.rfc}`), `tr ${protocol.id}`);
      assert.doesNotMatch(htmlTr, /verified--manual/, `tr ${protocol.id}`);
    }
    assert.match(htmlTr, /<html lang="tr" data-route-language="tr">/, `tr ${protocol.id}`);
    assert.match(htmlTr, new RegExp(`<link rel="canonical" href="https://zaryob\\.github\\.io/wire/tr/${protocol.id}/">`), `tr ${protocol.id}`);
    assert.match(htmlTr, new RegExp(`<link rel="alternate" hreflang="en" href="https://zaryob\\.github\\.io/wire/${protocol.id}/" data-language-route="/wire/${protocol.id}/">`), `tr ${protocol.id}`);
    assert.match(htmlTr, new RegExp(`<link rel="alternate" hreflang="tr" href="https://zaryob\\.github\\.io/wire/tr/${protocol.id}/" data-language-route="/wire/tr/${protocol.id}/">`), `tr ${protocol.id}`);
    assert.match(htmlTr, /<select id="console-language-select"[^>]*><option value="tr" lang="tr" selected>TR<\/option><option value="en" lang="en">EN<\/option><\/select>/, `tr ${protocol.id}`);
  }
});

test('shared console controls adapt to route language and follow alternate link routes', async () => {
  const listeners = [];
  const root = { lang: 'en', dataset: { routeLanguage: 'en' } };
  const linkTr = { dataset: { languageRoute: '/wire/tr/tcp/' } };
  const document = {
    documentElement: root,
    querySelector: selector => selector.includes('hreflang="tr"') ? linkTr : null,
    querySelectorAll: () => [],
    addEventListener: (_, callback) => listeners.push(callback),
  };
  const window = { addEventListener() {}, dispatchEvent() {} };
  const context = createContext({
    document, window, URL, location: { href: 'https://zaryob.github.io/wire/tcp/' },
    navigator: { languages: ['en-US'] },
    localStorage: { getItem: () => null, setItem: () => {} },
  });
  for (const file of ['language.js', 'i18n.js']) {
    runInContext(await readFile(path.join(site, 'assets/console', file), 'utf8'), context);
  }
  listeners.forEach(callback => callback());
  assert.equal(root.dataset.uiLanguage, 'en');
  assert.equal(window.ZaryobI18n.t('Dark'), 'Dark');
  assert.equal(window.ZaryobI18n.t('Searching…'), 'Searching…');
});

test('translated field names appear in diagrams, tables and both search indexes', async () => {
  // Turkish edition
  const tcpTr = await readFile(path.join(site, 'tr/tcp/index.html'), 'utf8');
  assert.match(tcpTr, /data-field="sport"><span>Kaynak port<\/span>/);
  assert.match(tcpTr, /role="rowheader">Kaynak port<small class="field-source-name" lang="en">Source Port<\/small><\/th>/);
  assert.match(tcpTr, /aria-label="Sıra numaralarını eşzamanla \(SYN\)"><span>SYN<\/span>/);

  // English edition
  const tcpEn = await readFile(path.join(site, 'tcp/index.html'), 'utf8');
  assert.match(tcpEn, /data-field="sport"><span>Source Port<\/span>/);
  assert.match(tcpEn, /role="rowheader">Source Port<small class="field-source-name" lang="tr">Kaynak port<\/small><\/th>/);
  assert.match(tcpEn, /data-field="syn"><span>SYN<\/span>/);

  // Search index contains both languages
  const records = JSON.parse(await readFile(path.join(site, 'search.json'), 'utf8'));
  const tcpTrRecord = records.find(record => record.url === 'tr/tcp/');
  assert.ok(tcpTrRecord, 'Turkish search record exists');
  assert.equal(tcpTrRecord.lang, 'tr');
  assert.match(tcpTrRecord.text, /Kaynak port/);
  assert.match(tcpTrRecord.text, /güvenilir ve sıralı bir bayt akışı taşır/);

  const tcpEnRecord = records.find(record => record.url === 'tcp/');
  assert.ok(tcpEnRecord, 'English search record exists');
  assert.equal(tcpEnRecord.lang, 'en');
  assert.match(tcpEnRecord.text, /Source Port/);
  assert.match(tcpEnRecord.text, /reliable, ordered, and error-checked byte-stream/);

  // Localized summary, example packet, and notes on protocol pages
  assert.match(tcpTr, /<p class="lead">TCP \(Transmission Control Protocol\), uygulamalar arasında güvenilir ve sıralı bir bayt akışı taşır\./);
  assert.match(tcpTr, /192\.0\.2\.1 istemcisinden 198\.51\.100\.7 adresindeki HTTP sunucusunun 80 numaralı portuna giden TCP SYN segmenti\./);
  assert.match(tcpTr, /Sağlama toplamı, başlık ve veriyle birlikte bir sözde başlığı da kapsar/);
  assert.match(tcpTr, /<td role="cell" data-label="Açıklama ve kaynak"><p>Kaynak port numarası\./);

  assert.match(tcpEn, /<p class="lead">Transmission Control Protocol \(TCP, RFC 9293\) provides reliable, ordered, and error-checked byte-stream delivery/);
  assert.match(tcpEn, /A standard TCP SYN segment from client 192\.0\.2\.1 to HTTP server 198\.51\.100\.7 port 80/);
  assert.match(tcpEn, /Checksum covers a pseudo-header along with the header and data/);
  assert.match(tcpEn, /<td role="cell" data-label="Description and source"><p>Source port number\./);

  // Home pages have localized search terms on cards
  const homeTr = await readFile(path.join(site, 'tr/index.html'), 'utf8');
  assert.match(homeTr, /data-search="[^"]*kaynak port[^"]*"[^>]*><p class="protocol-card__path">~\/wire\/tcp<\/p>/);

  const homeEn = await readFile(path.join(site, 'index.html'), 'utf8');
  assert.match(homeEn, /data-search="[^"]*source port[^"]*"[^>]*><p class="protocol-card__path">~\/wire\/tcp<\/p>/);
});

test('local links and assets resolve', async () => {
  const missing = [];
  for (const file of await htmlFiles(site)) {
    const html = await readFile(file, 'utf8');
    for (const [, target] of html.matchAll(/(?:href|src)="(\/wire\/[^"#]*)(?:#[^"]*)?"/g)) {
      let local = path.join(site, decodeURIComponent(target.slice('/wire/'.length)));
      if (target.endsWith('/')) local = path.join(local, 'index.html');
      try { await stat(local); } catch { missing.push(`${path.relative(site, file)} → ${target}`); }
    }
  }
  assert.deepEqual(missing, []);
});

test('in-page anchors on the bibliography exist', async () => {
  for (const langDir of ['', 'tr']) {
    const bibliography = await readFile(path.join(site, langDir, 'kaynakca/index.html'), 'utf8');
    for (const protocol of protocols) for (const ref of protocol.refs) {
      const anchor = Number.isInteger(ref) ? `rfc${ref}` : ref;
      assert.ok(bibliography.includes(`id="${anchor}"`), `${langDir}: ${anchor}`);
    }
  }
});

test('the home page states the share of machine-verified pages', async () => {
  const share = Math.round(100 * protocols.filter(protocol => protocol.layout.kind !== 'standard').length / protocols.length);

  const homeEn = await readFile(path.join(site, 'index.html'), 'utf8');
  assert.match(homeEn, new RegExp(`<strong class="stat-number">${share}%</strong>\\s*<span class="stat-label">Build Verification</span>`));

  const homeTr = await readFile(path.join(site, 'tr/index.html'), 'utf8');
  assert.match(homeTr, new RegExp(`<strong class="stat-number">%${share}</strong>\\s*<span class="stat-label">Derleme Doğrulaması</span>`));
});

test('top bar links are named by their visible text first', async () => {
  // English
  for (const file of ['index.html', 'tcp/index.html']) {
    const html = await readFile(path.join(site, file), 'utf8');
    const topbar = html.slice(html.indexOf('<header class="topbar">'), html.indexOf('</header>', html.indexOf('<header class="topbar">')));
    assert.doesNotMatch(topbar, /aria-label="(?!Location)/, file);
    assert.match(topbar, /<span>Protocols<\/span>\s*<span class="count">\d+<\/span>\s*<span class="console-sr-only">/);
    assert.match(topbar, /<span>Guide<\/span>\s*<span class="console-sr-only">/);
  }

  // Turkish
  for (const file of ['tr/index.html', 'tr/tcp/index.html']) {
    const html = await readFile(path.join(site, file), 'utf8');
    const topbar = html.slice(html.indexOf('<header class="topbar">'), html.indexOf('</header>', html.indexOf('<header class="topbar">')));
    assert.doesNotMatch(topbar, /aria-label="(?!Konum)/, file);
    assert.match(topbar, /<span>Protokoller<\/span>\s*<span class="count">\d+<\/span>\s*<span class="console-sr-only">/);
    assert.match(topbar, /<span>Kılavuz<\/span>\s*<span class="console-sr-only">/);
  }
});

test('the "/" hint points at the search it opens', async () => {
  for (const [homeFile, tcpFile] of [['index.html', 'tcp/index.html'], ['tr/index.html', 'tr/tcp/index.html']]) {
    const home = await readFile(path.join(site, homeFile), 'utf8');
    const tcp = await readFile(path.join(site, tcpFile), 'utf8');
    const headerSearch = html => html.match(/<button class="console-search-open"[\s\S]*?<\/button>/)[0];
    assert.doesNotMatch(headerSearch(home), /<kbd[\s>]/, `${homeFile}: on the home page "/" focuses the protocol filter`);
    assert.match(home, /id="protocol-filter"[^>]*>\s*<kbd aria-hidden="true">\/<\/kbd>/);
    assert.match(headerSearch(tcp), /<kbd aria-hidden="true">\/<\/kbd>/);
  }
});

test('32-bit diagrams also carry a 16-bit half-row layout with one focusable link per field', async () => {
  for (const protocol of protocols) {
    for (const langDir of ['', 'tr']) {
      const html = await readFile(path.join(site, langDir, protocol.id, 'index.html'), 'utf8');
      const start = html.indexOf('<div class="bits bits--split"');
      if (protocol.rowBits !== 32) { assert.equal(start, -1, `${langDir} ${protocol.id}`); continue; }
      assert.ok(start > 0, `${langDir} ${protocol.id}`);
      const split = html.slice(start, html.indexOf('</div>\n  </div>', start));
      const cells = [...split.matchAll(/<a class="bit-cell([^"]*)"[^>]*data-field="([^"]+)"([^>]*)>/g)];
      const focusable = cells.filter(([, , , rest]) => !rest.includes('tabindex="-1"')).map(([, , key]) => key);
      assert.deepEqual(focusable, protocol.fields.map(field => field.key), `${langDir} ${protocol.id}`);
      for (const [, classes, , rest] of cells) if (classes.includes('bit-cell--continued')) assert.match(rest, /aria-hidden="true" tabindex="-1"/, `${langDir} ${protocol.id}`);
      for (const [, ruler] of split.matchAll(/bits-ruler--half" aria-hidden="true">((?:<span[^>]*>\d+<\/span>){16})/g)) {
        const bits = [...ruler.matchAll(/>(\d+)</g)].map(match => Number(match[1]));
        assert.ok([0, 16].includes(bits[0]) && bits.every((bit, i) => bit === bits[0] + i), `${langDir} ${protocol.id}: ${bits}`);
      }
    }
  }
});

test('field table cells carry their column header for the phone card layout', async () => {
  const enExpected = ['Field', 'Bits', 'Width', 'Example', 'Description and source'];
  const trExpected = ['Alan', 'Bit', 'Genişlik', 'Örnek', 'Açıklama ve kaynak'];

  for (const protocol of protocols) {
    // English
    const htmlEn = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    const tableEn = htmlEn.slice(htmlEn.indexOf('<table class="fields fields--cards" role="table">'), htmlEn.indexOf('</table>', htmlEn.indexOf('fields--cards')));
    const headersEn = [...tableEn.matchAll(/<th scope="col" role="columnheader">([^<]+)<\/th>/g)].map(match => match[1]);
    assert.deepEqual(headersEn, enExpected, `en ${protocol.id}`);
    const rowsEn = [...tableEn.matchAll(/<tr id="f-([^"]+)" data-field="\1" tabindex="0" role="row"><th scope="row" role="rowheader">[\s\S]*?<\/tr>/g)];
    assert.equal(rowsEn.length, protocol.fields.length, `en ${protocol.id}`);
    for (const [row] of rowsEn) assert.deepEqual([...row.matchAll(/<td[^>]* role="cell" data-label="([^"]+)"/g)].map(match => match[1]), headersEn.slice(1), `en ${protocol.id}`);

    // Turkish
    const htmlTr = await readFile(path.join(site, 'tr', protocol.id, 'index.html'), 'utf8');
    const tableTr = htmlTr.slice(htmlTr.indexOf('<table class="fields fields--cards" role="table">'), htmlTr.indexOf('</table>', htmlTr.indexOf('fields--cards')));
    const headersTr = [...tableTr.matchAll(/<th scope="col" role="columnheader">([^<]+)<\/th>/g)].map(match => match[1]);
    assert.deepEqual(headersTr, trExpected, `tr ${protocol.id}`);
    const rowsTr = [...tableTr.matchAll(/<tr id="f-([^"]+)" data-field="\1" tabindex="0" role="row"><th scope="row" role="rowheader">[\s\S]*?<\/tr>/g)];
    assert.equal(rowsTr.length, protocol.fields.length, `tr ${protocol.id}`);
    for (const [row] of rowsTr) assert.deepEqual([...row.matchAll(/<td[^>]* role="cell" data-label="([^"]+)"/g)].map(match => match[1]), headersTr.slice(1), `tr ${protocol.id}`);
  }
});

test('16-bit diagrams can switch to the narrower half-row column width', async () => {
  const style = await readFile(path.join(site, 'style.css'), 'utf8');
  assert.match(style, /\.bits-diagram-wrap--16 \.bits \{ min-width: calc\(var\(--cols\) \* max\(18px, 1rem\)\); \}/);
  assert.match(style, /\.bits--split \{ min-width: calc\(var\(--cols\) \* max\(18px, 1rem\)\); \}/);
  for (const protocol of protocols) {
    const html = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    assert.equal(html.includes('bits-diagram-wrap--16'), protocol.rowBits === 16, protocol.id);
  }
});

test('every page has exactly one breadcrumb navigation landmark', async () => {
  for (const file of await htmlFiles(site)) {
    const html = await readFile(file, 'utf8');
    if (!html.includes('class="topbar"')) continue;
    const isTr = file.includes('/tr/');
    const label = isTr ? 'Konum' : 'Location';
    assert.equal([...html.matchAll(new RegExp(`aria-label="${label}"`, 'g'))].length, 1, path.relative(site, file));
    assert.match(html, new RegExp(`<nav class="breadcrumbs" aria-label="${label}">`), path.relative(site, file));
  }
});

test('the field table region is focusable without script and drops its Tab stop only when it does not scroll', async () => {
  const app = await readFile(path.join(site, 'app.js'), 'utf8');
  assert.match(app, /region\.scrollWidth > region\.clientWidth \+ 1\) region\.setAttribute\('tabindex', '0'\)/);
  assert.match(app, /else if \(document\.activeElement !== region\) region\.removeAttribute\('tabindex'\)/);
  for (const protocol of protocols) {
    const html = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    assert.match(html, /<div class="table-scroll" tabindex="0" role="region" aria-label="[^"]+"><table class="fields fields--cards"/, protocol.id);
  }
});

test('anchor targets rely on the shared scroll padding and keep their highlight', async () => {
  const style = await readFile(path.join(site, 'style.css'), 'utf8');
  assert.doesNotMatch(style, /scroll-margin-top\s*:/);
  assert.match(style, /table\.fields tbody tr:target \{/);
  assert.match(style, /\.bibliography > li:target \{/);
});

test('sideways-scrolling tables get the edge fade used by code blocks', async () => {
  const style = await readFile(path.join(site, 'style.css'), 'utf8');
  const app = await readFile(path.join(site, 'app.js'), 'utf8');
  assert.match(style, /\.table-scroll-fade--end \{[^}]*linear-gradient\(to left, var\(--surface\)[^}]*inset -2px 0 0 color-mix\(in srgb, var\(--accent\)/);
  assert.match(style, /\.table-scroll-fade--start \{[^}]*linear-gradient\(to right, var\(--surface\)[^}]*inset 2px 0 0 color-mix\(in srgb, var\(--accent\)/);
  assert.match(app, /document\.querySelectorAll\('\.table-scroll'\)/);
  assert.match(app, /table-scroll-frame--fade-end', overflow && box\.scrollLeft < hidden - 1/);
  for (const file of ['kilavuz/index.html', 'yontem/index.html', 'tr/kilavuz/index.html', 'tr/yontem/index.html']) {
    const html = await readFile(path.join(site, file), 'utf8');
    assert.ok(html.includes('<div class="table-scroll"'), file);
    assert.doesNotMatch(html, /fields--cards/, file);
  }
});

test('every diagram also carries an 8-bit quarter-row layout with one focusable link per field', async () => {
  for (const protocol of protocols) {
    // English
    const htmlEn = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    const startEn = htmlEn.indexOf('<div class="bits bits--quarter" style="--cols:8">');
    assert.ok(startEn > 0, `en ${protocol.id}`);
    const blockEn = htmlEn.slice(startEn, htmlEn.indexOf('\n    </div>', startEn));
    const cellsEn = [...blockEn.matchAll(/<a class="bit-cell([^"]*)"[^>]*data-field="([^"]+)"([^>]*)>(?:<span>([^<]*)<\/span>)/g)];
    const focusableEn = cellsEn.filter(([, , , rest]) => !rest.includes('tabindex="-1"')).map(([, , key]) => key);
    assert.deepEqual(focusableEn, protocol.fields.map(field => field.key), `en ${protocol.id}`);
    for (const [, classes, , rest, label] of cellsEn) if (classes.includes('bit-cell--continued')) {
      assert.match(rest, /aria-hidden="true" tabindex="-1"/, `en ${protocol.id}`);
      assert.match(label, / \(cont\.\)$/, `en ${protocol.id}`);
    }

    // Turkish
    const htmlTr = await readFile(path.join(site, 'tr', protocol.id, 'index.html'), 'utf8');
    const startTr = htmlTr.indexOf('<div class="bits bits--quarter" style="--cols:8">');
    assert.ok(startTr > 0, `tr ${protocol.id}`);
    const blockTr = htmlTr.slice(startTr, htmlTr.indexOf('\n    </div>', startTr));
    const cellsTr = [...blockTr.matchAll(/<a class="bit-cell([^"]*)"[^>]*data-field="([^"]+)"([^>]*)>(?:<span>([^<]*)<\/span>)/g)];
    const focusableTr = cellsTr.filter(([, , , rest]) => !rest.includes('tabindex="-1"')).map(([, , key]) => key);
    assert.deepEqual(focusableTr, protocol.fields.map(field => field.key), `tr ${protocol.id}`);
    for (const [, classes, , rest, label] of cellsTr) if (classes.includes('bit-cell--continued')) {
      assert.match(rest, /aria-hidden="true" tabindex="-1"/, `tr ${protocol.id}`);
      assert.match(label, / \(devam\)$/, `tr ${protocol.id}`);
    }
  }
  const style = await readFile(path.join(site, 'style.css'), 'utf8');
  assert.match(style, /@container bits-diagram \(width < 288px\) or \(width < 18rem\) \{/);
});

test('the home page carries the Layers section, linked from every page, and the old address forwards to it', async () => {
  // English home
  const homeEn = await readFile(path.join(site, 'index.html'), 'utf8');
  for (const id of ['ipv4', 'udp', 'dns', 'tls', 'ssh', 'snmp', 'smb2']) assert.ok(homeEn.includes(`href="/wire/${id}/"`), id);
  for (const key of ['link', 'network', 'transport', 'application']) assert.match(homeEn, new RegExp(`<section class="layer layer--${key}" id="tcpip-${key}"`), key);
  for (const id of ['layers', 'katmanlar', 'encap-title', 'osi-1', 'osi-7', 'common-title']) assert.ok(homeEn.includes(`id="${id}"`), id);
  assert.equal((homeEn.match(/<details class="layers-group">/g) ?? []).length, layers.groups.length, 'one collapsible group per summary group');
  assert.doesNotMatch(homeEn, /protocol-card__meta|layer-pill/);
  assert.match(homeEn, /<li class="protocol-card protocol-card--compact protocol-card--network" data-layer="network" data-search="[^"]*checksum[^"]*"><p class="protocol-card__path">~\/wire\/ipv4<\/p><h3><a href="\/wire\/ipv4\/">/);

  for (const file of ['index.html', 'tcp/index.html', 'kilavuz/index.html']) {
    const html = await readFile(path.join(site, file), 'utf8');
    assert.match(html, /<a href="\/wire\/#layers" class="button secondary help-btn layers-btn">/, file);
    assert.doesNotMatch(html, /href="\/wire\/katmanlar\//, file);
  }

  // Turkish home
  const homeTr = await readFile(path.join(site, 'tr/index.html'), 'utf8');
  for (const id of ['ipv4', 'udp', 'dns', 'tls', 'ssh', 'snmp', 'smb2']) assert.ok(homeTr.includes(`href="/wire/tr/${id}/"`), `tr ${id}`);
  for (const file of ['tr/index.html', 'tr/tcp/index.html', 'tr/kilavuz/index.html']) {
    const html = await readFile(path.join(site, file), 'utf8');
    assert.match(html, /<a href="\/wire\/tr\/#katmanlar" class="button secondary help-btn layers-btn">/, file);
    assert.doesNotMatch(html, /href="\/wire\/tr\/katmanlar\//, file);
  }

  const tcpEn = await readFile(path.join(site, 'tcp/index.html'), 'utf8');
  assert.match(tcpEn, /<a class="layer-badge layer-badge--transport" href="\/wire\/#tcpip-transport">/);

  const tcpTr = await readFile(path.join(site, 'tr/tcp/index.html'), 'utf8');
  assert.match(tcpTr, /<a class="layer-badge layer-badge--transport" href="\/wire\/tr\/#tcpip-transport">/);

  const old = await readFile(path.join(site, 'katmanlar/index.html'), 'utf8');
  assert.match(old, /<meta name="robots" content="noindex">/);
  assert.match(old, /location\.replace\("\/wire\/" \+ \(location\.hash \|\| "#layers"\)\)/);
  assert.doesNotMatch(await readFile(path.join(site, 'sitemap.xml'), 'utf8'), /katmanlar/);

  const oldTr = await readFile(path.join(site, 'tr/katmanlar/index.html'), 'utf8');
  assert.match(oldTr, /<meta name="robots" content="noindex">/);
  assert.match(oldTr, /location\.replace\("\/wire\/tr\/" \+ \(location\.hash \|\| "#katmanlar"\)\)/);
});
