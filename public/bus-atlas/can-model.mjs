// SPDX-License-Identifier: GPL-3.0-or-later
// @ts-check
export const FD_LENGTHS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64]);

/** @param {string | number} input @param {number} width */
export function parseIdentifier(input, width) {
  const raw = String(input).trim();
  if (![11, 29].includes(width)) throw new Error('Select an 11-bit or 29-bit identifier.');
  if (!/^(?:0x[\da-f]+|0b[01]+|\d+)$/i.test(raw)) {
    throw new Error('Enter an identifier as decimal, 0x hexadecimal, or 0b binary.');
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id >= 2 ** width) {
    throw new Error(`Identifier must fit in ${width} bits.`);
  }
  const bits = id.toString(2).padStart(width, '0');
  return {
    id,
    width,
    hex: `0x${id.toString(16).toUpperCase().padStart(width === 11 ? 3 : 8, '0')}`,
    bits,
    base: bits.slice(0, 11),
    extension: bits.slice(11),
  };
}

/** @typedef {{id: string | number, width: number, type: string}} Contender */

/** @param {Contender & {dlc: number, brs?: boolean, esi?: boolean}} options */
export function frameFields({ id, width, type, dlc, brs = false, esi = false }) {
  const identifier = parseIdentifier(id, width);
  const fd = type === 'fd';
  const remote = type === 'remote';
  if (!['data', 'remote', 'fd'].includes(type)) throw new Error('Select a frame type.');
  if (!Number.isInteger(dlc) || dlc < 0 || dlc > 15) throw new Error('DLC must be between 0 and 15.');
  if (!fd && (brs || esi)) throw new Error('BRS and ESI apply to CAN FD frames.');
  const bytes = fd ? FD_LENGTHS[dlc] : Math.min(dlc, 8);
  /** @type {{name: string, value: string, purpose: string}[]} */
  const fields = [];
  /** @param {string} name @param {string} value @param {string} purpose */
  const put = (name, value, purpose) => fields.push({ name, value, purpose });
  put('SOF', '0', 'Start of frame');
  put('Base identifier', identifier.base, 'First 11 identifier bits, sent most significant bit first');
  if (width === 29) {
    put('SRR', '1', fd ? 'Substitute remote request, shown with its recessive transmit value' : 'Substitute remote request');
    put('IDE', '1', 'Extended identifier');
    put('Identifier extension', identifier.extension, 'Remaining 18 identifier bits');
  }
  put(fd ? 'RRS' : 'RTR', remote ? '1' : '0', fd ? 'Remote request substitution' : 'Remote transmission request');
  if (width === 11) put('IDE', '0', 'Base identifier');
  if (fd) {
    put('FDF', '1', 'Identifies CAN FD');
    put('res', '0', 'Reserved');
    put('BRS', brs ? '1' : '0', brs ? 'Switch to data timing at this bit’s sample point' : 'Use nominal timing throughout');
    put('ESI', esi ? '1' : '0', esi ? 'Recessive error state indicator' : 'Dominant error state indicator');
  } else {
    if (width === 29) put('r1', '0', 'Reserved');
    put('r0', '0', 'Reserved');
  }
  put('DLC', dlc.toString(2).padStart(4, '0'), remote ? `Requests ${bytes} bytes` : `Encodes ${bytes} bytes`);
  if (!remote && bytes) put('Data', `${8 * bytes} bits`, `${bytes} payload bytes`);
  if (fd) put('Stuff count and parity', '4 bits', 'Gray-coded count modulo 8, followed by even parity');
  const crcBits = fd ? (bytes <= 16 ? 17 : 21) : 15;
  put('CRC sequence', `${crcBits} bits`, 'Frame check sequence');
  if (fd) put('CRC fixed stuff bits', `${crcBits === 17 ? 6 : 7} bits`, 'Interleaved in the CRC field, beginning before stuff count and continuing after each four bits');
  put('CRC delimiter', '1', fd && brs ? 'Return to nominal timing at this bit’s sample point' : 'Recessive separator');
  put('ACK slot', '1 → 0', 'The transmitter sends recessive. A receiving node that accepts the frame may drive dominant.');
  put('ACK delimiter', '1', 'Recessive separator');
  put('EOF', '1111111', 'End of frame');
  put('Intermission', '111', 'Minimum intermission following the frame');
  return { fields, bytes, crcBits };
}

