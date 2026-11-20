import { analyzeCapture, errorClassLabels, fdFlagLabels, MAX_BYTES, parseCapture } from './can-log.mjs';

const get = id => document.getElementById('can-' + id);
const names = { classical: 'Classical data', remote: 'Classical remote', fd: 'CAN FD', error: 'SocketCAN error' };
const countLabel = (count, singular, plural = singular + 's') => `${count} ${count === 1 ? singular : plural}`;
const number = value => value == null ? '—' : Number(value.toPrecision(7)).toString();
const groupName = ({ iface, id, kind, format }) => `${iface} / ${id} / ${format} ${names[kind]}`;
const el = (tag, label) => Object.assign(document.createElement(tag), { textContent: label });

function row(values) {
  const result = document.createElement('tr');
  for (const value of values) {
    const cell = result.insertCell();
    cell.append(value instanceof Node ? value : String(value));
  }
  return result;
}

function pager(id, tbody, items, makeRow, columns) {
  const controls = get(id);
  const previous = el('button', 'Previous');
  const next = el('button', 'Next');
  const status = el('span', '');
  status.setAttribute('role', 'status');
  const size = 30;
  let offset = 0;
  for (const button of [previous, next]) {
    button.type = 'button';
    button.className = 'button secondary';
    button.setAttribute('aria-controls', tbody.parentElement.id || tbody.id);
  }
  controls.replaceChildren(previous, status, next);
  controls.hidden = items.length <= size;
  function draw() {
    const rows = items.slice(offset, offset + size).map(makeRow);
    if (!rows.length) {
      rows.push(row(['No matching records.']));
      rows[0].cells[0].colSpan = columns;
    }
    tbody.replaceChildren(...rows);
    previous.disabled = offset === 0;
    next.disabled = offset + size >= items.length;
    status.textContent = `${offset + 1}–${Math.min(offset + size, items.length)} of ${items.length}`;
  }
  previous.onclick = () => { offset -= size; draw(); if (previous.disabled) next.focus(); };
  next.onclick = () => { offset += size; draw(); if (next.disabled) previous.focus(); };
  draw();
}

const width = 720;
const height = 160;
const gutter = 12;
const x = fraction => gutter + fraction * (width - 2 * gutter);

function shape(name, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [attribute, value] of Object.entries(attributes)) node.setAttribute(attribute, value);
  return node;
}

