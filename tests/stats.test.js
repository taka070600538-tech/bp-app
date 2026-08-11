import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFromDate, averages, distribution } from '../js/stats.js';

const rec = (date, sysL, diaL, sysR, diaR) => ({ date, sysL, diaL, sysR, diaR });

test('filterFromDate: 開始日から今日までの範囲を残す(境界含む)', () => {
  const records = [
    rec('2026-08-03', 120, 80, 120, 80), // 範囲外(fromDateより前)
    rec('2026-08-04', 120, 80, 120, 80), // fromDate自身(境界)
    rec('2026-08-07', 120, 80, 120, 80),
    rec('2026-08-10', 120, 80, 120, 80), // today自身(境界)
  ];
  const out = filterFromDate(records, '2026-08-04', '2026-08-10');
  assert.deepEqual(out.map((r) => r.date), ['2026-08-04', '2026-08-07', '2026-08-10']);
});

test('averages: 左・右・左右総合の平均を四捨五入で返す', () => {
  const out = averages([rec('2026-08-09', 120, 80, 130, 90), rec('2026-08-10', 125, 85, 135, 95)]);
  assert.deepEqual(out.left, { sys: 123, dia: 83 });   // 122.5→123, 82.5→83
  assert.deepEqual(out.right, { sys: 133, dia: 93 });
  assert.deepEqual(out.overall, { sys: 128, dia: 88 }); // (122.5+132.5)/2=127.5→128
});

test('averages: 記録が無ければnull', () => {
  assert.equal(averages([]), null);
});

test('distribution: 左腕基準で5分類の件数を数える', () => {
  const out = distribution([
    rec('2026-08-08', 115, 75, 999, 999), // normal(右腕は無視される)
    rec('2026-08-09', 125, 75, 110, 70), // normalHigh
    rec('2026-08-10', 132, 82, 110, 70), // elevated
    rec('2026-08-11', 132, 84, 110, 70), // elevated
  ]);
  assert.equal(out.normal, 1);
  assert.equal(out.normalHigh, 1);
  assert.equal(out.elevated, 2);
  assert.equal(out.grade1, 0);
  assert.equal(out.grade2plus, 0);
});
