// SPDX-License-Identifier: GPL-3.0-or-later
// @ts-check
import { FD_LENGTHS } from './can-model.mjs';

export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_LINES = 100_000;

/** @typedef {'classical' | 'remote' | 'fd' | 'error'} Kind */
/** @typedef {'standard' | 'extended'} IdFormat */
/** @typedef {{
 *   kind: Kind, id: string, format: IdFormat | null, payload: string,
 *   dlc: number | null, dlcEvidence: 'explicit' | 'inferred' | 'unavailable',
 *   fdFlags: number | null, errorMask: number | null,
 *   direction: 'TX' | 'RX' | null
 * }} Frame */
/** @typedef {Frame & {line: number, iface: string, timestamp: string | null, timeNs: bigint | null}} Record */

const hex = /^[0-9a-f]+$/i;
const payloadPattern = /^(?:(?:[a-f0-9]{2})+|[a-f0-9]{2}(?:\.[a-f0-9]{2})+)?$/i;
const byTime = (/** @type {bigint} */ a, /** @type {bigint} */ b) => a < b ? -1 : a > b ? 1 : 0;

/** @param {string} id @param {Kind} kind @param {string} payload @param {number | null} dlc
 * @param {Frame['dlcEvidence']} dlcEvidence @param {number | null} fdFlags
 * @param {Frame['direction']} direction */
function frame(id, kind, payload, dlc, dlcEvidence, fdFlags, direction) {
  const number = Number.parseInt(id, 16);
  const isError = id.length === 8 && number >= 0x20000000 && number <= 0x3FFFFFFF;
  if (isError) {
    if (kind !== 'classical' || payload.length !== 16) throw Error('Invalid SocketCAN error message frame');
    return { kind: /** @type {const} */ ('error'), id: id.toUpperCase(), format: null, payload, dlc: null,
      dlcEvidence: /** @type {const} */ ('unavailable'), fdFlags: null, errorMask: number - 0x20000000, direction };
  }
  if (number > (id.length === 3 ? 0x7FF : 0x1FFFFFFF)) throw Error('CAN identifier exceeds the selected format');
  return { kind, id: id.toUpperCase(), format: id.length === 3 ? /** @type {const} */ ('standard') : /** @type {const} */ ('extended'),
    payload, dlc, dlcEvidence, fdFlags, errorMask: null, direction };
}

