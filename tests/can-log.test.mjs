import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeCapture, errorClassLabels, fdFlagLabels, intervalStats, MAX_LINES, parseCapture } from '../public/bus-atlas/can-log.mjs';

const load = path => readFile(new URL(path, import.meta.url), 'utf8');

test('parses Classical, FD, RTR, explicit raw DLC, and SocketCAN error evidence', async () => {
  const { records, issues, dropNotices } = parseCapture(await load('./fixtures/candump.log'));
  assert.equal(records.length, 10);
  assert.equal(issues.length, 10);
  assert.deepEqual(records.map(({ id, kind, dlc, dlcEvidence }) => [id, kind, dlc, dlcEvidence]), [
    ['000', 'classical', 0, 'inferred'],
    ['7FF', 'classical', 2, 'inferred'],
    ['00000001', 'remote', 10, 'explicit'],
    ['123', 'classical', 15, 'explicit'],
    ['1FFFFFFF', 'fd', 9, 'inferred'],
    ['123', 'fd', 0, 'inferred'],
    ['123', 'fd', 0, 'inferred'],
    ['123', 'classical', 0, 'inferred'],
    ['123', 'remote', 12, 'explicit'],
    ['20000220', 'error', null, 'unavailable'],
  ]);
  assert.equal(records[0].timeNs, 1700000000000000001n);
  assert.equal(records[1].direction, 'TX');
  assert.equal(records[2].format, 'extended');
  assert.equal(records[2].payload, '');
  assert.equal(records[4].payload, '0102030405060708090A0B0C');
  assert.deepEqual(fdFlagLabels(records[4].fdFlags), ['BRS', 'ESI']);
  assert.equal(records[5].fdFlags, 0);
  assert.equal(records[6].fdFlags, null);
  assert.deepEqual(errorClassLabels(records[9].errorMask), ['ACK', 'Counters']);
  assert.deepEqual(dropNotices, [{ line: 12, iface: 'can0', dropped: 2, total: 2 }]);
  assert.deepEqual(issues.map(issue => issue.line), [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  assert.match(issues.at(-1).reason, /CAN XL/);
});

test('separates streams, retains ties and untimed data, and counts ordering reversals', async () => {
  const capture = parseCapture(await load('../public/bus-atlas/samples/mixed.log'));
  const analysis = analyzeCapture(capture.records);
  assert.equal(capture.issues.length, 1);
  assert.equal(analysis.errors, 1);
  assert.equal(analysis.missing, 3);
  assert.equal(analysis.groups.length, 5);
  const first = analysis.groups[0];
  assert.deepEqual([first.id, first.count, first.timed, first.outOfOrder, first.ties], ['123', 5, 4, 1, 1]);
  assert.deepEqual(first.intervalsMs, [2, 1, 0]);
  assert.deepEqual(first.stats, { count: 3, mean: 1, median: 1, min: 0, max: 2, p95: 2, p99: 2 });
  assert.equal(first.rateHz, 1000);
  assert.equal(analysis.bins.length, 24);
  assert.equal(analysis.bins.reduce((n, bin) => n + bin.messages, 0), 6);
  assert.equal(analysis.bins.at(-1).errors, 1);
  assert.deepEqual(capture.records.slice(0, 3).map(record => record.timestamp.slice(-9)), ['001000000', '004000000', '003000000']);
});

test('preserves sub-microsecond intervals and reports a finite rate only over a positive span', () => {
  const data = '(1000000000.000000001) can0 123#00\n(1000000000.000000002) can0 123#01';
  const { groups: [group] } = analyzeCapture(parseCapture(data).records);
  assert.equal(group.stats.min, 0.000001);
  assert.equal(group.rateHz, 1e9);
  const tied = analyzeCapture(parseCapture('(0) can0 123#00\n(0) can0 123#01').records);
  assert.equal(tied.groups[0].rateHz, null);
  assert.equal(tied.groups[0].stats.median, 0);
  assert.deepEqual(tied.bins, [{ messages: 2, errors: 0 }]);
  const untimed = analyzeCapture(parseCapture('can0 123#00').records);
  assert.equal(untimed.groups[0].stats, null);
  assert.deepEqual(untimed.bins, []);
});

test('verifies teaching periodicity and nearest-rank tail percentiles', async () => {
  const capture = parseCapture(await load('../public/bus-atlas/samples/periodic.log'));
  const { groups: [group] } = analyzeCapture(capture.records);
  assert.equal(capture.issues.length, 0);
  assert.equal(group.rateHz, 100);
  assert.deepEqual(group.stats, { count: 10, mean: 10, median: 10, min: 9.75, max: 10.25, p95: 10.25, p99: 10.25 });
  const ranks = intervalStats(Array.from({ length: 100 }, (_, i) => 100 - i));
  assert.equal(ranks.median, 50.5);
  assert.equal(ranks.p95, 95);
  assert.equal(ranks.p99, 99);
  assert.equal(intervalStats([]), null);
});

test('ignores comments and blank lines, handles line endings, and rejects oversized inputs', () => {
  assert.equal(parseCapture('# comment\r\n\r\ncan0 123#00\r').records[0].line, 3);
  assert.throws(() => parseCapture('#\n'.repeat(MAX_LINES + 1)), /100,000 lines/);
});