function chart(container, label, caption) {
  const svg = shape('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label });
  const figure = document.createElement('figure');
  figure.append(svg, el('figcaption', caption));
  container.replaceChildren(figure);
  return svg;
}

function renderTimeline({ bins, durationMs, startNs }) {
  const box = get('timeline');
  box.replaceChildren();
  get('timeline-details').hidden = !bins.length;
  if (!bins.length) {
    get('timeline-text').textContent = 'No matching records have timestamps.';
    return;
  }
  const max = Math.max(...bins.map(bin => bin.messages + bin.errors));
  const span = durationMs / bins.length;
  const origin = BigInt(startNs);
  const firstTimestamp = `${origin / 1_000_000_000n}.${String(origin % 1_000_000_000n).padStart(9, '0')}`;
  const description = `${bins.length} ${durationMs ? 'equal-width bins' : 'bin for a shared timestamp'}. Peak ${max} records per bin. See the table for counts.`;
  get('timeline-text').textContent = `${number(durationMs)} ms from the first timestamp (${firstTimestamp} s). Blue shows messages. Orange shows SocketCAN errors.`;
  const svg = chart(box, description, `Elapsed time from first matching timestamp (0–${number(durationMs)} ms). Vertical scale 0–${max} records per bin.`);
  const barWidth = (width - 2 * gutter) / bins.length;
  const scale = (height - gutter * 2) / max;
  bins.forEach((bin, index) => {
    const left = x(index / bins.length);
    const messagesHeight = bin.messages * scale;
    const errorsHeight = bin.errors * scale;
    for (const [kind, size, bottom] of [
      ['messages', messagesHeight, height - gutter],
      ['errors', errorsHeight, height - gutter - messagesHeight],
    ]) {
      if (size) svg.append(shape('rect', { x: left, y: bottom - size, width: barWidth - 2, height: size, class: `bus-bar-${kind}` }));
    }
  });
  svg.append(shape('line', { x1: gutter, x2: width - gutter, y1: height - gutter, y2: height - gutter, class: 'bus-axis' }));
  get('bins').replaceChildren(...bins.map((bin, index) => row([number(index * span), bin.messages, bin.errors])));
}

function renderJitter(group) {
  const box = get('jitter');
  box.replaceChildren();
  if (!group?.stats) {
    get('jitter-text').textContent = 'At least two timestamped records in one message stream are needed.';
    return;
  }
  const { median, min, max, count } = group.stats;
  const low = min - median;
  const high = max - median;
  const range = Math.max(Math.abs(low), Math.abs(high)) || 1;
  const delta = value => height / 2 - value / range * (height / 2 - gutter);
  const description = `${groupName(group)}. ${count} intervals, median ${number(median)} ms, deviation ${number(low)} to ${number(high)} ms.`;
  get('jitter-text').textContent = description;
  const svg = chart(box, description, 'Interval sequence → · Vertical position shows the difference from the stream median. Each mark spans the minimum and maximum within its plot bucket.');
  svg.append(shape('line', { x1: gutter, x2: width - gutter, y1: delta(0), y2: delta(0), class: 'bus-axis' }));
  const step = Math.ceil(count / 160);
  for (let index = 0; index < count; index += step) {
    const values = group.intervalsMs.slice(index, index + step);
    const cx = x((index + (values.length - 1) / 2) / (count - 1 || 1));
    const y1 = delta(Math.max(...values) - median);
    const y2 = delta(Math.min(...values) - median);
    if (y1 === y2) svg.append(shape('circle', { cx, cy: y1, r: 2.5, class: 'bus-jitter-mark' }));
    else svg.append(shape('line', { x1: cx, x2: cx, y1, y2, class: 'bus-jitter-mark' }));
  }
}

let capture;
let selected;
let request = 0;

function renderDiagnostics() {
  const diagnostics = [
    ...capture.issues.map(({ line, reason, excerpt }) => ({ line, message: `${reason} · ${excerpt}` })),
    ...capture.dropNotices.map(({ line, iface, dropped, total }) => ({
      line, message: `candump reported ${dropped} socket drop(s) on ${iface} (${total} cumulative).`,
    })),
  ].sort((a, b) => a.line - b.line);
  get('import-details').hidden = !diagnostics.length;
  get('diagnostics').replaceChildren(...diagnostics.slice(0, 40).map(({ line, message }) => el('li', `Line ${line} · ${message}`)));
  get('diagnostics-limit').textContent = diagnostics.length > 40 ? 'Showing the first 40 diagnostics. Export JSON to see all diagnostics.' : '';
}

function renderAnalysis() {
  const iface = get('interface').value;
  const id = get('id').value.trim().replace(/^0x/i, '').toUpperCase();
  const idNumber = Number.parseInt(id, 16);
  const records = capture.records.filter(record => (!iface || record.iface === iface) &&
    (!id || (record.kind !== 'error' && ([3, 8].includes(id.length) ? record.id === id : Number.parseInt(record.id, 16) === idNumber))));
  const analysis = analyzeCapture(records);
  selected = { records, analysis, filters: { iface, id } };
  const { groups, missing, errors } = analysis;
  const backwards = groups.reduce((sum, group) => sum + group.outOfOrder, 0);
  get('summary').textContent = `${records.length} of ${capture.records.length} records · ${countLabel(groups.length, 'message stream')} · ${countLabel(errors, 'error record')} · ${missing} untimed · ${countLabel(backwards, 'timestamp reversal')} within streams.`;
  renderTimeline(analysis);
  renderJitter(groups.find(group => group.stats));

  pager('stream-pager', get('streams'), groups, group => {
    const { iface: name, id: identifier, kind, format, count, timed, rateHz, stats, outOfOrder, ties } = group;
    const plot = el('button', 'Plot');
    plot.type = 'button';
    plot.className = 'button secondary';
    plot.setAttribute('aria-label', `Plot jitter for ${groupName(group)}`);
    plot.setAttribute('aria-controls', 'can-jitter');
    plot.onclick = () => {
      renderJitter(group);
      const heading = get('jitter-title');
      heading.tabIndex = -1;
      heading.focus();
    };
    return row([name, identifier, `${format} ${names[kind]}`, count, timed, number(rateHz),
      ...['mean', 'median', 'min', 'max', 'p95', 'p99'].map(metric => number(stats?.[metric])),
      outOfOrder, ties, stats ? plot : '—']);
  }, 15);

  pager('record-pager', get('records'), records, record => {
    const { line, iface: name, id: identifier, timestamp, kind, format, dlc, dlcEvidence, payload, fdFlags, errorMask, direction } = record;
    const details = [direction, dlcEvidence === 'inferred' ? 'Inferred DLC' : null];
    if (fdFlags !== null) details.push(`0x${fdFlags.toString(16)}`, ...fdFlagLabels(fdFlags));
    if (kind === 'fd' && fdFlags === null) details.push('Flags unavailable');
    if (errorMask !== null) details.push(...errorClassLabels(errorMask));
    const bytes = el('code', payload.match(/../g)?.join(' ') ?? '—');
    return row([line, timestamp ?? '—', name, el('code', identifier), `${format ? `${format} ` : ''}${names[kind]}`,
      dlc ?? '—', payload.length / 2, bytes, details.filter(Boolean).join(' · ') || '—']);
  }, 9);
}

async function importCapture(read, name) {
  const current = ++request;
  get('analysis').hidden = true;
  get('import-status').textContent = 'Reading capture…';
  try {
    const input = await read();
    if (current !== request) return;
    capture = parseCapture(input);
    capture.name = name;
    const interfaces = [...new Set(capture.records.map(record => record.iface))].sort();
    const options = document.createDocumentFragment();
    options.append(new Option('All interfaces', ''));
    for (const value of interfaces) options.append(new Option(value, value));
    get('interface').replaceChildren(options);
    get('id').value = '';
    renderDiagnostics();
    renderAnalysis();
    get('analysis').hidden = false;
    get('import-status').textContent = `${name} · ${capture.records.length} parsed · ${capture.issues.length} rejected · ${capture.dropNotices.length} socket-drop notices.`;
  } catch (error) {
    if (current === request) get('import-status').textContent = error.message;
  }
}

get('file').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  get('sample').selectedIndex = 0;
  get('load').disabled = true;
  importCapture(() => {
    if (file.size > MAX_BYTES) throw Error('This analyzer accepts files up to 10 MiB.');
    return file.text();
  }, file.name);
  event.target.value = '';
});

get('sample').addEventListener('change', () => { get('load').disabled = !get('sample').value; });
get('load').addEventListener('click', () => {
  const path = get('sample').value;
  importCapture(async () => {
    const response = await fetch(path);
    if (!response.ok) throw Error('The sample could not be loaded. Try again or choose a local file.');
    return response.text();
  }, path.split('/').at(-1) + ' (synthetic)');
});
get('interface').addEventListener('change', () => {
  if (get('id').checkValidity()) renderAnalysis();
  else get('id').reportValidity();
});
get('filter').addEventListener('submit', event => {
  event.preventDefault();
  renderAnalysis();
});
get('export').addEventListener('click', () => {
  const output = {
    schemaVersion: 1,
    source: capture.name,
    ...selected,
    importDiagnostics: { issues: capture.issues, dropNotices: capture.dropNotices },
  };
  const data = JSON.stringify(output, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'can-analysis.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
