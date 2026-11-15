// Fetch every RFC in sources/rfcs.json from rfc-editor.org, keep the text in
// .cache/rfc/ (not committed), and write the bibliography with sha256 digests.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, '.cache/rfc');
const { rfcs } = JSON.parse(await readFile(path.join(root, 'sources/rfcs.json'), 'utf8'));

async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'rfc-fetch/1.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(cache, { recursive: true });
const entries = [];
for (const { number, use } of rfcs) {
  const text = await get(`https://www.rfc-editor.org/rfc/rfc${number}.txt`);
  const meta = JSON.parse(await get(`https://www.rfc-editor.org/rfc/rfc${number}.json`));
  await writeFile(path.join(cache, `rfc${number}.txt`), text);
  entries.push({
    number,
    title: meta.title.trim(),
    authors: meta.authors,
    date: meta.pub_date,
    status: meta.status,
    obsoletes: meta.obsoletes,
    obsoleted_by: meta.obsoleted_by,
    updates: meta.updates,
    updated_by: meta.updated_by,
    doi: meta.doi,
    url: `https://www.rfc-editor.org/rfc/rfc${number}`,
    text_url: `https://www.rfc-editor.org/rfc/rfc${number}.txt`,
    sha256: createHash('sha256').update(text).digest('hex'),
    bytes: text.length,
    use,
  });
  console.log(`RFC ${number}: ${meta.title.trim()}`);
}
const retrieved = new Date().toISOString().slice(0, 10);
await writeFile(path.join(root, 'sources/bibliography.json'), `${JSON.stringify({ retrieved, source: 'https://www.rfc-editor.org/', entries }, null, 2)}\n`);
console.log(`${entries.length} RFC → sources/bibliography.json (${retrieved})`);
