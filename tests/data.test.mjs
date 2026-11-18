import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, bibliography, standards, rfcEntry, standardEntry, isRfc, refKey, rfcText, ieeeText, verifyLayout, loadProtocols } from '../src/sources.mjs';
import { messageTable, structMembers, pageOf, pdfPage } from '../src/ieee.mjs';
import { diagramWidths, rfc826Layout, proseWidths, octetTable, figureFields } from '../src/rfc.mjs';
import { encodeExample, internetChecksum, ipv6Bytes } from '../src/encode.mjs';

const protocols = await loadProtocols();
const layers = JSON.parse(await readFile(path.join(root, 'data/layers.json'), 'utf8'));
const byId = new Map(protocols.map(protocol => [protocol.id, protocol]));
const hex = bytes => bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
const encode = id => {
  const protocol = byId.get(id);
  const from = protocol.example?.payloadFrom;
  return encodeExample(from ? { ...protocol, example: { ...protocol.example, payload: hex(encode(from).bytes) } } : protocol);
};

test('every protocol layout matches the RFC text it cites', async () => {
  for (const protocol of protocols) {
    const check = await verifyLayout(protocol);
    assert.deepEqual(check.found, check.expected, `${protocol.id} against RFC ${protocol.layout.rfc}`);
  }
});

test('diagram reader handles the RFC diagram styles in use', async () => {
  assert.deepEqual(diagramWidths(await rfcText(791), '|Version|  IHL  |'), [4, 4, 8, 16, 16, 3, 13, 8, 8, 16, 32, 32, 24, 8]);
  assert.deepEqual(diagramWidths(await rfcText(8200), '|Version| Traffic Class |').slice(-2), [128, 128]);
  assert.deepEqual(diagramWidths(await rfcText(768), '|     Source      |   Destination   |'), [16, 16, 16, 16]);
  assert.deepEqual(diagramWidths(await rfcText(1035), '|QR|   Opcode  |', 16).slice(0, 3), [16, 1, 4]);
  assert.deepEqual(rfc826Layout(await rfcText(826)).arp.map(item => item.name), ['hrd', 'pro', 'hln', 'pln', 'op', 'sha', 'spa', 'tha', 'tpa']);
  assert.throws(() => diagramWidths('no diagram here', '|Version|'));
  // RFC 5905 Figure 8 draws its first row off the bit grid; the rest reads cleanly.
  const ntp = await rfcText(5905);
  assert.throws(() => diagramWidths(ntp, '|LI | VN  |Mode |'));
  assert.deepEqual(diagramWidths(ntp, 'Root Delay', 32, { fromAnchor: true }).slice(0, 7), [32, 32, 32, 64, 64, 64, 64]);
  assert.deepEqual(proseWidths(ntp, ['Poll: 8-bit']), [8]);
  assert.throws(() => proseWidths(ntp, ['Poll: 16-bit']));
  const table = octetTable(await rfcText(2131), 'FIELD      OCTETS       DESCRIPTION');
  assert.deepEqual(table.map(row => row.name), ['op', 'htype', 'hlen', 'hops', 'xid', 'secs', 'flags', 'ciaddr', 'yiaddr', 'siaddr', 'giaddr', 'chaddr', 'sname', 'file', 'options']);
  assert.equal(table.at(-1).size, 'var');
  // Labels left of the diagram (RFC 3550) and notes right of it (RFC 4303, RFC 5462) are not cells.
  assert.deepEqual(diagramWidths(await rfcText(3550), '|V=2|P|    RC   |   PT=SR=200   |').slice(0, 7), [2, 1, 5, 8, 16, 32, 32]);
  assert.deepEqual(diagramWidths(await rfcText(4303), 'Security Parameters Index (SPI)                 |').slice(0, 2), [32, 32]);
  assert.deepEqual(diagramWidths(await rfcText(5462), '| TC  |S|       TTL     |'), [20, 3, 1, 8]);
  // Rows of one cell with no ruler between them are one field (RFC 8489 Transaction ID).
  assert.deepEqual(diagramWidths(await rfcText(8489), '|0 0|     STUN Message Type     |'), [2, 14, 16, 32, 96]);
  // Rulers of "+---+" per bit (RFC 6325) divide the same way.
  assert.deepEqual(diagramWidths(await rfcText(6325), '| Priority  | C |', 16), [3, 1, 12]);
  assert.deepEqual(proseWidths(await rfcText(6455), ['[ frame-masking-key ] ; 32 bits in length']), [32]);
  const initial = figureFields(await rfcText(9000), 'Initial Packet');
  assert.deepEqual(initial.map(item => item.size), ['1', '1', '2', '2', '2', '32', '8', '0..160', '8', '0..160', 'i', '..', 'i', '8..32', '8..']);
  assert.equal(initial[7].name, 'Destination Connection ID');
  // Blank lines inside a figure are skipped (RFC 9113 Figure 1).
  assert.deepEqual(figureFields(await rfcText(9113), 'HTTP Frame').map(item => item.size), ['24', '8', '8', '1', '31', '..']);
  assert.throws(() => figureFields(initial.toString(), 'Initial Packet'));
});

