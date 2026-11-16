import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, loadProtocols } from '../src/sources.mjs';

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

test('every protocol has a page whose fields link to an RFC', async () => {
  for (const protocol of protocols) {
    const html = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    for (const field of protocol.fields) assert.ok(html.includes(`id="f-${field.key}"`), `${protocol.id}: ${field.key}`);
    assert.ok(html.includes(`https://www.rfc-editor.org/rfc/rfc${protocol.layout.rfc}`));
    assert.match(html, /<html lang="tr">/);
  }
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
  const bibliography = await readFile(path.join(site, 'kaynakca/index.html'), 'utf8');
  for (const protocol of protocols) for (const number of protocol.refs) assert.ok(bibliography.includes(`id="rfc${number}"`), `RFC ${number}`);
});

test('top bar links are named by their visible text first', async () => {
  for (const file of ['index.html', 'tcp/index.html']) {
    const html = await readFile(path.join(site, file), 'utf8');
    const topbar = html.slice(html.indexOf('<header class="topbar">'), html.indexOf('</header>', html.indexOf('<header class="topbar">')));
    assert.doesNotMatch(topbar, /aria-label="(?!Konum)/, file);
    assert.match(topbar, /<span>Protokoller<\/span>\s*<span class="count">\d+<\/span>\s*<span class="console-sr-only">/);
    assert.match(topbar, /<span>Kılavuz<\/span>\s*<span class="console-sr-only">/);
  }
});

test('the "/" hint points at the search it opens', async () => {
  const home = await readFile(path.join(site, 'index.html'), 'utf8');
  const tcp = await readFile(path.join(site, 'tcp/index.html'), 'utf8');
  const headerSearch = html => html.match(/<button class="console-search-open"[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(headerSearch(home), /<kbd>/, 'on the home page "/" focuses the protocol filter');
  assert.match(home, /id="protocol-filter"[^>]*>\s*<kbd aria-hidden="true">\/<\/kbd>/);
  assert.match(headerSearch(tcp), /<kbd>\/<\/kbd>/);
});

test('32-bit diagrams also carry a 16-bit half-row layout with one focusable link per field', async () => {
  for (const protocol of protocols) {
    const html = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    const start = html.indexOf('<div class="bits bits--split"');
    if (protocol.rowBits !== 32) { assert.equal(start, -1, protocol.id); continue; }
    assert.ok(start > 0, protocol.id);
    const split = html.slice(start, html.indexOf('</div>\n  </div>', start));
    const cells = [...split.matchAll(/<a class="bit-cell([^"]*)"[^>]*data-field="([^"]+)"([^>]*)>/g)];
    const focusable = cells.filter(([, , , rest]) => !rest.includes('tabindex="-1"')).map(([, , key]) => key);
    assert.deepEqual(focusable, protocol.fields.map(field => field.key), protocol.id);
    for (const [, classes, , rest] of cells) if (classes.includes('bit-cell--continued')) assert.match(rest, /aria-hidden="true" tabindex="-1"/, protocol.id);
    for (const [, ruler] of split.matchAll(/bits-ruler--half" aria-hidden="true">((?:<span[^>]*>\d+<\/span>){16})/g)) {
      const bits = [...ruler.matchAll(/>(\d+)</g)].map(match => Number(match[1]));
      assert.ok([0, 16].includes(bits[0]) && bits.every((bit, i) => bit === bits[0] + i), `${protocol.id}: ${bits}`);
    }
  }
});

test('field table cells carry their column header for the phone card layout', async () => {
  for (const protocol of protocols) {
    const html = await readFile(path.join(site, protocol.id, 'index.html'), 'utf8');
    const table = html.slice(html.indexOf('<table class="fields fields--cards" role="table">'), html.indexOf('</table>', html.indexOf('fields--cards')));
    const headers = [...table.matchAll(/<th scope="col" role="columnheader">([^<]+)<\/th>/g)].map(match => match[1]);
    assert.deepEqual(headers, ['Alan', 'Bit', 'Genişlik', 'Örnek', 'Açıklama ve kaynak'], protocol.id);
    const rows = [...table.matchAll(/<tr id="f-([^"]+)" data-field="\1" tabindex="0" role="row"><th scope="row" role="rowheader">[\s\S]*?<\/tr>/g)];
    assert.equal(rows.length, protocol.fields.length, protocol.id);
    for (const [row] of rows) assert.deepEqual([...row.matchAll(/<td[^>]* role="cell" data-label="([^"]+)"/g)].map(match => match[1]), headers.slice(1), protocol.id);
  }
});