/** @param {string} input @returns {Frame} */
function parseFrame(input) {
  const compact = /^(\w+)#(\S*)(?:\s+([RT]))?$/i.exec(input);
  if (compact) {
    const [, id, data, extra] = compact;
    if (id.length === 5 && data.includes(':')) throw Error('CAN XL is outside the supported formats');
    if (![3, 8].includes(id.length) || !hex.test(id)) throw Error('Expected a 3- or 8-digit hexadecimal CAN identifier');
    const direction = extra ? (extra.toUpperCase() === 'T' ? 'TX' : 'RX') : null;
    const remote = /^R([0-8])?(?:_([9a-f]))?$/i.exec(data);
    if (remote) {
      const [, requested, raw] = remote;
      if (raw && requested !== '8') throw Error('Classical raw DLC above 8 requires a length of 8');
      return frame(id, 'remote', '', raw ? Number.parseInt(raw, 16) : Number(requested ?? 0), 'explicit', null, direction);
    }
    if (data.startsWith('#')) {
      const match = /^#([0-9a-f])\.?(.*)$/i.exec(data);
      if (!match || !payloadPattern.test(match[2]) || data.endsWith('.')) throw Error('Invalid CAN FD flags or payload');
      const payload = match[2].replaceAll('.', '').toUpperCase();
      const dlc = FD_LENGTHS.indexOf(payload.length / 2);
      if (dlc < 0) throw Error('Payload length has no CAN FD DLC encoding');
      return frame(id, 'fd', payload, dlc, 'inferred', Number.parseInt(match[1], 16), direction);
    }
    const [bytes, raw, extraDlc] = data.split('_');
    if (!payloadPattern.test(bytes) || bytes.replaceAll('.', '').length > 16) throw Error('Invalid Classical CAN payload');
    const payload = bytes.replaceAll('.', '').toUpperCase();
    if (raw !== undefined && (!/^[9a-f]$/i.test(raw) || extraDlc !== undefined || payload.length !== 16)) {
      throw Error('Classical raw DLC 9–F requires exactly 8 bytes');
    }
    return frame(id, 'classical', payload, raw === undefined ? payload.length / 2 : Number.parseInt(raw, 16),
      raw === undefined ? 'inferred' : 'explicit', null, direction);
  }

  const display = /^([0-9a-f]{3}|[0-9a-f]{8})\s+(?:\[(\d{1,2})\]|\{([0-9a-f])\})(?:\s+(.*))?$/i.exec(input);
  if (!display) throw Error('Unsupported candump record; use plain output or candump -L');
  const [, id, length, raw, tail = ''] = display;
  const count = raw === undefined ? Number(length) : Math.min(8, Number.parseInt(raw, 16));
  const fd = length?.length === 2;
  if (!fd && count > 8) throw Error('Classical CAN length exceeds 8');
  const dlc = fd ? FD_LENGTHS.indexOf(count) : raw === undefined ? count : Number.parseInt(raw, 16);
  if (dlc < 0) throw Error('Payload length has no CAN FD DLC encoding');
  if (/^remote request$/i.test(tail)) {
    if (fd) throw Error('CAN FD has no remote frames');
    return frame(id, 'remote', '', dlc, raw === undefined ? 'inferred' : 'explicit', null, null);
  }
  const errorSuffix = /\s+ERRORFRAME$/i;
  const bytes = tail.replace(errorSuffix, '');
  const parts = bytes ? bytes.split(/\s+/) : [];
  if (parts.length !== count || parts.some(part => part.length !== 2 || !hex.test(part))) {
    throw Error('Payload does not match the displayed byte count');
  }
  const result = frame(id, fd ? 'fd' : 'classical', parts.join('').toUpperCase(), dlc,
    raw === undefined ? 'inferred' : 'explicit', null, null);
  if (errorSuffix.test(tail) && result.kind !== 'error') throw Error('ERRORFRAME marker without a SocketCAN error identifier');
  return result;
}

/** @param {string} input */
export function parseCapture(input) {
  /** @type {Record[]} */
  const records = [];
  /** @type {{line: number, reason: string, excerpt: string}[]} */
  const issues = [];
  /** @type {{line: number, iface: string, dropped: number, total: number}[]} */
  const dropNotices = [];
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length > MAX_LINES) throw Error('This analyzer accepts up to 100,000 lines per import.');
  for (const [index, content] of lines.entries()) {
    const source = content.trim();
    if (!source || source.startsWith('#')) continue;
    const line = index + 1;
    const notice = /^DROPCOUNT: dropped (\d+) CAN frames? on '([^']+)' socket \(total drops (\d+)\)$/.exec(source);
    if (notice) {
      dropNotices.push({ line, iface: notice[2], dropped: Number(notice[1]), total: Number(notice[3]) });
      continue;
    }
    try {
      const match = /^(?:\(([^)]+)\)\s+)?([^\s()]+)\s+(.+)$/.exec(source);
      if (!match) throw Error('Expected optional numeric timestamp, interface and CAN frame');
      const [, timestamp, iface, inputFrame] = match;
      const clock = timestamp === undefined ? null : /^(\d{1,12})(?:\.(\d{1,9}))?$/.exec(timestamp);
      if (timestamp !== undefined && !clock) throw Error('Timestamp must be seconds with up to nine fractional digits');
      const timeNs = clock ? BigInt(clock[1]) * 1_000_000_000n + BigInt((clock[2] ?? '').padEnd(9, '0')) : null;
      records.push({ line, iface, timestamp: timestamp ?? null, timeNs, ...parseFrame(inputFrame) });
    } catch (error) {
      issues.push({ line, reason: error instanceof Error ? error.message : String(error), excerpt: source.slice(0, 140) });
    }
  }
  return { records, issues, dropNotices };
}