test('a figure layout rejects widths outside the stated range', async () => {
  const quic = byId.get('quic');
  const widen = (key, change) => ({ ...quic, fields: quic.fields.map(field => (field.key === key ? { ...field, ...change } : field)) });
  assert.equal((await verifyLayout(quic)).ok, true);
  assert.equal((await verifyLayout(widen('dcid', { bits: 168 }))).ok, false, 'a connection ID is at most 160 bits');
  assert.equal((await verifyLayout(widen('dcid', { range: undefined }))).ok, false, 'a ranged field must repeat the range');
  assert.equal((await verifyLayout(widen('length', { type: 'uint' }))).ok, false, '(i) needs a variable-length integer');
  assert.equal((await verifyLayout(widen('version', { bits: 24 }))).ok, false);
});

test('pages without a citable RFC layout are marked as unverified', async () => {
  for (const protocol of protocols.filter(item => item.layout.kind === 'standard')) {
    const check = await verifyLayout(protocol);
    assert.equal(check.unverified, true, protocol.id);
    standardEntry(protocol.layout.std);
    assert.ok(protocol.refs.includes(protocol.layout.std), protocol.id);
  }
  assert.deepEqual(protocols.filter(item => item.layout.kind === 'standard').map(item => item.id), [], 'every IEEE page is now checked against its text');
  // A standard whose text nobody has read is cited without clause numbers, except
  // where its published MIB states the clause (checked below).
  for (const protocol of protocols.filter(item => item.layout.kind === 'standard')) {
    for (const field of protocol.fields) {
      if (field.ref.mib) assert.deepEqual(Object.keys(field.ref).sort(), ['label', 'mib', 'section', 'std'], `${protocol.id}.${field.key}`);
      else assert.deepEqual(Object.keys(field.ref), ['std'], `${protocol.id}.${field.key}`);
    }
  }
});

test('the LLDP page agrees with IEEE 802.1AB-2016 and its MIB modules', async () => {
  const lldp = byId.get('lldp');
  const check = await verifyLayout(lldp);
  assert.equal(check.stale, false, 'record differs from the text or the MIB files; run npm run sync:ieee');
  assert.deepEqual([...check.items, ...check.mibItems].filter(item => !item.ok), [], 'every fact holds');
  assert.ok(check.items.length >= 9 && check.mibItems.length >= 8);
  const text = lldp.layout.checked.facts;
  assert.deepEqual(text.mandatoryOrder, ['Chassis ID', 'Port ID', 'Time To Live']);
  assert.deepEqual([text.typeBits, text.endOctets * 8 - text.typeBits, text.etherType, text.nearestBridge], [7, 9, '88-CC', '01-80-C2-00-00-0E']);
  const renumbered = structuredClone(lldp);
  renumbered.fields.find(field => field.key === 'ttl_type').example = 4;
  assert.equal((await verifyLayout(renumbered)).ok, false, 'a TLV type that differs from Table 8-1 is rejected');
  const facts = lldp.layout.mib.checked.facts;
  assert.deepEqual([facts.typeBits, facts.lengthBits, facts.ttlBits], [7, 9, 16]);
  assert.equal(facts.txInterval * facts.holdMultiplier + 1, 121, 'TTL with the default interval and multiplier');
  const changed = structuredClone(lldp);
  changed.fields.find(field => field.key === 'port_subtype').values[4][1] = 'Arayüz adı (ifName)';
  assert.equal((await verifyLayout(changed)).ok, false, 'a subtype name that differs from the MIB is rejected');
});

test('IEEE layouts match the record of their last check against the licensed text', async () => {
  for (const protocol of protocols.filter(item => item.layout.kind === 'ieee')) {
    const check = await verifyLayout(protocol);
    assert.equal(check.stale, false, `${protocol.id}: record differs from the text; run npm run sync:ieee`);
    assert.deepEqual(check.found, check.expected, protocol.id);
    assert.match(protocol.layout.checked.sha256, /^[0-9a-f]{64}$/);
    assert.ok(standardEntry(protocol.layout.std).copy, `${protocol.layout.std} names no licensed copy`);
  }
  const ptp = byId.get('ptp');
  const changed = structuredClone(ptp);
  changed.fields.find(field => field.key === 'message_length').bits = 8;
  assert.equal((await verifyLayout(changed)).ok, false, 'a field width that differs from the record is rejected');
});

