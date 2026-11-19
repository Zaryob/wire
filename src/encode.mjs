// Builds the example packet shown on each protocol page from the per-field
// example values, so the hex dump always agrees with the field table.

const hexBytes = text => (text.replace(/[^0-9a-f]/gi, '').match(/../g) || []).map(pair => parseInt(pair, 16));

export function ipv6Bytes(address) {
  const [head, tail = ''] = address.split('::');
  const groups = part => (part ? part.split(':') : []);
  const left = groups(head);
  const right = address.includes('::') ? groups(tail) : [];
  const middle = address.includes('::') ? Array(8 - left.length - right.length).fill('0') : [];
  const all = [...left, ...middle, ...right];
  if (all.length !== 8) throw new Error(`Geçersiz IPv6 adresi: ${address}`);
  return all.flatMap(group => { const value = parseInt(group, 16); return [value >> 8, value & 255]; });
}

/** A field's example value as a BigInt of exactly `bits` bits. */
export function fieldValue(field) {
  const { example, bits, type = 'uint' } = field;
  let bytes;
  if (type === 'ipv4') bytes = example.split('.').map(Number);
  else if (type === 'ipv6') bytes = ipv6Bytes(example);
  else if (type === 'mac' || type === 'bytes') bytes = hexBytes(example);
  if (bytes) {
    if (bytes.length * 8 !== bits) throw new Error(`${field.key}: Örnek ${bytes.length * 8} bit, alan ${bits} bit.`);
    return bytes.reduce((sum, byte) => (sum << 8n) | BigInt(byte), 0n);
  }
  const value = BigInt(example);
  if (type === 'varint') {
    // RFC 9000 §16: the two most significant bits give the length (1, 2, 4 or 8 octets).
    const prefix = { 8: 0n, 16: 1n, 32: 2n, 64: 3n }[bits];
    if (prefix === undefined) throw new Error(`${field.key}: Değişken uzunluklu tamsayı 8, 16, 32 veya 64 bit olmalı.`);
    if (value < 0n || value >= (1n << BigInt(bits - 2))) throw new Error(`${field.key}: Örnek, ${bits / 8} sekizlili değişken uzunluklu tamsayıya sığmıyor.`);
    return (prefix << BigInt(bits - 2)) | value;
  }
  if (value < 0n || value >= (1n << BigInt(bits))) throw new Error(`${field.key}: Örnek ${bits} bite sığmıyor.`);
  // Fields a standard sends least-significant byte first (MS-SMB2 §2.2) are reversed octet by octet.
  if (field.endian === 'little') {
    if (bits % 8) throw new Error(`${field.key}: En az anlamlı baytı önce gelen alanın genişliği sekiz bitin katı olmalı.`);
    let reversed = 0n;
    for (let i = 0; i < bits / 8; i += 1) reversed = (reversed << 8n) | ((value >> BigInt(i * 8)) & 255n);
    return reversed;
  }
  return value;
}

/** RFC 1071: 16-bit ones' complement of the ones' complement sum. */
export function internetChecksum(bytes) {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i] << 8) | (bytes[i + 1] ?? 0);
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return (~sum) & 0xffff;
}

function pseudoHeader(kind, pseudo, length) {
  if (kind === 'pseudo4') {
    return [...pseudo.source.split('.').map(Number), ...pseudo.destination.split('.').map(Number), 0, pseudo.protocol, length >> 8, length & 255];
  }
  return [...ipv6Bytes(pseudo.source), ...ipv6Bytes(pseudo.destination), 0, 0, length >> 8, length & 255, 0, 0, 0, pseudo.protocol];
}

/**
 * Encode a protocol's fixed fields plus its example payload.
 * Returns { bytes, headerLength, fieldsLength, ranges } where ranges maps a
 * field key to its bit offset and width. fieldsLength counts every encoded
 * field; headerLength stops at the first field that is variable in the
 * standard (`range`) and only sized for the example. Checksum fields are
 * computed, never taken from the data file.
 */
export function encodeExample(protocol) {
  const fixed = protocol.fields.filter(field => Number.isInteger(field.bits));
  const total = fixed.reduce((sum, field) => sum + field.bits, 0);
  if (total % 8) throw new Error(`${protocol.id}: Sabit alanların toplam genişliği sekiz bitin katı değil.`);
  const ranges = {};
  let offset = 0;
  let header = 0n;
  for (const field of fixed) {
    ranges[field.key] = { offset, bits: field.bits };
    header = (header << BigInt(field.bits)) | (field.checksum ? 0n : fieldValue(field));
    offset += field.bits;
  }
  const bytes = [];
  for (let i = total / 8 - 1; i >= 0; i -= 1) bytes.push(Number((header >> BigInt(i * 8)) & 255n));
  const payload = hexBytes(protocol.example?.payload ?? '');
  const packet = [...bytes, ...payload];
  for (const field of fixed.filter(item => item.checksum)) {
    const scope = field.checksum === 'header' ? bytes : packet;
    const prefix = field.checksum.startsWith('pseudo') ? pseudoHeader(field.checksum, protocol.example.pseudo, packet.length) : [];
    const value = internetChecksum([...prefix, ...scope]);
    const at = ranges[field.key].offset / 8;
    packet[at] = value >> 8;
    packet[at + 1] = value & 255;
  }
  const firstSized = fixed.find(field => field.range);
  const headerLength = firstSized ? ranges[firstSized.key].offset / 8 : bytes.length;
  return { bytes: packet, headerLength, fieldsLength: bytes.length, ranges };
}
