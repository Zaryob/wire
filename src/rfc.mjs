// Reads header layouts out of RFC plain text, so the field widths published on
// the site can be checked against the document they cite.

const isSeparator = line => /^\s*\+[-+=]{6,}/.test(line);
const isContinuation = line => /^\s*\+\s/.test(line);
const isContent = line => /^\s*[|:]/.test(line);

/**
 * Field widths, in bits, of the ASCII header diagram that contains `anchor`.
 * `rowBits` is how many bits one full diagram row stands for (32 in most RFCs,
 * 16 in RFC 1035). A field drawn over several rows joined by "+   +" lines,
 * or over several rows of a single cell with no ruler between them, counts as
 * one field of rows × rowBits. Labels to the left of the diagram ("header |…",
 * RFC 3550) and notes to the right of it ("| ^Int.", RFC 4303) are ignored.
 */
export function diagramWidths(text, anchor, rowBits = 32, { fromAnchor = false } = {}) {
  const raw = text.split('\n');
  const at = raw.findIndex(line => line.includes(anchor));
  if (at < 0) throw new Error(`diagram anchor not found: ${anchor}`);
  // The diagram's left edge is the first bar of the anchor row. Text before
  // that column on any line is a side label, not part of the diagram.
  const column = raw[at].search(/[|:]/);
  const strip = line => {
    const prefix = line.slice(0, column);
    return prefix.trim() && !/[|+:~]/.test(prefix) ? line.slice(column) : line.trimStart();
  };
  let lines = raw.map(strip);
  // Walk up to the first ruler of the diagram the anchor sits in, or, with
  // fromAnchor, start at the ruler directly above the anchor row.
  let start = at;
  if (fromAnchor) start = at - 1;
  else while (start > 0 && (isSeparator(lines[start - 1]) || isContent(lines[start - 1]) || isContinuation(lines[start - 1]))) start -= 1;
  if (!isSeparator(lines[start])) throw new Error(`no diagram ruler above anchor: ${anchor}`);
  // The ruler is the widest separator of the diagram: a diagram may open with a
  // short one (RFC 4271 OPEN starts with an 8-bit "Version" row).
  let ruler = '';
  for (let i = start; i < lines.length && (isSeparator(lines[i]) || isContent(lines[i]) || isContinuation(lines[i])); i += 1) {
    const edge = isSeparator(lines[i]) ? (lines[i].match(/^\s*\+[-+= ]*\+/)?.[0].replace(/[ ]+$/, '') ?? '') : '';
    if (edge.length > ruler.length) ruler = edge;
  }
  // Anything right of the ruler's last column is a margin note.
  lines = lines.map(line => line.slice(0, ruler.length).trimEnd());
  const rowChars = ruler.length - 1;
  const widths = [];
  let block = [];
  const flush = () => {
    const content = block.filter(isContent);
    if (!content.length) { block = []; return; }
    const single = row => row.length === ruler.length && row.split(/[|:]/).length === 3;
    if (block.some(isContinuation) || (content.length > 1 && content.every(single))) {
      widths.push(content.length * rowBits);
    } else {
      const first = content[0];
      const cells = first.split(/[|:]/).slice(1, -1);
      // A row cut short ("| Data ...") is trailing payload, not a fixed field; a row
      // that is short but closed ("| Length | Type |", RFC 4271) is a partial row.
      if (first.length === ruler.length || /[|:]$/.test(first)) {
        for (const cell of cells) widths.push((cell.length + 1) * rowBits / rowChars);
      }
    }
    block = [];
  };
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (isSeparator(line)) { flush(); continue; }
    if (!isContent(line) && !isContinuation(line)) break;
    block.push(line);
  }
  flush();
  if (widths.some(width => !Number.isInteger(width))) throw new Error(`diagram does not divide into whole bits: ${anchor}`);
  return widths;
}

/**
 * RFC 9000 style figure ("Initial Packet { Header Form (1) = 1, … }", also
 * RFC 9113). Returns [{ name, size }] where size is the text in parentheses:
 * a bit count ("32"), a range in bits ("0..160", "8.."), "i" for a
 * variable-length integer, or ".." for a field of any length.
 */
export function figureFields(text, anchor) {
  const lines = text.split('\n');
  const at = lines.findIndex(line => line.trim() === `${anchor} {`);
  if (at < 0) throw new Error(`figure not found: ${anchor}`);
  const fields = [];
  for (const line of lines.slice(at + 1)) {
    const item = line.trim();
    if (item === '}') return fields;
    // Blank lines and page breaks (form feed, running header and footer) may fall inside a figure.
    if (!item || item.includes('\f') || /^RFC \d+ /.test(item) || /\[Page \d+\]$/.test(item)) continue;
    const field = item.match(/^(.+?) \(([^)]*)\)(?:\s*=\s*[^,]+)?,?$/);
    if (!field) throw new Error(`unreadable figure line in ${anchor}: ${item}`);
    fields.push({ name: field[1], size: field[2] });
  }
  throw new Error(`figure ${anchor} has no closing brace`);
}

/**
 * RFC 826 lists its packet as "16.bit: (ar$hrd) …" lines rather than a
 * diagram. Returns the Ethernet transmission layer and the ARP packet data,
 * each as [{ size, name }] where size is a bit count or "n"/"m" for the
 * hardware/protocol address lengths.
 */