const ieee1588 = await ieeeText('ieee-1588-2008');
test('IEEE 1588-2008 tables read from the licensed text', { skip: ieee1588 ? false : 'no licensed copy in .cache/ieee/' }, () => {
  const header = messageTable(ieee1588, 'Table 18 ⎯Common message header');
  assert.equal(header.at(-1).offset + header.at(-1).bits / 8, 34, 'the common header is 34 octets');
  assert.deepEqual(header.slice(0, 2), [{ name: 'transportSpecific', bits: 4, offset: 0 }, { name: 'messageType', bits: 4, offset: 0 }]);
  assert.deepEqual(structMembers(ieee1588, 'Timestamp'), [{ name: 'secondsField', bits: 48 }, { name: 'nanosecondsField', bits: 32 }]);
  assert.deepEqual(structMembers(ieee1588, 'PortIdentity'), [{ name: 'clockIdentity', bits: 64 }, { name: 'portNumber', bits: 16 }]);
  assert.throws(() => messageTable(ieee1588, 'Table 999 ⎯No such table'));
});

for (const entry of standards.entries.filter(item => item.copy)) {
  const text = await ieeeText(entry.id);
  test(`clauses cited from ${entry.short} start on the printed page given`, { skip: text ? false : 'no licensed copy in .cache/ieee/' }, () => {
    let count = 0;
    for (const protocol of protocols.filter(item => item.layout.std === entry.id)) {
      for (const ref of [...protocol.layout.refs, ...protocol.fields.map(field => field.ref)].filter(item => item.std === entry.id)) {
        // The heading itself, not its table-of-contents line (which ends in a dot leader).
        const pdf = pageOf(text, new RegExp(`^${ref.section.replace(/\./g, '\\.')} (?!.*\\.{4})\\S`, 'm'));
        assert.ok(pdf, `${protocol.id}: §${ref.section} not found`);
        assert.equal(pdf - entry.pageOffset, ref.page, `${protocol.id}: §${ref.section} is on printed page ${pdf - entry.pageOffset}`);
        assert.match(pdfPage(text, pdf), new RegExp(`^${ref.page}( / \\d+)?$`, 'm'), `printed page ${ref.page} is PDF page ${pdf}`);
        count += 1;
      }
    }
    assert.ok(count > 0, `no clause of ${entry.short} is cited`);
  });
}

test('every citation resolves to the bibliography and every listed RFC is used', async () => {
  const listed = JSON.parse(await readFile(path.join(root, 'sources/rfcs.json'), 'utf8')).rfcs.map(item => item.number);
  assert.deepEqual(bibliography.entries.map(entry => entry.number), listed);
  const cited = new Set();
  // The Layers page cites the layer sources and the sources of its protocol summaries.
  for (const ref of [...layers.refs, ...layers.groups.flatMap(group => group.items.flatMap(item => item.refs))]) { if (isRfc(ref)) rfcEntry(ref); else standardEntry(ref); cited.add(ref); }
  for (const protocol of protocols) {
    for (const ref of protocol.refs) { if (isRfc(ref)) rfcEntry(ref); else standardEntry(ref); cited.add(ref); }
    for (const field of protocol.fields) {
      assert.ok(protocol.refs.includes(refKey(field.ref)), `${protocol.id}.${field.key} cites ${refKey(field.ref)} outside its page references`);
      assert.ok(field.desc && field.name, `${protocol.id}.${field.key} needs a name and description`);
    }
  }
  assert.deepEqual(listed.filter(number => !cited.has(number)), [], 'RFCs in sources/rfcs.json that no page cites');
  assert.deepEqual(standards.entries.map(entry => entry.id).filter(id => !cited.has(id)), [], 'standards in sources/standards.json that no page cites');
});

test('cited section numbers exist in the RFC text', async () => {
  for (const protocol of protocols) {
    const parts = (protocol.layout.parts ?? []).filter(part => part.rfc && part.section);
    for (const ref of [protocol.layout, ...parts, ...protocol.fields.map(field => field.ref)]) {
      // IEEE texts cannot be downloaded, so their section numbers are not checked.
      if (!ref.section || ref.std || !ref.rfc) continue;
      const text = await rfcText(ref.rfc);
      const pattern = new RegExp(`^\\s{0,3}${ref.section.replace(/\./g, '\\.')}\\.?\\s+\\S`, 'm');
      assert.match(text, pattern, `RFC ${ref.rfc} has no section ${ref.section} (${protocol.id})`);
    }
  }
});

