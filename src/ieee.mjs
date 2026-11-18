// Reads message layouts out of the text of an IEEE standard (extracted by
// scripts/sync-ieee.py from a licensed copy that stays outside the repository).
// IEEE 1588 gives each message as a table of fields with their size in octets and
// their offset, and the composite types as C-like struct definitions.

/** Text of one PDF page ("\f[pdf N]" markers come from sync-ieee.py). */
export function pdfPage(text, number) {
  const start = text.indexOf(`\f[pdf ${number}]\n`);
  if (start < 0) throw new Error(`page ${number} not in the extracted text`);
  const end = text.indexOf('\f[pdf ', start + 1);
  return text.slice(start, end < 0 ? undefined : end);
}

/** PDF page number on which `pattern` (a RegExp) first matches. */
export function pageOf(text, pattern) {
  const at = text.search(pattern);
  if (at < 0) return null;
  const marks = [...text.slice(0, at).matchAll(/\f\[pdf (\d+)\]\n/g)];
  return Number(marks.at(-1)[1]);
}

/**
 * A "Bits / Octets / Offset" message table that follows its caption
 * ("Table 18 ⎯Common message header"). Returns [{ name, bits, offset }]. A one-octet
 * row naming two fields ("transportSpecific messageType 1 0") is two 4-bit fields,
 * as the table draws them in bits 7–4 and 3–0. Offsets must add up, or the row
 * was misread.
 */
