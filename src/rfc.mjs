// Reads header layouts out of RFC plain text, so the field widths published on
// the site can be checked against the document they cite.

const isSeparator = line => /^\s*\+[-+]{6,}/.test(line);
const isContinuation = line => /^\s*\+\s/.test(line);
const isContent = line => /^\s*[|:]/.test(line);

/**
 * Field widths, in bits, of the ASCII header diagram that contains `anchor`.
 * `rowBits` is how many bits one full diagram row stands for (32 in most RFCs,
 * 16 in RFC 1035). A field drawn over several rows joined by "+   +" lines
 * counts as one field of rows × rowBits.
 */
export function diagramWidths(text, anchor, rowBits = 32, { fromAnchor = false } = {}) {
  const lines = text.split('\n');
  const at = lines.findIndex(line => line.includes(anchor));
  if (at < 0) throw new Error(`diagram anchor not found: ${anchor}`);
  // Walk up to the first ruler of the diagram the anchor sits in, or, with
  // fromAnchor, start at the ruler directly above the anchor row.
  let start = at;
  if (fromAnchor) start = at - 1;
  else while (start > 0 && (isSeparator(lines[start - 1]) || isContent(lines[start - 1]) || isContinuation(lines[start - 1]))) start -= 1;
  if (!isSeparator(lines[start])) throw new Error(`no diagram ruler above anchor: ${anchor}`);
  const ruler = lines[start].trim();
  const rowChars = ruler.length - 1;
  const widths = [];
  let block = [];
  const flush = () => {
    const content = block.filter(isContent);
    if (!content.length) { block = []; return; }
    if (block.some(isContinuation)) {
      widths.push(content.length * rowBits);
    } else {
      const first = content[0].trim();
      const cells = first.split(/[|:]/).slice(1, -1);
      // A row cut short ("| Data ...") is trailing payload, not a fixed field.
      if (first.length === ruler.length) {
        for (const cell of cells) widths.push((cell.length + 1) * rowBits / rowChars);
      }
    }
    block = [];
  };
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (isSeparator(line)) { flush(); if (line.trim().length < ruler.length) break; continue; }
    if (!isContent(line) && !isContinuation(line)) break;
    block.push(line);
  }
  flush();
  if (widths.some(width => !Number.isInteger(width))) throw new Error(`diagram does not divide into whole bits: ${anchor}`);
  return widths;
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
 * Field widths stated in prose ("Poll: 8-bit signed integer …"). Each phrase
 * must occur in the RFC text, whitespace-normalised, and carry an "N-bit".
 * Used where the RFC's own diagram row is drawn off the bit grid.
 */
export function proseWidths(text, phrases) {
  const flat = text.replace(/\s+/g, ' ');
  return phrases.map(phrase => {
    if (!flat.includes(phrase)) throw new Error(`phrase not found in RFC text: ${phrase}`);
    const width = phrase.match(/(\d+)-bit\b/);
    if (!width) throw new Error(`phrase states no N-bit width: ${phrase}`);
    return Number(width[1]);
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