test('RFC 1071 checksum: the worked example from section 3', () => {
  // RFC 1071 §3 sums 0001 f203 f4f5 f6f7 to ddf2 (ones' complement sum).
  assert.equal(internetChecksum([0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7]), (~0xddf2) & 0xffff);
});

test('example packets are internally consistent', () => {
  const ipv4 = encode('ipv4');
  assert.equal(ipv4.headerLength, 20);
  assert.equal((ipv4.bytes[2] << 8) | ipv4.bytes[3], ipv4.bytes.length, 'IPv4 Total Length');
  assert.equal(internetChecksum(ipv4.bytes.slice(0, 20)), 0, 'IPv4 header checksum verifies');
  const udp = encode('udp');
  assert.equal((udp.bytes[4] << 8) | udp.bytes[5], udp.bytes.length, 'UDP Length');
  assert.equal(hex(ipv4.bytes.slice(20)), hex(udp.bytes), 'IPv4 example carries the UDP example');
  const pseudo = [192, 0, 2, 1, 198, 51, 100, 7, 0, 17, 0, udp.bytes.length];
  assert.equal(internetChecksum([...pseudo, ...udp.bytes]), 0, 'UDP checksum verifies with its pseudo-header');
  const icmp = encode('icmp');
  assert.equal(internetChecksum(icmp.bytes), 0, 'ICMP checksum verifies');
  const ipv6 = encode('ipv6');
  assert.equal(ipv6.headerLength, 40);
  assert.equal((ipv6.bytes[4] << 8) | ipv6.bytes[5], ipv6.bytes.length - 40, 'IPv6 Payload Length');
  const icmpv6 = encode('icmpv6');
  const pseudo6 = [...ipv6Bytes('2001:db8::1'), ...ipv6Bytes('2001:db8::2'), 0, 0, 0, icmpv6.bytes.length, 0, 0, 0, 58];
  assert.equal(internetChecksum([...pseudo6, ...icmpv6.bytes]), 0, 'ICMPv6 checksum verifies with the IPv6 pseudo-header');
  const tcp = encode('tcp');
  assert.equal(tcp.headerLength, 20);
  assert.equal(tcp.bytes[12] >> 4, 5, 'TCP Data Offset');
  assert.equal(tcp.bytes[13], 0x02, 'only SYN is set');
  assert.equal(internetChecksum([192, 0, 2, 1, 198, 51, 100, 7, 0, 6, 0, 20, ...tcp.bytes]), 0, 'TCP checksum verifies');
  assert.equal(encode('dns').headerLength, 12);
  assert.equal(encode('arp').bytes.length, 28);
  assert.equal(encode('rarp').bytes.length, 28);
  assert.equal(encode('sctp').headerLength, 12);
  const dccp = encode('dccp');
  assert.equal(dccp.headerLength, 12);
  const pseudoDccp = [192, 0, 2, 1, 198, 51, 100, 7, 0, 33, 0, dccp.bytes.length];
  assert.equal(internetChecksum([...pseudoDccp, ...dccp.bytes]), 0, 'DCCP checksum verifies');
  assert.equal(encode('ah').headerLength, 12);
  assert.equal(encode('ethernet').bytes.length, 14);
  const ntp = encode('ntp');
  assert.equal(ntp.bytes.length, 48, 'NTP basic header is 48 octets');
  assert.equal(ntp.bytes[0], 0x24, 'LI 0, VN 4, Mode 4 (server)');
  const dhcp = encode('dhcp');
  assert.equal(dhcp.headerLength, 236, 'DHCP fixed part is 236 octets');
  assert.equal(hex(dhcp.bytes.slice(236, 240)), '63825363', 'options start with the magic cookie');
  assert.equal(dhcp.bytes.at(-1), 255, 'options end with the End option');
  assert.equal(hex(dhcp.bytes.slice(28, 34)), hex(encode('ethernet').bytes.slice(6, 12)), 'chaddr is the Ethernet example source MAC');
  const dhcpv6 = encode('dhcpv6');
  assert.equal(dhcpv6.headerLength, 4, 'DHCPv6 client/server header is 4 octets');
  // Walk the options: each is code (16), length (16), value; they must tile the rest exactly.
  const codes = [];
  for (let at = 4; at < dhcpv6.bytes.length;) {
    const code = (dhcpv6.bytes[at] << 8) | dhcpv6.bytes[at + 1];
    const length = (dhcpv6.bytes[at + 2] << 8) | dhcpv6.bytes[at + 3];
    codes.push(code);
    at += 4 + length;
    assert.ok(at <= dhcpv6.bytes.length, `option ${code} overruns the message`);
  }
  assert.deepEqual(codes, [1, 6, 8, 3], 'Client ID, ORO, Elapsed Time, IA_NA');
  const rtp = encode('rtp');
  assert.equal(rtp.headerLength, 12, 'RTP fixed header is 12 octets');
  assert.equal(rtp.bytes[0], 0x80, 'V=2, no padding, extension or CSRCs');
  assert.equal(rtp.bytes[1], 0x80, 'marker set, PT 0 (PCMU)');
  assert.equal(rtp.bytes.length - 12, 160, '20 ms of 8000 Hz PCMU');
  const bfd = encode('bfd');
  assert.equal(bfd.bytes.length, 24, 'BFD mandatory section is 24 octets');
  assert.equal(bfd.bytes[3], bfd.bytes.length, 'BFD Length field');
  assert.equal(bfd.bytes[1] >> 6, 3, 'state Up');
});

