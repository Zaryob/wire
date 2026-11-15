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
