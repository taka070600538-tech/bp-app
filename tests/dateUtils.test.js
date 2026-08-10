import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, shiftDate, diffDays } from '../js/dateUtils.js';

test('formatDate: DateをYYYY-MM-DDにする', () => {
  assert.equal(formatDate(new Date(2026, 7, 10)), '2026-08-10');
});

test('shiftDate: 日数を加減算し月をまたげる', () => {
  assert.equal(shiftDate('2026-08-01', -1), '2026-07-31');
  assert.equal(shiftDate('2026-08-10', 5), '2026-08-15');
});

test('diffDays: 2つの日付の差(日数)', () => {
  assert.equal(diffDays('2026-08-04', '2026-08-10'), 6);
  assert.equal(diffDays('2026-08-10', '2026-08-10'), 0);
});