test('example packets of the tunnelling, security and session pages are internally consistent', async () => {
  const esp = encode('esp');
  const espField = key => { const range = esp.ranges[key]; return esp.bytes.slice(range.offset / 8, (range.offset + range.bits) / 8); };
  assert.equal(esp.headerLength, 8, 'ESP header is SPI and sequence number');
  assert.equal(hex(espField('payload_data')), hex(encode('udp').bytes), 'ESP carries the UDP example');
  const padLength = espField('pad_length')[0];
  assert.deepEqual(espField('padding'), Array.from({ length: padLength }, (_, i) => i + 1), 'default padding counts 1, 2, …');
  assert.equal((espField('payload_data').length + padLength + 2) % 4, 0, 'ciphertext ends on a 4-octet boundary');
  assert.equal(espField('next_header')[0], 17);

  const mpls = encode('mpls');
  assert.equal(hex(mpls.bytes.slice(0, 4)), '00010140', 'label 16, TC 0, S 1, TTL 64');
  assert.equal(hex(mpls.bytes.slice(4)), hex(encode('ipv4').bytes));

  const geneve = encode('geneve');
  assert.equal(geneve.headerLength, 8 + 4 * (geneve.bytes[0] & 0x3f), 'Opt Len counts 4-octet words');
  assert.equal(hex(geneve.bytes.slice(2, 4)), '6558');

  const vlan = encode('vlan');
  assert.equal(hex(vlan.bytes.slice(0, 2)), '8100');
  const tci = (vlan.bytes[2] << 8) | vlan.bytes[3];
  assert.deepEqual([tci >> 13, (tci >> 12) & 1, tci & 0xfff], [5, 0, 100]);
  assert.equal(hex(vlan.bytes.slice(4, 6)), '0800');
  assert.equal(hex(vlan.bytes.slice(6)), hex(encode('ipv4').bytes));

  const lldp = encode('lldp');
  const tlvs = [];
  for (let at = 0; at < lldp.bytes.length;) {
    const head = (lldp.bytes[at] << 8) | lldp.bytes[at + 1];
    tlvs.push(head >> 9);
    at += 2 + (head & 0x1ff);
    assert.ok(at <= lldp.bytes.length, 'TLV overruns the LLDPDU');
    if (head >> 9 === 0) assert.equal(at, lldp.bytes.length, 'End TLV closes the LLDPDU');
  }
  assert.deepEqual(tlvs, [1, 2, 3, 0], 'Chassis ID, Port ID, TTL, End');

  const ptp = encode('ptp');
  assert.equal((ptp.bytes[2] << 8) | ptp.bytes[3], ptp.bytes.length, 'messageLength');
  assert.equal(ptp.bytes.length, 44, '34-octet header and 10-octet originTimestamp (Table 26)');
  assert.equal(ptp.bytes[0] & 0x0f, 0, 'messageType Sync');
  assert.equal(ptp.bytes[1], 0x02, 'reserved nibble 0, versionPTP 2');
  assert.equal(hex(ptp.bytes.slice(6, 8)), '0000', 'one-step Sync: no twoStepFlag, no Announce-only flags');
  assert.equal(ptp.bytes[32], 0x00, 'controlField 0 for Sync (Table 23)');
  assert.equal(hex(ptp.bytes.slice(20, 28)), '00005efffe005301', 'clockIdentity is the EUI-48 with FF FE in octets 3 and 4');

  const rtcp = encode('rtcp');
  assert.equal((((rtcp.bytes[2] << 8) | rtcp.bytes[3]) + 1) * 4, rtcp.bytes.length, 'RTCP length is in 32-bit words minus one');
  assert.equal(rtcp.bytes[0] & 0x1f, 1, 'one report block');
  assert.equal(rtcp.bytes.length, 28 + 24, 'sender info plus one report block');
  assert.equal(hex(rtcp.bytes.slice(4, 8)), hex(encode('rtp').bytes.slice(8, 12)), 'reports on the RTP example SSRC');
});

