// Record, in each IEEE-based protocol's layout, the fields read from the licensed
// standard text (.cache/ieee/<id>.txt, written by scripts/sync-ieee.py), or the facts
// read from the MIB modules a standard publishes (802.1AB). Builds without these
// files (CI) check the data against this record.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, standardEntry, ieeeText, ieeeFields, mibText } from '../src/sources.mjs';
import { lldpMibFacts, lldpTextFacts } from '../src/ieee.mjs';

const directory = path.join(root, 'data/protocols');
const today = new Date().toISOString().slice(0, 10);
for (const name of (await readdir(directory)).filter(file => file.endsWith('.json'))) {
  const file = path.join(directory, name);
  const protocol = JSON.parse(await readFile(file, 'utf8'));
  if (protocol.layout.kind === 'ieee' && protocol.layout.method === 'lldp') {
    const text = await ieeeText(protocol.layout.std);
    const mib = await mibText(protocol.layout.std);
    const entry = standardEntry(protocol.layout.std);
    if (text) {
      const facts = lldpTextFacts(text);
      const sha256 = createHash('sha256').update(await readFile(path.join(root, entry.copy.file))).digest('hex');
      const same = JSON.stringify(protocol.layout.checked?.facts) === JSON.stringify(facts);
      protocol.layout.checked = { date: same ? protocol.layout.checked.date : today, sha256, facts };
    }
    if (mib) {
      const facts = lldpMibFacts(mib, protocol.layout.mib.objects);
      const same = JSON.stringify(protocol.layout.mib.checked?.facts) === JSON.stringify(facts);
      protocol.layout.mib.checked = { date: same ? protocol.layout.mib.checked.date : today, facts };
    }
    await writeFile(file, `${JSON.stringify(protocol, null, 2)}\n`);
    console.log(`${protocol.id}: ${text ? 'text' : 'no text'}, ${mib ? 'MIB' : 'no MIB'} recorded from ${entry.short}`);
    continue;
  }
  if (protocol.layout.kind === 'standard' && protocol.layout.mib) {
    // MIB modules published with the standard: record the facts the page relies on.
    const text = await mibText(protocol.layout.std);
    if (!text) { console.log(`${protocol.id}: no MIB files for ${protocol.layout.std}; record kept`); continue; }
    const facts = lldpMibFacts(text, protocol.layout.mib.objects);
    const previous = protocol.layout.mib.checked;
    const same = JSON.stringify(previous?.facts) === JSON.stringify(facts);
    protocol.layout.mib.checked = { date: same ? previous.date : today, facts };
    await writeFile(file, `${JSON.stringify(protocol, null, 2)}\n`);
    console.log(`${protocol.id}: MIB facts recorded from ${standardEntry(protocol.layout.std).short}`);
    continue;
  }
  if (protocol.layout.kind !== 'ieee') continue;
  const text = await ieeeText(protocol.layout.std);
  if (!text) { console.log(`${protocol.id}: no text for ${protocol.layout.std}; record kept`); continue; }
  const entry = standardEntry(protocol.layout.std);
  const fields = ieeeFields(text, protocol.layout).map(field => [field.name, field.bits]);
  const sha256 = createHash('sha256').update(await readFile(path.join(root, entry.copy.file))).digest('hex');
  const previous = JSON.stringify(protocol.layout.checked?.fields);
  protocol.layout.checked = { date: previous === JSON.stringify(fields) ? protocol.layout.checked.date : today, sha256, fields };
  await writeFile(file, `${JSON.stringify(protocol, null, 2)}\n`);
  console.log(`${protocol.id}: ${fields.length} fields recorded from ${entry.short}`);
}
