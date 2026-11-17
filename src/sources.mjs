// RFC text access shared by the build and the tests: cached copy if present,
// otherwise fetched; either way it must match the digest in the bibliography.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagramWidths, rfc826Layout, proseWidths, octetTable, figureFields } from './rfc.mjs';
import { messageFields, lldpMibFacts, lldpTextFacts, vlanTextFacts } from './ieee.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const bibliography = JSON.parse(await readFile(path.join(root, 'sources/bibliography.json'), 'utf8'));
const byNumber = new Map(bibliography.entries.map(entry => [entry.number, entry]));
export const standards = JSON.parse(await readFile(path.join(root, 'sources/standards.json'), 'utf8'));
const byId = new Map(standards.entries.map(entry => [entry.id, entry]));
/** A non-RFC standard cited by id, e.g. "ieee-802.1q-2022". */
export const standardEntry = id => {
  const entry = byId.get(id);
  if (!entry) throw new Error(`standard ${id} is cited but missing from sources/standards.json`);
  return entry;
};
/**
 * Text of a licensed IEEE standard extracted by scripts/sync-ieee.py, or null when no
 * copy is present (as in CI). The text never leaves .cache/.
 */
export async function ieeeText(id) {
  try { return await readFile(path.join(root, '.cache/ieee', `${id}.txt`), 'utf8'); } catch { return null; }
}

/**
 * The MIB modules a standard publishes alongside its text (802.1AB), joined, or null
 * when they are not in .cache/. They are unwatermarked, so each file must match its
 * recorded digest exactly.
 */
export async function mibText(id) {
  const entry = standardEntry(id);
  if (!entry.mib) return null;
  const parts = [];
  for (const { file, sha256 } of entry.mib.files) {
    let data;
    try { data = await readFile(path.join(root, file)); } catch { return null; }
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest !== sha256) throw new Error(`${file}: sha256 ${digest} differs from sources/standards.json`);
    parts.push(data.toString('utf8'));
  }
  return parts.join('\n');
}

/**
 * What the LLDP data must agree with in the 802.1AB MIB facts. Each item names the
 * fact and whether the page's data matches it.
 */
export function lldpMibChecks(protocol, facts) {
  const by = new Map(protocol.fields.map(field => [field.key, field]));
  const enumOf = field => field.values.map(([number, label]) => [Number(number), label.match(/\((\w+)\)$/)?.[1]]);
  const fits = (field, [low, high]) => field.bits / 8 >= low && field.bits / 8 <= high;
  const checks = [
    ['TLV tür alanları 7 bit', ['chassis_type', 'port_type', 'ttl_type', 'end_type'].every(key => by.get(key).bits === facts.typeBits)],
    ['TLV uzunluk alanları 9 bit', ['chassis_len', 'port_len', 'ttl_len', 'end_len'].every(key => by.get(key).bits === facts.lengthBits)],
    ['TTL 16 bit', by.get('ttl').bits === facts.ttlBits],
    ['TTL = 30 × 4 + 1', by.get('ttl').example === facts.txInterval * facts.holdMultiplier + 1],
    ['Chassis ID alt türleri', JSON.stringify(enumOf(by.get('chassis_subtype'))) === JSON.stringify(facts.chassisIdSubtypes)],
    ['Port ID alt türleri', JSON.stringify(enumOf(by.get('port_subtype'))) === JSON.stringify(facts.portIdSubtypes)],
    ['Chassis ID 1–255 sekizli', fits(by.get('chassis_id'), facts.chassisIdSize)],
    ['Port ID 1–255 sekizli', fits(by.get('port_id'), facts.portIdSize)],
  ];
  for (const field of protocol.fields.filter(item => item.ref.mib)) {
    checks.push([`§${field.ref.section} (${field.ref.mib})`, facts.references[field.ref.mib] === field.ref.section]);
  }
  return checks.map(([what, ok]) => ({ what, ok }));
}