test('example packets of the web transport pages are internally consistent', async () => {
  // RFC 6455 §5.7 gives this frame byte for byte.
  const websocket = encode('websocket');
  assert.equal(hex(websocket.bytes), '818537fa213d7f9f4d5158');
  assert.ok((await rfcText(6455)).includes('0x81 0x85 0x37 0xfa 0x21 0x3d 0x7f 0x9f 0x4d 0x51 0x58'));
  const key = websocket.bytes.slice(2, 6);
  assert.equal(Buffer.from(websocket.bytes.slice(6).map((byte, i) => byte ^ key[i % 4])).toString(), 'Hello');

  const stun = encode('stun');
  assert.equal(stun.headerLength, 20);
  assert.equal((stun.bytes[2] << 8) | stun.bytes[3], stun.bytes.length - 20, 'Message Length excludes the header');
  assert.equal(hex(stun.bytes.slice(4, 8)), '2112a442');
  const port = ((stun.bytes[26] << 8) | stun.bytes[27]) ^ 0x2112;
  const address = stun.bytes.slice(28, 32).map((byte, i) => byte ^ stun.bytes[4 + i]).join('.');
  assert.equal(`${address}:${port}`, '192.0.2.1:32853', 'XOR-MAPPED-ADDRESS decodes with the magic cookie');

  const quic = encode('quic');
  const b = quic.bytes;
  assert.equal(b[0], 0xc0, 'long header, Initial, 1-octet packet number');
  assert.equal(hex(b.slice(1, 5)), '00000001', 'QUIC version 1');
  let at = 5;
  const dcid = b[at]; at += 1 + dcid;
  const scid = b[at]; at += 1 + scid;
  assert.deepEqual([dcid, scid], [8, 8]);
  const varint = () => { const length = 1 << (b[at] >> 6); let value = b[at] & 0x3f; for (let i = 1; i < length; i += 1) value = value * 256 + b[at + i]; at += length; return value; };
  const token = varint(); at += token;
  assert.equal(token, 16);
  const length = varint();
  assert.equal(length, b.length - at, 'Length covers the packet number and the payload');

  const http2 = encode('http2');
  assert.equal(http2.headerLength, 9);
  assert.equal((http2.bytes[0] << 16) | (http2.bytes[1] << 8) | http2.bytes[2], http2.bytes.length - 9, 'Length excludes the 9-octet header');
  assert.equal(http2.bytes[3], 4, 'SETTINGS');
  assert.equal((http2.bytes.length - 9) % 6, 0, 'SETTINGS carries 6-octet settings');
  assert.equal(((http2.bytes[5] & 0x7f) << 24) | (http2.bytes[6] << 16) | (http2.bytes[7] << 8) | http2.bytes[8], 0, 'stream 0');
});

test('the 802.1Q page agrees with IEEE 802.1Q-2022', async () => {
  const vlan = byId.get('vlan');
  const check = await verifyLayout(vlan);
  assert.equal(check.stale, false, 'record differs from the text; run npm run sync:ieee');
  assert.deepEqual(check.items.filter(item => !item.ok), [], 'every fact holds');
  const facts = vlan.layout.checked.facts;
  assert.deepEqual([facts.tpidOctets, facts.pcpBits, facts.vidBits, facts.tagTypes['802.1QTagType'], facts.tagTypes['802.1QSTagType']], [2, 3, 12, '81-00', '88-A8']);
  assert.deepEqual(facts.trafficTypes.map(([priority]) => priority), [1, 0, 2, 3, 4, 5, 6, 7], 'Table I-2 lists 1 below the default 0');
  const swapped = structuredClone(vlan);
  swapped.fields.find(field => field.key === 'pcp').values[0][1] = 'Background (BE)';
  assert.equal((await verifyLayout(swapped)).ok, false, 'a traffic type that differs from Table I-2 is rejected');
});

