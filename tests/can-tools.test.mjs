import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FD_LENGTHS, arbitrate, frameFields, parseIdentifier, solveBitTiming } from '../public/bus-atlas/can-model.mjs';

const timing = {
  clock: 80_000_000, bitrate: 500_000, targetSample: 87.5, sjw: 1, sjwMax: 16,
  brpMin: 1, brpMax: 512, brpStep: 1, tseg1Min: 2, tseg1Max: 64, tseg2Min: 2, tseg2Max: 16,
};
const frame = (id, width = 11, type = 'data') => ({ id, width, type });

test('identifier width is explicit and input has strict radix and range checks', () => {
  assert.equal(parseIdentifier('0b111', 29).hex, '0x00000007');
  assert.equal(parseIdentifier('0x048c0001', 29).base, parseIdentifier('0x123', 11).bits);
  assert.equal(parseIdentifier('2047', 11).id, 2047);
  for (const invalid of ['', '-1', '0x', '1e3', '0b2', '2048', '0x20000000']) {
    assert.throws(() => parseIdentifier(invalid, 11));
  }
});

test('arbitration handles identifier comparison, data vs remote, SRR and IDE', () => {
  assert.equal(arbitrate(frame('0x123'), frame('0x127')).winner, 'A');
  assert.equal(arbitrate(frame('0x123', 11, 'remote'), frame('0x123')).label, 'RTR');
  assert.equal(arbitrate(frame('0x123'), frame('0x048c0001', 29)).label, 'RTR / SRR');
  assert.equal(arbitrate(frame('0x123', 11, 'remote'), frame('0x048c0001', 29)).label, 'IDE');
  assert.equal(arbitrate(frame('0x123', 11, 'fd'), frame('0x123')).winner, null);
  assert.equal(arbitrate(frame('0x048c0002', 29), frame('0x048c0001', 29)).winner, 'B');
});

test('Classical remote requests have no data and FD models ISO fields across the CRC boundary', () => {
  const remote = frameFields({ ...frame('0x123', 11, 'remote'), dlc: 8 });
  assert.equal(remote.crcBits, 15);
  assert.equal(remote.fields.some(field => field.name === 'Data'), false);
  assert.equal(frameFields({ ...frame('0x123'), dlc: 15 }).bytes, 8);
  for (const [dlc, length] of FD_LENGTHS.entries()) {
    const result = frameFields({ ...frame('1', 29, 'fd'), dlc, brs: true });
    assert.equal(result.bytes, length);
    assert.equal(result.crcBits, dlc <= 10 ? 17 : 21);
    assert.equal(result.fields.find(field => field.name === 'RRS').value, '0');
    assert.equal(result.fields.find(field => field.name === 'Stuff count and parity').value, '4 bits');
  }
});

test('timing finds exact rates, applies prescaler increments and reports approximate configurations', () => {
  const [nominal] = solveBitTiming(timing);
  assert.equal(nominal.actualBitrate, 500_000);
  assert.equal(nominal.sample, 87.5);
  const [data] = solveBitTiming({ ...timing, bitrate: 4_000_000, targetSample: 80 });
  assert.equal(data.actualBitrate, 4_000_000);
  assert.equal(data.sample, 80);
  const candidates = solveBitTiming({ ...timing, bitrate: 503_123, brpMin: 2, brpStep: 3, sjw: 5 });
  assert.ok(candidates.length);
  assert.ok(candidates.every(candidate => candidate.bitrateError && (candidate.brp - 2) % 3 === 0 && candidate.tseg2 >= 5));
  assert.deepEqual(solveBitTiming({ ...timing, sjw: 17 }), []);
  assert.deepEqual(solveBitTiming({ ...timing, sjw: 5, sjwMax: 4 }), []);
  assert.throws(() => solveBitTiming({ ...timing, brpStep: 0 }));
  assert.throws(() => solveBitTiming({ ...timing, targetSample: Infinity }));
});