export function rfc826Layout(text) {
  const start = text.indexOf('Ethernet transmission layer');
  const end = text.indexOf('Packet Generation:');
  if (start < 0 || end < 0) throw new Error('RFC 826 packet format section not found');
  const ethernet = [];
  const arp = [];
  for (const line of text.slice(start, end).split('\n')) {
    const fixed = line.match(/^\s*(\d+)\.bit:\s*(?:\(ar\$(\w+)\))?\s*(.*)$/);
    const sized = line.match(/^\s*([nm])bytes:\s*\(ar\$(\w+)\)/);
    if (fixed && fixed[2]) arp.push({ size: Number(fixed[1]), name: fixed[2] });
    else if (fixed) ethernet.push({ size: Number(fixed[1]), name: fixed[3].trim() });
    else if (sized) arp.push({ size: sized[1], name: sized[2] });
  }
  return { ethernet, arp };
}

/**
 * Field widths stated in prose ("Poll: 8-bit signed integer …") or in ABNF
 * comments ("; 32 bits in length", RFC 6455). Each phrase must occur in the
 * RFC text, whitespace-normalised, and carry its width.
 * Used where the RFC's own diagram row is drawn off the bit grid.
 */
export function proseWidths(text, phrases) {
  const flat = text.replace(/\s+/g, ' ');
  return phrases.map(phrase => {
    if (!flat.includes(phrase)) throw new Error(`phrase not found in RFC text: ${phrase}`);
    const width = phrase.match(/(\d+)-bit\b|(\d+) bits in length\b/);
    if (!width) throw new Error(`phrase states no N-bit width: ${phrase}`);
    return Number(width[1] ?? width[2]);
  });
}

/**
 * RFC 2131 Table 1 style field list ("chaddr       16  Client hardware …"):
 * a FIELD / OCTETS table that follows `anchor`, ending at its "Table N:"
 * caption. Returns [{ name, size }] with size in bits, or "var".
 */
export function octetTable(text, anchor) {
  const start = text.indexOf(anchor);
  if (start < 0) throw new Error(`table anchor not found: ${anchor}`);
  const rows = [];
  for (const line of text.slice(start).split('\n').slice(1)) {
    if (/^\s*Table \d+:/.test(line)) return rows;
    const row = line.match(/^\s{1,6}([a-z]\w*)\s+(\d+|var)\s{2}/);
    if (row) rows.push({ name: row[1], size: row[2] === 'var' ? 'var' : Number(row[2]) * 8 });
  }
  throw new Error(`table after ${anchor} has no "Table N:" caption`);
}

/**
 * Members of a TLS presentation-language structure (RFC 9846 §3): the lines between
 * `struct {` and `} name;`. Sizes are bits, or "var" for vectors whose length is
 * another field ("opaque fragment[TLSPlaintext.length]"). A member type may be a
 * uintN, a `uintN Type;` alias, or an enumerated type whose largest value (in
 * parentheses) sets its width in whole octets (RFC 9846 §3.5).
 */
export function presentationStruct(text, name) {
  const lines = text.split('\n');
  const end = lines.findIndex(line => line.trim() === `} ${name};`);
  if (end < 0) throw new Error(`struct not found: ${name}`);
  let start = end;
  while (start > 0 && lines[start].trim() !== 'struct {') start -= 1;
  const uint = type => type.match(/^uint(\d+)$/)?.[1];
  const typeBits = type => {
    if (uint(type)) return Number(uint(type));
    if (type === 'opaque') return 8;
    const alias = text.match(new RegExp(`^\\s*(uint\\d+) ${type};`, 'm'));
    if (alias) return Number(uint(alias[1]));
    const enumEnd = lines.findIndex(line => line.trim() === `} ${type};`);
    if (enumEnd > 0) {
      const max = lines.slice(Math.max(0, enumEnd - 40), enumEnd).join('\n').match(/\((\d+)\)\s*$/);
      if (max) return 8 * Math.ceil(Math.log2(Number(max[1]) + 1) / 8);
    }
    throw new Error(`${name}: unknown type ${type}`);
  };
  return lines.slice(start + 1, end).map(line => line.replace(/\/\*.*?\*\//g, '').trim()).filter(Boolean).map(line => {
    const member = line.match(/^(\w+) (\w+)(?:\[([^\]]+)\])?(?:\s*=\s*[^;]+)?;$/);
    if (!member) throw new Error(`${name}: unreadable member ${line}`);
    const [, type, field, length] = member;
    const size = length === undefined ? typeBits(type) : /^\d+$/.test(length) ? typeBits(type) * Number(length) : 'var';
    return { name: field, size };
  });
}

/**
 * The SSH binary packet as RFC 4253 §6 lists it ("uint32    packet_length",
 * "byte[n1]  payload; …"), read from the lines after `anchor`. Sizes are bits,
 * or "var" for byte[n] fields whose length is computed.
 */
export function sshPacket(text, anchor) {
  const lines = text.split('\n');
  const at = lines.findIndex(line => line.includes(anchor));
  if (at < 0) throw new Error(`anchor not found: ${anchor}`);
  const fields = [];
  for (const line of lines.slice(at + 1)) {
    const item = line.match(/^\s+(uint32|uint64|byte|boolean)(\[(\w+)\])?\s+(.+?)(?:;.*)?$/);
    if (!item) { if (fields.length) break; continue; }
    const [, type, , count, field] = item;
    const bits = { uint32: 32, uint64: 64, byte: 8, boolean: 8 }[type];
    fields.push({ name: field.trim(), size: count === undefined ? bits : /^\d+$/.test(count) ? bits * Number(count) : 'var' });
  }
  return fields;
}