/**
 * What the LLDP data must agree with in IEEE 802.1AB-2016 itself. Its TLV figures are
 * images, so the layout comes from the clauses that state it in words and tables.
 */
export function lldpTextChecks(protocol, facts, mibFacts) {
  const by = new Map(protocol.fields.map(field => [field.key, field]));
  const bits = max => Math.ceil(Math.log2(max + 1));
  const lengthBits = facts.endOctets * 8 - facts.typeBits;
  const tlvs = [['chassis', 'Chassis ID'], ['port', 'Port ID'], ['ttl', 'Time To Live'], ['end', 'End Of LLDPDU']];
  const typeName = Object.fromEntries(Object.entries(facts.tlvTypes).map(([name, { type }]) => [type, name]));
  const sent = protocol.fields.filter(field => field.key.endsWith('_type')).map(field => typeName[field.example]);
  const numbers = field => field.values.map(([number]) => Number(number));
  const basis = (rows, number) => rows.find(([value]) => value === number)?.[1];
  const ttl = by.get('ttl');
  const checks = [
    ['TLV tür alanı 7 bit (§8.4.1)', tlvs.every(([key]) => by.get(`${key}_type`).bits === facts.typeBits)],
    ['TLV uzunluk alanı 9 bit (§8.4, §8.5.1)', facts.lengthFollowsType && tlvs.every(([key]) => by.get(`${key}_len`).bits === lengthBits)],
    ['TLV tür numaraları (Table 8-1)', tlvs.every(([key, name]) => by.get(`${key}_type`).example === facts.tlvTypes[name]?.type)],
    ['zorunlu TLV sırası (§8.2)', JSON.stringify(sent.slice(0, 3)) === JSON.stringify(facts.mandatoryOrder) && sent.indexOf('End Of LLDPDU') === sent.length - 1 && facts.endOptional],
    ['bilgi dizisi uzunlukları (§8.5.2.1, §8.5.3.1, §8.5.1)', by.get('chassis_len').example === 1 + by.get('chassis_id').bits / 8 && by.get('port_len').example === 1 + by.get('port_id').bits / 8 && by.get('ttl_len').example === ttl.bits / 8 && by.get('end_len').example === 0],
    ['alt tür alanları 8 bit (Table 8-2, 8-3)', ['chassis_subtype', 'port_subtype'].every(key => by.get(key).bits === bits(facts.subtypeMax))],
    ['alt tür değerleri (Table 8-2, 8-3)', JSON.stringify(numbers(by.get('chassis_subtype'))) === JSON.stringify(facts.chassisIdSubtypes.map(([n]) => n)) && JSON.stringify(numbers(by.get('port_subtype'))) === JSON.stringify(facts.portIdSubtypes.map(([n]) => n))],
    ['örnekteki alt türler: MAC adresi ve arayüz adı', basis(facts.chassisIdSubtypes, by.get('chassis_subtype').example) === 'MAC address' && by.get('chassis_id').type === 'mac' && basis(facts.portIdSubtypes, by.get('port_subtype').example) === 'Interface name'],
    ['TTL 16 bit (§8.5.4.1)', ttl.bits === bits(facts.ttlMax)],
  ];
  if (mibFacts) checks.push(['TTL = min(30 × 4 + 1, 65535) (§9.2.5.22)', facts.txTTLPlusOne && ttl.example === Math.min(mibFacts.txInterval * mibFacts.holdMultiplier + 1, facts.ttlMax)]);
  return checks.map(([what, ok]) => ({ what, ok }));
}

