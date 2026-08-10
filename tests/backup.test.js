import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBackupPayload, validateBackupData } from '../js/backup.js';

const rec = { date: '2026-08-10', sysL: 120, diaL: 80, sysR: 118, diaR: 78, createdAt: '2026-08-10T07:00:00.000Z' };

test('buildBackupPayload: version 1でrecordsと書き出し時刻を含む', () => {
  const now = new Date('2026-08-10T07:30:00.000Z');
  const payload = buildBackupPayload([rec], now);
  assert.equal(payload.version, 1);
  assert.equal(payload.exportedAt, '2026-08-10T07:30:00.000Z');
  assert.deepEqual(payload.records, [rec]);
});

test('validateBackupData: 正常なデータはそのまま返す', () => {
  const data = { version: 1, exportedAt: 'x', records: [rec] };
  assert.equal(validateBackupData(data), data);
});

test('validateBackupData: versionやrecordsが不正なら例外', () => {
  assert.throws(() => validateBackupData(null));
  assert.throws(() => validateBackupData({ version: 2, records: [] }));
  assert.throws(() => validateBackupData({ version: 1, records: 'oops' }));
});