/** @param {Contender} contender */
function arbitrationBits({ id, width, type }) {
  const { base, extension } = parseIdentifier(id, width);
  if (!['data', 'remote', 'fd'].includes(type)) throw new Error('Select a frame type.');
  const request = { label: type === 'fd' ? 'RRS' : 'RTR', value: type === 'remote' ? '1' : '0' };
  /** @param {string} bits @param {string} label */
  const idBits = (bits, label) => [...bits].map((value, i) => ({ label: `${label}[${bits.length - i - 1}]`, value }));
  const leading = idBits(base, 'Base ID');
  if (width === 11) return [...leading, request, { label: 'IDE', value: '0' }];
  return [...leading, { label: 'SRR', value: '1' }, { label: 'IDE', value: '1' }, ...idBits(extension, 'Extension ID'), request];
}

/** @param {Contender} a @param {Contender} b */
export function arbitrate(a, b) {
  const aBits = arbitrationBits(a);
  const bBits = arbitrationBits(b);
  const trace = [];
  for (let index = 0; index < Math.min(aBits.length, bBits.length); index++) {
    const left = aBits[index];
    const right = bBits[index];
    const label = left.label === right.label ? left.label : `${left.label} / ${right.label}`;
    const bus = left.value === '0' || right.value === '0' ? '0' : '1';
    trace.push({ label, a: left.value, b: right.value, bus });
    if (left.value !== right.value) return { winner: left.value === '0' ? 'A' : 'B', label, trace };
  }
  return { winner: null, trace };
}

/** @param {{clock: number, bitrate: number, targetSample: number, sjw: number, sjwMax: number,
 *   brpMin: number, brpMax: number, brpStep: number, tseg1Min: number, tseg1Max: number,
 *   tseg2Min: number, tseg2Max: number}} input */
export function solveBitTiming(input) {
  const { clock, bitrate, targetSample, sjw, sjwMax, brpMin, brpMax, brpStep, tseg1Min, tseg1Max, tseg2Min, tseg2Max } = input;
  /** @param {number} n @param {number} max */
  const positiveInteger = (n, max) => Number.isInteger(n) && n > 0 && n <= max;
  if (!positiveInteger(clock, 1e9) || !positiveInteger(bitrate, 1e9)) throw new Error('Clock and bitrate must be positive whole numbers, up to 1,000,000,000.');
  if (!(targetSample > 0 && targetSample < 100)) throw new Error('Sample point must be greater than 0% and less than 100%.');
  if (![brpMin, brpMax, brpStep].every(n => positiveInteger(n, 65536)) || brpMin > brpMax) throw new Error('Enter ordered prescaler bounds and a positive increment, up to 65,536.');
  if (![tseg1Min, tseg1Max, tseg2Min, tseg2Max, sjw, sjwMax].every(n => positiveInteger(n, 1024)) || tseg1Min > tseg1Max || tseg2Min > tseg2Max) throw new Error('Enter ordered segment bounds and positive SJW values, up to 1,024 tq.');

  const maxOffset = Math.floor((brpMax - brpMin) / brpStep);
  const minSeg1 = Math.max(tseg1Min, sjw);
  const minSeg2 = Math.max(tseg2Min, sjw);
  if (sjw > sjwMax || minSeg1 > tseg1Max || minSeg2 > tseg2Max) return [];
  const candidates = [];
  for (let total = 1 + minSeg1 + minSeg2; total <= 1 + tseg1Max + tseg2Max; total++) {
    const idealBrpOffset = (clock / (bitrate * total) - brpMin) / brpStep;
    const offsets = new Set([Math.floor(idealBrpOffset), Math.ceil(idealBrpOffset)].map(n => Math.max(0, Math.min(maxOffset, n))));
    const lowestSeg1 = Math.max(minSeg1, total - 1 - tseg2Max);
    const highestSeg1 = Math.min(tseg1Max, total - 1 - minSeg2);
    const idealSeg1 = total * targetSample / 100 - 1;
    const segments = new Set([Math.floor(idealSeg1), Math.ceil(idealSeg1)].map(n => Math.max(lowestSeg1, Math.min(highestSeg1, n))));
    for (const offset of offsets) {
      const brp = brpMin + offset * brpStep;
      const actualBitrate = clock / (brp * total);
      for (const tseg1 of segments) {
        const sample = (1 + tseg1) * 100 / total;
        candidates.push({ brp, tqNs: brp * 1e9 / clock, total, tseg1, tseg2: total - 1 - tseg1, sjw, actualBitrate, sample, bitrateError: 100 * (actualBitrate / bitrate - 1), sampleError: sample - targetSample });
      }
    }
  }
  return candidates.sort((a, b) => Math.abs(a.bitrateError) - Math.abs(b.bitrateError) || Math.abs(a.sampleError) - Math.abs(b.sampleError) || b.total - a.total || a.brp - b.brp || a.tseg1 - b.tseg1).slice(0, 8);
}