test('example packets of the PTP message pages are internally consistent', () => {
  const header = bytes => ({ type: bytes[0] & 0x0f, version: bytes[1] & 0x0f, length: (bytes[2] << 8) | bytes[3], flags: (bytes[6] << 8) | bytes[7], sequence: (bytes[30] << 8) | bytes[31], control: bytes[32], interval: bytes[33] });
  const sync = header(encode('ptp').bytes);
  const followUp = header(encode('ptp-follow-up').bytes);
  const delayReq = encode('ptp-delay-req').bytes;
  const delayResp = encode('ptp-delay-resp').bytes;
  const announce = header(encode('ptp-announce').bytes);
  // Table 19 message types and Table 23 controlField values.
  assert.deepEqual([sync.type, followUp.type, header(delayReq).type, header(delayResp).type, announce.type], [0x0, 0x8, 0x1, 0x9, 0xb]);
  assert.deepEqual([sync.control, followUp.control, header(delayReq).control, header(delayResp).control, announce.control], [0, 2, 1, 3, 5]);
  for (const id of ['ptp', 'ptp-follow-up', 'ptp-delay-req', 'ptp-delay-resp', 'ptp-announce']) {
    const bytes = encode(id).bytes;
    assert.equal(header(bytes).length, bytes.length, `${id}: messageLength`);
    assert.equal(header(bytes).version, 2, `${id}: versionPTP`);
  }
  assert.deepEqual([followUp.length, header(delayReq).length, header(delayResp).length, announce.length], [44, 44, 54, 64], 'Tables 26 to 28 and 25');
  assert.equal(header(delayReq).interval, 0x7f, 'Delay_Req logMessageInterval is 7F (Table 24)');
  assert.equal(header(delayResp).sequence, header(delayReq).sequence, 'Delay_Resp answers the Delay_Req sequenceId');
  assert.equal(hex(delayResp.slice(44, 54)), hex(delayReq.slice(20, 30)), 'requestingPortIdentity is the Delay_Req sourcePortIdentity');
  assert.equal(announce.flags, 0x000c, 'currentUtcOffsetValid and ptpTimescale, defined for Announce only');
  assert.equal(followUp.flags, 0, 'twoStepFlag is defined for Sync and Pdelay_Resp, not Follow_Up');
});

test('example packets of the routing and multicast pages are internally consistent', () => {
  const bgp = encode('bgp').bytes;
  assert.equal(hex(bgp.slice(0, 16)), 'ff'.repeat(16), 'Marker is all ones');
  assert.equal((bgp[16] << 8) | bgp[17], bgp.length, 'BGP Length counts the whole message');
  assert.deepEqual([bgp[18], bgp[19]], [1, 4], 'OPEN, version 4');
  const as = (bgp[20] << 8) | bgp[21];
  assert.ok(as >= 64496 && as <= 64511, 'documentation AS number (RFC 5398)');

  const ospf = encode('ospf').bytes;
  assert.equal((ospf[2] << 8) | ospf[3], ospf.length, 'OSPF Packet length');
  const withoutAuth = [...ospf.slice(0, 16), ...ospf.slice(24)];
  assert.equal(internetChecksum(withoutAuth), 0, 'checksum over the packet without the authentication field (RFC 2328 D.4.1)');
  assert.equal((ospf.length - 44) % 4, 0, 'the neighbor list is whole Router IDs');

  const vrrp = encode('vrrp').bytes;
  assert.equal(vrrp[0], 0x31, 'version 3, type 1');
  assert.equal(internetChecksum(vrrp), 0, 'IPv4 VRRP checksum covers only the VRRP message (RFC 9568 §5.2.8)');
  assert.equal(vrrp.length, 8 + 4 * vrrp[3], 'IPvX Addr Count IPv4 addresses follow the header');

  const igmp = encode('igmpv3').bytes;
  assert.equal(igmp[0], 0x11);
  assert.equal(internetChecksum(igmp), 0, 'IGMPv3 checksum covers the whole message');
  assert.equal(igmp.length, 12 + 4 * ((igmp[10] << 8) | igmp[11]), 'Number of Sources');

  const srh = encode('srh').bytes;
  assert.equal(srh[2], 4, 'Routing Type 4');
  assert.equal(srh.length, 8 + 8 * srh[1], 'Hdr Ext Len counts 8-octet units after the first 8');
  assert.equal(srh[4], (srh.length - 8) / 16 - 1, 'Last Entry indexes the last segment');
  assert.ok(srh[3] <= srh[4], 'Segments Left within the list');
});

test('example packets of the QUIC 1-RTT and HTTP/3 pages are internally consistent', () => {
  const short = encode('quic-1rtt').bytes;
  assert.equal(short[0] & 0x80, 0, 'short header');
  assert.equal(short[0] & 0x40, 0x40, 'Fixed Bit');
  const pnLength = (short[0] & 0x03) + 1;
  assert.equal(pnLength, 2);
  assert.equal(hex(short.slice(1, 9)), byId.get('quic').fields.find(field => field.key === 'scid').example, 'the client receives on the connection ID it chose in its Initial');
  const http3 = encode('http3').bytes;
  assert.equal(http3[0], 0x04, 'SETTINGS');
  assert.equal(http3[1], http3.length - 2, 'Length counts the payload');
  assert.equal(http3[2], 0x06, 'SETTINGS_MAX_FIELD_SECTION_SIZE');
  assert.equal(((http3[3] & 0x3f) << 8) | http3[4], 8192, 'a two-octet variable-length integer');
});