export function messageTable(text, caption) {
  const at = text.search(new RegExp(`^${caption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'));
  if (at < 0) throw new Error(`table caption not found: ${caption}`);
  const rows = [];
  let offset = 0;
  for (const line of text.slice(at).split('\n').slice(1)) {
    if (/^(Bits( Octets Offset)?|Octets Offset|7 6 5 4 3 2 1 0)$/.test(line.trim())) continue;
    const row = line.trim().match(/^(.+?) (\d+) (\d+)$/);
    if (!row) break;
    const [, names, octets, start] = row;
    if (Number(start) !== offset) throw new Error(`${caption}: ${names} at offset ${start}, expected ${offset}`);
    const pair = names.split(' ');
    if (Number(octets) === 1 && pair.length === 2 && pair.every(name => /^\w+$/.test(name))) {
      rows.push({ name: pair[0], bits: 4, offset }, { name: pair[1], bits: 4, offset });
    } else {
      rows.push({ name: names, bits: Number(octets) * 8, offset });
    }
    offset += Number(octets);
  }
  if (!rows.length) throw new Error(`table after ${caption} has no rows`);
  return rows;
}

const primitiveBits = type => {
  const integer = type.match(/^(?:U?Integer|Enumeration)(\d+)$/);
  if (integer) return Number(integer[1]);
  return { Octet: 8, Nibble: 4, Boolean: 1 }[type];
};

/**
 * Members of `struct name { … };` with their widths in bits. Member types are
 * primitives (UInteger48, Octet[8]) or names declared with `typedef Octet[8] X;`.
 */
export function structMembers(text, name) {
  const at = text.search(new RegExp(`^struct ${name}\\s*$`, 'm'));
  if (at < 0) throw new Error(`struct not found: ${name}`);
  const members = [];
  for (const line of text.slice(at).split('\n').slice(1)) {
    const item = line.trim();
    if (item === '{') continue;
    if (item === '};') return members;
    const member = item.match(/^(\w+)(?:\[(\d+)\])? (\w+);$/);
    if (!member) throw new Error(`struct ${name}: unreadable member ${item}`);
    const [, type, count = '1', field] = member;
    let bits = primitiveBits(type);
    if (bits === undefined) {
      const typedef = text.match(new RegExp(`^typedef (\\w+)\\[(\\d+)\\] ${type};$`, 'm'));
      if (!typedef) throw new Error(`struct ${name}: unknown type ${type}`);
      bits = primitiveBits(typedef[1]) * Number(typedef[2]);
    }
    members.push({ name: field, bits: bits * Number(count) });
  }
  throw new Error(`struct ${name} has no closing brace`);
}

/**
 * Fields of a message: its tables in order, leaving out rows named in `skip`
 * (a body table repeats the header as one row) and replacing a composite field
 * by its struct members ("sourcePortIdentity.clockIdentity", …) when `structs`
 * names its type. The members must add up to the table's width for the field.
 */
export function messageFields(text, { tables, structs = {} }) {
  const fields = [];
  for (const { caption, skip = [] } of tables) {
    for (const row of messageTable(text, caption)) {
      if (skip.includes(row.name)) continue;
      const type = structs[row.name];
      if (!type) { fields.push({ name: row.name, bits: row.bits }); continue; }
      const members = structMembers(text, type);
      const total = members.reduce((sum, member) => sum + member.bits, 0);
      if (total !== row.bits) throw new Error(`${row.name}: struct ${type} is ${total} bits, the table gives ${row.bits}`);
      for (const member of members) fields.push({ name: `${row.name}.${member.name}`, bits: member.bits });
    }
  }
  return fields;
}

// IEEE 802.1AB-2016 publishes its MIB modules (LLDP-V2-MIB, LLDP-V2-TC-MIB, 11.5.1 of
// the standard) as separate text files. They do not draw the LLDPDU, but they state
// facts the LLDP page relies on: the subtype enumerations, identifier sizes, the TTL
// computation and the clauses that define each object.

/** `name ::= TEXTUAL-CONVENTION … SYNTAX INTEGER { a(1), … }` as [[number, name], …]. */
export function mibEnum(text, name) {
  const at = text.search(new RegExp(`^${name} ::= TEXTUAL-CONVENTION`, 'm'));
  if (at < 0) throw new Error(`textual convention not found: ${name}`);
  const body = text.slice(at).match(/SYNTAX\s+INTEGER\s*\{([^}]*)\}/);
  if (!body) throw new Error(`${name} has no INTEGER enumeration`);
  return [...body[1].matchAll(/(\w+)\((\d+)\)/g)].map(([, label, number]) => [Number(number), label]);
}

/** The SYNTAX, DEFVAL and REFERENCE of a textual convention or an OBJECT-TYPE. */
export function mibObject(text, name) {
  const at = text.search(new RegExp(`^${name} +(OBJECT-TYPE|::= TEXTUAL-CONVENTION)`, 'm'));
  if (at < 0) throw new Error(`MIB object not found: ${name}`);
  const next = text.slice(at + name.length).search(/^\S+ +(OBJECT-TYPE|::= TEXTUAL-CONVENTION)|^\S+ ::= SEQUENCE/m);
  const block = text.slice(at, next < 0 ? undefined : at + name.length + next);
  const size = block.match(/SYNTAX\s+[^\n]*SIZE\s*\((\d+)\.\.(\d+)\)/);
  const range = block.match(/SYNTAX\s+Unsigned32\s*\((\d+)\.\.(\d+)\)/);
  return {
    size: size ? [Number(size[1]), Number(size[2])] : null,
    range: range ? [Number(range[1]), Number(range[2])] : null,
    defval: block.match(/DEFVAL\s*\{\s*(\w+)\s*\}/)?.[1] ?? null,
    reference: block.match(/REFERENCE\s+"([^"]+)"/)?.[1] ?? null,
    description: block.match(/DESCRIPTION\s+"([^"]*)"/)?.[1].replace(/\s+/g, ' ') ?? '',
  };
}

const bitsFor = max => Math.ceil(Math.log2(max + 1));

/**
 * Facts about the LLDPDU that the 802.1AB-2016 MIB modules state. `objects` are the
 * MIB objects whose clause references the page cites.
 */
export function lldpMibFacts(text, objects) {
  const holdMultiplier = mibObject(text, 'lldpV2MessageTxHoldMultiplier');
  const txInterval = mibObject(text, 'lldpV2MessageTxInterval');
  // "TTL = min(65535, (lldpV2MessageTxInterval*lldpV2MessageTxHoldMultiplier)+1)"
  const formula = holdMultiplier.description.match(/TTL = min\((\d+), \(lldpV2MessageTxInterval\*lldpV2MessageTxHoldMultiplier\)\+1\)/);
  if (!formula) throw new Error('TTL formula not found in lldpV2MessageTxHoldMultiplier');
  // Reserved TLV types are written as 7-digit binary numbers: "(000 1001 - 111 1110)".
  const reserved = mibObject(text, 'lldpV2StatsRxPortTLVsUnrecognizedTotal').description.match(/\(([01 ]+) - ([01 ]+)\)/);
  if (!reserved) throw new Error('reserved TLV type range not found');
  const typeBits = reserved[1].replace(/ /g, '').length;
  const unknown = mibObject(text, 'lldpV2RemUnknownTLVType').range;
  const info = mibObject(text, 'lldpV2RemUnknownTLVInfo').size;
  return {
    chassisIdSubtypes: mibEnum(text, 'LldpV2ChassisIdSubtype'),
    portIdSubtypes: mibEnum(text, 'LldpV2PortIdSubtype'),
    chassisIdSize: mibObject(text, 'LldpV2ChassisId').size,
    portIdSize: mibObject(text, 'LldpV2PortId').size,
    txInterval: Number(txInterval.defval),
    holdMultiplier: Number(holdMultiplier.defval),
    ttlMax: Number(formula[1]),
    ttlBits: bitsFor(Number(formula[1])),
    typeBits,
    reservedTypes: [parseInt(reserved[1].replace(/ /g, ''), 2), parseInt(reserved[2].replace(/ /g, ''), 2)],
    unknownTypeRange: unknown,
    lengthBits: bitsFor(info[1]),
    infoMax: info[1],
    references: Object.fromEntries(objects.map(name => [name, mibObject(text, name).reference])),
  };
}

// IEEE 802.1AB-2016 draws its TLV formats as figures that are images in the PDF, so
// the LLDP layout is read from the clauses that state it in words and tables instead.

const words = { seven: 7, eight: 8, nine: 9 };
const flat = text => text.replace(/\s+/g, ' ');
const need = (text, pattern, what) => {
  const match = text.match(pattern);
  if (!match) throw new Error(`802.1AB text: ${what} not found`);
  return match;
};

/** Rows "n Name …" of an enumeration table, from its caption to `end`. */
function subtypeTable(text, caption, end) {
  const start = text.search(new RegExp(`^${caption}`, 'm'));
  const body = text.slice(start, text.indexOf(end, start));
  // The "ID basis" column runs on into the "Reference" column; the basis names are matched exactly.
  const rows = [...body.matchAll(/^(\d) (Chassis component|Interface alias|Port component|MAC address|Network address|Interface name|Agent circuit ID|Locally assigned) /gm)].map(([, number, name]) => [Number(number), name]);
  const reserved = need(body, /^(\d+)–(\d+) Reserved/m, `${caption} reserved range`);
  return { rows: rows.filter(([number]) => number > 0), reservedMax: Number(reserved[2]) };
}

/** What 802.1AB-2016 states about the LLDPDU and its mandatory TLVs. */
export function lldpTextFacts(text) {
  const all = flat(text);
  const table = text.slice(text.search(/^Table 8-1—TLV type values/m), text.search(/^8\.4\.2 TLV information string length/m));
  const types = Object.fromEntries([...table.matchAll(/^(\d+) (End Of LLDPDU|Chassis ID|Port ID|Time To Live|Port Description|System Name|System Description|System Capabilities|Management Address) (Optional|Mandatory) (8\.5\.\d)$/gm)]
    .map(([, type, name, usage, clause]) => [name, { type: Number(type), usage, clause }]));
  const order = need(all, /shall be in the order shown\. 1\) (Chassis ID) TLV 2\) (Port ID) TLV 3\) (Time To Live) TLV/, 'mandatory TLV order');
  const chassis = subtypeTable(text, 'Table 8-2—chassis ID subtype enumeration', '8.5.2.3 chassis ID');
  const port = subtypeTable(text, 'Table 8-3—port ID subtype enumeration', '8.5.3.3 port ID');
  return {
    typeBits: words[need(all, /The TLV type field is (\w+) bits long/, 'TLV type width')[1]],
    endOctets: Number(need(all, /The End Of LLDPDU TLV is a (\d+)-octet, all-zero TLV/, 'End Of LLDPDU size')[1]),
    lengthFollowsType: /The least significant bit in the first octet of the TLV format is the most significant bit of the TLV information string length field/.test(all),
    tlvTypes: types,
    organizationallySpecific: Number(need(all, /The same Organizationally Specific TLV type value, (\d+), shall be used/, 'organizationally specific type')[1]),
    mandatoryOrder: order.slice(1),
    endOptional: /An End of LLDPDU TLV may be present as the last TLV in the LLDPDU/.test(all),
    chassisIdSubtypes: chassis.rows,
    portIdSubtypes: port.rows,
    subtypeMax: Math.max(chassis.reservedMax, port.reservedMax),
    ttlMax: Number(need(all, /an integer value in the range 0 > t > (\d+) seconds/, 'TTL range')[1]),
    txTTLPlusOne: /\(msgTxInterval \S? ?msgTxHold\) ?\+ ?1 \(1\) (\d+) \(2\)/.test(all),
    etherType: need(all, /LLDP EtherType ([0-9A-F]{2}-[0-9A-F]{2})/, 'LLDP EtherType')[1],
    nearestBridge: need(all, /Nearest bridge (01-80-C2-00-00-[0-9A-F]{2})/, 'nearest bridge address')[1],
    maxLLDPDU8023: Number(need(all, /maximum data field length for the basic, untagged MAC frame \((\d+) octets\)/, 'maximum LLDPDU length')[1]),
  };
}

// IEEE 802.1Q-2022 states the tag layout in words (9.4, 9.6, 6.9.3); Figure 9-1
// survives text extraction only as its bit labels ("Bits: 8 6 5 4 1 8 1").

const between = (text, from, to) => {
  const start = text.search(from);
  if (start < 0) throw new Error(`802.1Q text: ${from} not found`);
  const end = text.slice(start + 1).search(to);
  return text.slice(start, end < 0 ? undefined : start + 1 + end);
};

/** What 802.1Q-2022 states about the VLAN tag (C-TAG). */
export function vlanTextFacts(text) {
  const all = flat(text);
  const octets = { one: 1, two: 2, four: 4 };
  const figure = need(all, /Figure 9-1—VLAN TCI format PCP VID .*? Octets: 1 2 Bits: ((?:\d )+\d) Figure 9-1—VLAN TCI format/, 'Figure 9-1 bit labels')[1].split(' ').map(Number);
  // Bit labels run 8→1 across octet 1 then octet 2: field boundaries are where they restart or step by more than one.
  const tags = between(text, /^Table 9-1—IEEE 802\.1Q™ EtherType allocations/m, /^9\.6 VLAN Tag Control Information/m);
  const reserved = between(text, /^Table 9-2—Reserved VID values/m, /^NOTE 1—There is a distinction/m);
  const types = between(text, /^Table I-2—Traffic type acronyms/m, /^TableI-3 summarizes/m);
  return {
    tpidOctets: octets[need(all, /The TPID is EtherType encoded, i\.e\., is (\w+) octets in length/, 'TPID length')[1]],
    tciOctets: octets[need(all, /The VLAN TCI field \(Figure ?9-1\) is (\w+) octets in length/, 'TCI length')[1]],
    vidBits: Number(need(all, /The VID is encoded in a (\d+)-bit field/, 'VID width')[1]),
    pcpBits: Number(need(all, /conveyed in the (\d+)-bit PCP field and the DEI field/, 'PCP width')[1]),
    figureBits: figure,
    tagTypes: Object.fromEntries([...tags.matchAll(/\((802\.1Q\w*TagType)\) ([0-9A-F]{2}-[0-9A-F]{2})|(802\.1QITagType)\)/g)].filter(m => m[1]).map(m => [m[1], m[2]])),
    reservedVids: [...reserved.matchAll(/^(0|1|2|FFF) (The null VID|The default PVID|The default SR_PVID|Reserved for implementation use)/gm)].map(([, vid, meaning]) => [vid, meaning]),
    trafficTypes: [...types.matchAll(/^(\d)(?: \(Default\))? ([A-Z]{2}) /gm)].map(([, priority, acronym]) => [Number(priority), acronym]),
    defaultPriority: Number(need(all, /The default priority used for transmission by end stations is (\d)/, 'default priority')[1]),
    dropEligibleName: /the Drop Eligible Indicator \(DEI\) in the VLAN tag/.test(all),
  };
}

// [MS-SMB2] draws each structure as a bit grid whose cells survive text extraction as
// the field names in order, and defines every field as "Name (N bytes): …".

/** A structure's fields: its figure's names in order, sized by their "(N bytes)" definitions. */
function msStructure(section) {
  // Running page footers and the page markers of the extracted text can fall inside a figure.
  const footer = /^(\d+ \/ \d+|\[MS-SMB2\] - v\d+|Server Message Block \(SMB\) Protocol Versions 2 and 3|Copyright © \d+ Microsoft Corporation|Release: .*|\f?\[pdf \d+\])$/;
  const lines = section.split('\n').filter(line => !footer.test(line.trim()));
  section = lines.join('\n');
  const ruler = lines.findIndex(line => line.trim() === '0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1');
  const defs = [...section.matchAll(/^(\S[^\n]*?) \((\d+) bytes?\):/gm)].map(([, name, octets]) => ({ name, bits: Number(octets) * 8 }));
  // Figure cells: the lines between the bit ruler and the first definition, split on known names.
  const figure = lines.slice(ruler + 1).join('\n').split(defs[0] ? `${defs[0].name} (` : '\u0000')[0];
  const names = [];
  let rest = figure.replace(/\n/g, ' ').replace(/\.\.\./g, ' ').replace(/\s+/g, ' ').trim();
  const known = [...new Set(defs.map(def => def.name))].sort((a, b) => b.length - a.length);
  while (rest) {
    const next = known.find(name => rest === name || rest.startsWith(`${name} `));
    if (!next) throw new Error(`MS-SMB2 figure: cannot read "${rest.slice(0, 40)}"`);
    names.push(next);
    rest = rest.slice(next.length).trim();
  }
  // Nested definitions ("ChannelSequence (2 bytes)") are skipped: each figure name takes the next definition of that name.
  let at = 0;
  return names.map(name => {
    while (at < defs.length && defs[at].name !== name) at += 1;
    if (at === defs.length) throw new Error(`MS-SMB2: no definition for ${name}`);
    return defs[at++];
  });
}

/** What [MS-SMB2] states about the Direct TCP header, the SYNC header and the ECHO request. */
export function smb2TextFacts(text) {
  const all = flat(text);
  const sync = between(text, /^2\.2\.1\.2 SMB2 Packet Header - SYNC$/m, /^2\.2\.2 SMB2 ERROR Response$/m);
  const transport = between(text, /^2\.1 Transport$/m, /^2\.2 Message Syntax$/m);
  const echo = between(text, /^2\.2\.28 SMB2 ECHO Request$/m, /^2\.2\.29 SMB2 ECHO Response$/m);
  const commands = between(text, /^Name Value\nSMB2 NEGOTIATE 0x0000/m, /^CreditRequest\/CreditResponse \(2 bytes\)/m);
  return {
    littleEndian: /multiple-byte fields \(16-bit, 32-bit, and 64-bit fields\) in an SMB 2 Protocol message MUST be transmitted in little-endian order/.test(all),
    directTcp: [...transport.matchAll(/^(Zero|StreamProtocolLength) \((\d+) bytes?\):/gm)].map(([, name, octets]) => ({ name, bits: Number(octets) * 8 })),
    streamLengthNetworkOrder: /length, in bytes, of the SMB2Message in network byte order/.test(all),
    header: msStructure(sync),
    protocolId: need(flat(sync), /The value MUST be set to (0x[0-9A-F]{8}), also represented as \(in network order\) 0xFE, 'S', 'M', and 'B'/, 'ProtocolId value')[1],
    structureSize: Number(need(flat(sync), /StructureSize \(2 bytes\): This MUST be set to (\d+)/, 'header StructureSize')[1]),
    commands: [...commands.matchAll(/^SMB2 ([A-Z_]+) (0x[0-9A-F]{4})$/gm)].map(([, name, value]) => [name, value]),
    echo: msStructure(echo),
    echoStructureSize: Number(need(flat(echo), /StructureSize \(2 bytes\): The client MUST set this to (\d+)/, 'ECHO StructureSize')[1]),
  };
}
