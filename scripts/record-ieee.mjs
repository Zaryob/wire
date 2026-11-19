// Record, in each IEEE-based protocol's layout, the fields read from the licensed
// standard text (.cache/ieee/<id>.txt, written by scripts/sync-ieee.py), or the facts
// read from the MIB modules a standard publishes (802.1AB). Builds without these
// files (CI) check the data against this record.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, standardEntry, ieeeText, ieeeFields, mibText } from '../src/sources.mjs';
import { lldpMibFacts, lldpTextFacts, vlanTextFacts, smb2TextFacts } from '../src/ieee.mjs';

const textFacts = { lldp: lldpTextFacts, vlan: vlanTextFacts, smb2: smb2TextFacts };

const directory = path.join(root, 'data/protocols');
const today = new Date().toISOString().slice(0, 10);
for (const name of (await readdir(directory)).filter(file => file.endsWith('.json'))) {
  const file = path.join(directory, name);
  const protocol = JSON.parse(await readFile(file, 'utf8'));
  if (protocol.layout.kind === 'ieee' && textFacts[protocol.layout.method]) {
    const text = await ieeeText(protocol.layout.std);
    const mib = protocol.layout.mib ? await mibText(protocol.layout.std) : null;
    const entry = standardEntry(protocol.layout.std);
    if (text) {
      const facts = textFacts[protocol.layout.method](text);
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
    console.log(`${protocol.id}: ${entry.short} doğrulaması kaydedildi (metin: ${text ? 'var' : 'yok'}, MIB: ${mib ? 'var' : 'yok'}).`);
    continue;
  }
  if (protocol.layout.kind === 'standard' && protocol.layout.mib) {
    // MIB modules published with the standard: record the facts the page relies on.
    const text = await mibText(protocol.layout.std);
    if (!text) { console.log(`${protocol.id}: ${protocol.layout.std} için MIB dosyası bulunamadı. Doğrulama kaydı korundu.`); continue; }
    const facts = lldpMibFacts(text, protocol.layout.mib.objects);
    const previous = protocol.layout.mib.checked;
    const same = JSON.stringify(previous?.facts) === JSON.stringify(facts);
    protocol.layout.mib.checked = { date: same ? previous.date : today, facts };
    await writeFile(file, `${JSON.stringify(protocol, null, 2)}\n`);
    console.log(`${protocol.id}: ${standardEntry(protocol.layout.std).short} MIB verileri kaydedildi.`);
    continue;
  }
  if (protocol.layout.kind !== 'ieee') continue;
  const text = await ieeeText(protocol.layout.std);
  if (!text) { console.log(`${protocol.id}: ${protocol.layout.std} metni bulunamadı. Doğrulama kaydı korundu.`); continue; }
  const entry = standardEntry(protocol.layout.std);
  const fields = ieeeFields(text, protocol.layout).map(field => [field.name, field.bits]);
  const sha256 = createHash('sha256').update(await readFile(path.join(root, entry.copy.file))).digest('hex');
  const previous = JSON.stringify(protocol.layout.checked?.fields);
  protocol.layout.checked = { date: previous === JSON.stringify(fields) ? protocol.layout.checked.date : today, sha256, fields };
  await writeFile(file, `${JSON.stringify(protocol, null, 2)}\n`);
  console.log(`${protocol.id}: ${entry.short} standardından ${fields.length} alan kaydedildi.`);
}