test('the Layers page states only what its sources say', async () => {
  const flat = text => text.replace(/\s+/g, ' ');
  const osi = flat(await rfcText(layers.osiSource.rfc));
  assert.ok(osi.includes(layers.osiSource.phrase), 'RFC 4949 lists the seven OSI layers');
  for (const layer of layers.osi) assert.ok(layers.osiSource.phrase.includes(`(${layer.number}) ${layer.name}`), `OSI layer ${layer.number} is ${layer.name}`);
  const ips = await rfcText(layers.ipsSource.rfc);
  assert.ok(flat(ips).includes(layers.ipsSource.phrase));
  for (const layer of layers.ips) assert.match(ips, new RegExp(`o  ${layer.name}`), `RFC 1122 §1.1.3 names the ${layer.name}`);
  assert.deepEqual(layers.ips.map(layer => layer.wire).sort(), [...new Set(protocols.map(protocol => protocol.layer))].sort(), 'every wire layer group has a TCP/IP layer');
  const items = layers.groups.flatMap(group => group.items);
  for (const layer of layers.ips) assert.ok(items.some(item => item.layer === layer.wire), `a summary in the ${layer.wire} layer`);
  for (const group of layers.groups) for (const item of group.items) {
    assert.ok(item.evidence.length, `${item.name}: a summary with no source phrase`);
    assert.ok(layers.ips.some(layer => layer.wire === item.layer), `${item.name}: unknown layer ${item.layer}`);
    for (const id of item.pages) assert.ok(byId.has(id), `${item.name}: no page ${id}`);
    for (const evidence of item.evidence) {
      const text = evidence.rfc ? await rfcText(evidence.rfc) : await ieeeText(evidence.std);
      if (!text) continue; // a licensed text that is not in this checkout
      assert.ok(flat(text).includes(evidence.phrase), `${item.name}: "${evidence.phrase}" is not in ${evidence.rfc ? `RFC ${evidence.rfc}` : evidence.std}`);
      assert.ok(item.refs.includes(evidence.rfc ?? evidence.std), `${item.name}: evidence from a source the summary does not cite`);
    }
  }
});

test('example packets of the security, management and file sharing pages are internally consistent', () => {
  const srtp = encode('srtp').bytes;
  assert.equal(hex(srtp.slice(0, 12)), hex(encode('rtp').bytes.slice(0, 12)), 'SRTP keeps the RTP header in the clear');
  assert.equal(srtp.length, encode('rtp').bytes.length + 10, 'same-size encrypted payload plus an 80-bit tag');

  const tls = encode('tls').bytes;
  assert.deepEqual([tls[0], tls[1], tls[2]], [23, 3, 3], 'application_data, legacy version 0x0303');
  assert.equal((tls[3] << 8) | tls[4], tls.length - 5, 'length counts the encrypted record');
  assert.ok(tls.length - 5 <= 2 ** 14 + 256);

  const ssh = encode('ssh').bytes;
  const packetLength = (ssh[0] << 24) | (ssh[1] << 16) | (ssh[2] << 8) | ssh[3];
  const padding = ssh[4];
  assert.ok(padding >= 4, 'at least four bytes of padding (RFC 4253 §6)');
  assert.equal((4 + packetLength) % 16, 0, 'packet_length plus its own field is a multiple of the block size');
  assert.equal(ssh.length, 4 + packetLength + 32, 'packet_length excludes itself and the 32-octet MAC');
  assert.equal(ssh[5], 5, 'SSH_MSG_SERVICE_REQUEST');
  assert.equal(Buffer.from(ssh.slice(10, 22)).toString(), 'ssh-userauth');

  const smb = encode('smb2').bytes;
  assert.equal(smb[0], 0, 'Direct TCP header starts with zero');
  assert.equal((smb[1] << 16) | (smb[2] << 8) | smb[3], smb.length - 4, 'StreamProtocolLength in network order');
  assert.equal(hex(smb.slice(4, 8)), 'fe534d42', 'ProtocolId 0xFE S M B');
  assert.equal(smb[8] | (smb[9] << 8), 64, 'StructureSize 64, little-endian');
  assert.equal(smb[16] | (smb[17] << 8), 0x000d, 'Command ECHO, little-endian');
  assert.equal(smb[68] | (smb[69] << 8), 4, 'ECHO StructureSize 4');
});
