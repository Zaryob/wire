// RFC text access shared by the build and the tests: cached copy if present,
// otherwise fetched; either way it must match the digest in the bibliography.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagramWidths, rfc826Layout, proseWidths, octetTable } from './rfc.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const bibliography = JSON.parse(await readFile(path.join(root, 'sources/bibliography.json'), 'utf8'));
const byNumber = new Map(bibliography.entries.map(entry => [entry.number, entry]));
export const rfcEntry = number => {
  const entry = byNumber.get(number);
  if (!entry) throw new Error(`RFC ${number} is cited but missing from sources/bibliography.json`);
  return entry;
};

export async function rfcText(number) {
  const entry = rfcEntry(number);
  const file = path.join(root, '.cache/rfc', `rfc${number}.txt`);
  let data;
  try { data = await readFile(file); } catch {
    const response = await fetch(entry.text_url, { headers: { 'User-Agent': 'rfc-fetch/1.0' } });
    if (!response.ok) throw new Error(`${entry.text_url}: HTTP ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  const digest = createHash('sha256').update(data).digest('hex');
  if (digest !== entry.sha256) throw new Error(`RFC ${number} text does not match the recorded sha256; run npm run sync and review the change`);
  return data.toString('utf8');
}

/** Compare a protocol's declared field sizes with the layout in the RFC it cites. */
export async function verifyLayout(protocol) {
  const text = await rfcText(protocol.layout.rfc);
  const fixed = protocol.fields.filter(field => Number.isInteger(field.bits));
  let expected;
  let found;
  const { kind, anchor, prose = [] } = protocol.layout;
  if (kind === 'diagram') {
    // Leading fields may be checked against prose when the RFC draws them off
    // the bit grid; the diagram is then read from the anchor row onward.
    expected = fixed.map(field => field.bits);
    const lead = proseWidths(text, prose);
    const rest = diagramWidths(text, anchor, protocol.rowBits, { fromAnchor: prose.length > 0 });
    found = [...lead, ...rest.slice(0, expected.length - lead.length)];
  } else if (kind === 'table') {
    expected = fixed.map(field => field.bits);
    found = octetTable(text, anchor).map(row => row.size).filter(Number.isInteger);
  } else {
    expected = fixed.map(field => field.sizedBy ?? field.bits);
    found = rfc826Layout(text)[protocol.layout.part].map(item => item.size);
  }
  return { ok: JSON.stringify(expected) === JSON.stringify(found), expected, found };
}

export async function loadProtocols() {
  const { readdir } = await import('node:fs/promises');
  const directory = path.join(root, 'data/protocols');
  const protocols = [];
  for (const name of (await readdir(directory)).filter(file => file.endsWith('.json'))) {
    protocols.push(JSON.parse(await readFile(path.join(directory, name), 'utf8')));
  }
  return protocols.sort((a, b) => a.order - b.order);
}