/** What the 802.1Q VLAN tag data must agree with in IEEE 802.1Q-2022. */
export function vlanTextChecks(protocol, facts) {
  const by = new Map(protocol.fields.map(field => [field.key, field]));
  const [pcpHigh, pcpLow, dei, vidHigh, vidLow, vid2High, vid2Low] = facts.figureBits;
  const figure = { pcp: pcpHigh - pcpLow + 1, dei: dei === pcpLow - 1 ? 1 : 0, vid: (vidHigh - vidLow + 1) + (vid2High - vid2Low + 1) };
  const hex = value => Number(BigInt(value)).toString(16).padStart(4, '0').replace(/^(..)(..)$/, '$1-$2').toUpperCase();
  const values = field => field.values.map(([value, label]) => [value, label.match(/\(([A-Z]{2})\)$/)?.[1]]);
  const tagBits = facts.tpidOctets * 8;
  return [
    ['TPID 2 sekizli (§9.4)', by.get('tpid').bits === tagBits],
    ['C-TAG TPID 81-00 (Table 9-1)', hex(by.get('tpid').example) === facts.tagTypes['802.1QTagType']],
    ['TCI 2 sekizli: PCP + DEI + VID (§9.6)', by.get('pcp').bits + by.get('dei').bits + by.get('vid').bits === facts.tciOctets * 8],
    ['PCP 3 bit (§9.6, §6.9.3)', by.get('pcp').bits === facts.pcpBits && figure.pcp === facts.pcpBits],
    ['DEI 1 bit (Figure 9-1)', by.get('dei').bits === figure.dei && facts.dropEligibleName],
    ['VID 12 bit (§9.6, Figure 9-1)', by.get('vid').bits === facts.vidBits && figure.vid === facts.vidBits],
    ['öncelik değerleri ve trafik türleri (Table I-2)', JSON.stringify(values(by.get('pcp')).map(([value, acronym]) => [Number(value), acronym])) === JSON.stringify(facts.trafficTypes)],
    ['ayrılmış VID değerleri (Table 9-2)', JSON.stringify(by.get('vid').values.filter(([value]) => /^(0|1|2|0xFFF)$/i.test(value)).map(([value]) => value.replace(/^0x/i, '').toUpperCase())) === JSON.stringify(facts.reservedVids.map(([vid]) => vid))],
    ['iç EtherType 2 sekizli (§9.4)', by.get('type').bits === tagBits],
  ].map(([what, ok]) => ({ what, ok }));
}

/** Readers and checks of IEEE layouts stated in words rather than message tables. */
const textMethods = {
  lldp: { facts: lldpTextFacts, checks: lldpTextChecks },
  vlan: { facts: vlanTextFacts, checks: vlanTextChecks },
};

/** Fields of an IEEE layout read from the standard's text: [{ name, bits }]. */
export const ieeeFields = (text, layout) => messageFields(text, layout);

/** References are RFC numbers or standard ids; a field ref carries { rfc } or { std }. */
export const isRfc = ref => Number.isInteger(ref);
export const refKey = ref => ref.std ?? ref.rfc;
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

/**
 * Does a field match one entry of an RFC 9000 style figure? A plain bit count
 * must equal the field's width. Any other size (a range, "i", "..") must be
 * repeated in the field's `range`; the field is then either variable or sized
 * for the example, within the range's bounds.
 */
function figureMatch(field, size) {
  if (/^\d+$/.test(size)) return field.bits === Number(size) && !field.range;
  if (field.range !== size) return false;
  if (!Number.isInteger(field.bits)) return size.endsWith('..');
  if (size === 'i') return field.type === 'varint' && [8, 16, 32, 64].includes(field.bits);
  const [low, high] = size.split('..').map(bound => (bound === '' ? null : Number(bound)));
  return (low === null || field.bits >= low) && (high === null || field.bits <= high);
}

/** Widths read from one part of a layout: a diagram, prose phrases or a figure. */
async function partWidths(protocol, part) {
  const text = await rfcText(part.rfc ?? protocol.layout.rfc);
  const widths = part.prose
    ? proseWidths(text, part.prose)
    : diagramWidths(text, part.anchor, part.rowBits ?? protocol.rowBits, { fromAnchor: part.fromAnchor ?? false });
  return part.slice ? widths.slice(...part.slice) : widths;
}

/**
 * Compare a protocol's declared field sizes with the layout in the RFC it cites.
 * Fields with a `range` are variable in the standard and sized for the example;
 * only a figure layout, which states the range, checks them.
 */
