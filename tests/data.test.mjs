import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, bibliography, rfcEntry, rfcText, verifyLayout, loadProtocols } from '../src/sources.mjs';
import { diagramWidths, rfc826Layout, proseWidths, octetTable } from '../src/rfc.mjs';
import { encodeExample, internetChecksum, ipv6Bytes } from '../src/encode.mjs';

const protocols = await loadProtocols();
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
});

test('every citation resolves to the bibliography and every listed RFC is used', async () => {
  const listed = JSON.parse(await readFile(path.join(root, 'sources/rfcs.json'), 'utf8')).rfcs.map(item => item.number);
  assert.deepEqual(bibliography.entries.map(entry => entry.number), listed);
  const cited = new Set();
  for (const protocol of protocols) {
    for (const number of protocol.refs) { rfcEntry(number); cited.add(number); }
    for (const field of protocol.fields) {
      assert.ok(protocol.refs.includes(field.ref.rfc), `${protocol.id}.${field.key} cites RFC ${field.ref.rfc} outside its page references`);
      assert.ok(field.desc && field.name, `${protocol.id}.${field.key} needs a name and description`);
    }
  }
  assert.deepEqual(listed.filter(number => !cited.has(number)), [], 'RFCs in sources/rfcs.json that no page cites');
});

test('cited section numbers exist in the RFC text', async () => {
  for (const protocol of protocols) {
    for (const ref of [protocol.layout, ...protocol.fields.map(field => field.ref)]) {
      if (!ref.section) continue;
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