/** @param {number[]} intervalsMs */
export function intervalStats(intervalsMs) {
  if (!intervalsMs.length) return null;
  const sorted = intervalsMs.slice().sort((a, b) => a - b);
  const count = sorted.length;
  const percentile = (/** @type {number} */ fraction) => sorted[Math.ceil(fraction * count) - 1];
  return {
    count,
    mean: sorted.reduce((total, value) => total + value, 0) / count,
    median: (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2,
    min: sorted[0],
    max: sorted[count - 1],
    p95: percentile(0.95),
    p99: percentile(0.99),
  };
}

/** @param {Record[]} records */
export function analyzeCapture(records) {
  /** @type {Map<string, {iface: string, id: string, kind: Kind, format: IdFormat | null,
   * count: number, outOfOrder: number, times: bigint[]}>} */
  const streams = new Map();
  let missing = 0;
  let errors = 0;
  let start;
  let end;
  for (const record of records) {
    const { iface, id, kind, format, timeNs } = record;
    if (timeNs === null) missing++;
    else {
      if (start === undefined || timeNs < start) start = timeNs;
      if (end === undefined || timeNs > end) end = timeNs;
    }
    if (kind === 'error') {
      errors++;
      continue;
    }
    const key = JSON.stringify([iface, id, kind]);
    let stream = streams.get(key);
    if (!stream) {
      stream = { iface, id, kind, format, count: 0, outOfOrder: 0, times: [] };
      streams.set(key, stream);
    }
    stream.count++;
    if (timeNs !== null) {
      const previous = stream.times.at(-1);
      if (previous !== undefined && timeNs < previous) stream.outOfOrder++;
      stream.times.push(timeNs);
    }
  }

  const groups = [...streams.values()].map(({ times, ...stream }) => {
    if (stream.outOfOrder) times.sort(byTime);
    const intervalsMs = times.slice(1).map((time, index) => Number(time - times[index]) / 1e6);
    const elapsedNs = times.length ? times[times.length - 1] - times[0] : 0n;
    return { ...stream, timed: times.length, intervalsMs, stats: intervalStats(intervalsMs),
      ties: intervalsMs.filter(value => value === 0).length,
      rateHz: elapsedNs > 0n ? (times.length - 1) * 1e9 / Number(elapsedNs) : null };
  }).sort((a, b) => b.count - a.count || a.iface.localeCompare(b.iface) || a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind));

  const durationNs = start === undefined || end === undefined ? 0n : end - start;
  const bins = Array.from({ length: durationNs > 0n ? 24 : start === undefined ? 0 : 1 },
    () => ({ messages: 0, errors: 0 }));
  if (start !== undefined) {
    for (const record of records) {
      if (record.timeNs === null) continue;
      const index = durationNs === 0n ? 0 : Math.min(bins.length - 1, Number((record.timeNs - start) * BigInt(bins.length) / durationNs));
      bins[index][record.kind === 'error' ? 'errors' : 'messages']++;
    }
  }
  return { groups, startNs: start?.toString() ?? null, durationMs: Number(durationNs) / 1e6, bins, missing, errors };
}

/** @param {number} flags */
export function fdFlagLabels(flags) {
  return [flags & 1 ? 'BRS' : '', flags & 2 ? 'ESI' : '', flags & 4 ? 'FDF marker' : '',
    flags & 8 ? 'unknown 0x8 flag' : ''].filter(Boolean);
}

/** @param {number} mask */
export function errorClassLabels(mask) {
  const names = ['TX timeout', 'Arbitration lost', 'Controller', 'Protocol', 'Transceiver',
    'ACK', 'Bus-off', 'Bus error', 'Restarted', 'Counters'];
  const labels = names.filter((_, bit) => mask & (1 << bit));
  if (mask & ~0x3FF) labels.push('Unknown class bits');
  return labels;
}