export async function verifyLayout(protocol) {
  const { kind, anchor, prose = [], parts } = protocol.layout;
  const fixed = protocol.fields.filter(field => Number.isInteger(field.bits) && !field.range);
  let expected;
  let found;
  if (kind === 'ieee' && textMethods[protocol.layout.method]) {
    // Facts from the standard's text, then from its MIB modules; each from the files
    // when present, otherwise from the record of the last check.
    const { layout } = protocol;
    const text = await ieeeText(layout.std);
    const method = textMethods[layout.method];
    const facts = text ? method.facts(text) : layout.checked?.facts;
    const mib = layout.mib ? await mibText(layout.std) : null;
    const mibFacts = !layout.mib ? null : mib ? lldpMibFacts(mib, layout.mib.objects) : layout.mib.checked?.facts;
    const stale = (Boolean(text) && JSON.stringify(facts) !== JSON.stringify(layout.checked?.facts))
      || (Boolean(mib) && JSON.stringify(mibFacts) !== JSON.stringify(layout.mib?.checked?.facts));
    const items = facts ? method.checks(protocol, facts, mibFacts) : [];
    const mibItems = mibFacts ? lldpMibChecks(protocol, mibFacts) : [];
    const widths = fixed.map(field => field.bits);
    return {
      ok: !stale && items.length > 0 && [...items, ...mibItems].every(item => item.ok),
      stale, source: text ? 'text' : 'record', expected: widths, found: widths, widths, items, mibItems,
    };
  }
  if (kind === 'ieee') {
    // Names and widths both have to match the standard's tables. With a licensed copy
    // present they are read from its text and must also equal the recorded check;
    // without one (CI) the recorded check stands in for the text.
    const label = list => list.map(field => `${field.name}:${field.bits}`);
    const declared = label(fixed);
    const text = await ieeeText(protocol.layout.std);
    const recorded = (protocol.layout.checked?.fields ?? []).map(([name, bits]) => ({ name, bits }));
    const read = text ? ieeeFields(text, protocol.layout) : recorded;
    const stale = Boolean(text) && JSON.stringify(label(read)) !== JSON.stringify(label(recorded));
    return {
      ok: !stale && read.length > 0 && JSON.stringify(declared) === JSON.stringify(label(read)),
      stale,
      source: text ? 'text' : 'record',
      expected: declared,
      found: label(read),
      widths: read.map(field => field.bits),
    };
  }
  if (kind === 'standard') {
    // The standard's own text was not read, so the layout is not verified. Facts its MIB
    // modules state are, when the page names them: from the MIB files when present,
    // otherwise from the recorded check.
    expected = fixed.map(field => field.bits);
    const mib = protocol.layout.mib;
    if (!mib) return { ok: true, unverified: true, expected, found: expected };
    const text = await mibText(protocol.layout.std);
    const facts = text ? lldpMibFacts(text, mib.objects) : mib.checked?.facts;
    if (!facts) return { ok: false, unverified: true, expected, found: [], partial: [] };
    const stale = Boolean(text) && JSON.stringify(facts) !== JSON.stringify(mib.checked?.facts);
    const partial = lldpMibChecks(protocol, facts);
    return { ok: !stale && partial.every(item => item.ok), stale, unverified: true, source: text ? 'text' : 'record', expected, found: expected, partial };
  }
  if (parts) {
    expected = fixed.map(field => field.bits);
    found = [];
    for (const part of parts) found.push(...await partWidths(protocol, part));
    return { ok: JSON.stringify(expected) === JSON.stringify(found), expected, found };
  }
  const text = await rfcText(protocol.layout.rfc);
  if (kind === 'figure') {
    const figure = figureFields(text, anchor);
    found = figure.map(item => item.size);
    expected = protocol.fields.map((field, i) => (figure[i] && figureMatch(field, figure[i].size) ? figure[i].size : `${field.bits}${field.range ? ` (${field.range})` : ''}`));
  } else if (kind === 'diagram') {
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
