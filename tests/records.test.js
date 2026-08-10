import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertRecord, loadRecords, saveRecords, mergeRecords } from '../js/records.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    _dump: () => Object.fromEntries(map),
  };
}

const rec = (date, sysL = 120) => ({ date, sysL, diaL: 80, sysR: 118, diaR: 78, createdAt: `${date}T07:00:00.000Z` });

test('upsertRecord: 新しい日付は追加され日付昇順に並ぶ', () => {
  const out = upsertRecord([rec('2026-08-09')], rec('2026-08-08'));
  assert.deepEqual(out.map((r) => r.date), ['2026-08-08', '2026-08-09']);
});

test('upsertRecord: 同じ日付は上書きされる(1日1件)', () => {
  const out = upsertRecord([rec('2026-08-09', 120)], rec('2026-08-09', 135));
  assert.equal(out.length, 1);
  assert.equal(out[0].sysL, 135);
});

test('upsertRecord: 元の配列は破壊しない', () => {
  const original = [rec('2026-08-09')];
  upsertRecord(original, rec('2026-08-10'));
  assert.equal(original.length, 1);
});

test('load/saveRecords: storage経由で往復できる', () => {
  const storage = fakeStorage();
  saveRecords(storage, [rec('2026-08-10')]);
  const loaded = loadRecords(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].date, '2026-08-10');
});

test('loadRecords: 未保存・壊れたJSONは空配列を返す', () => {
  assert.deepEqual(loadRecords(fakeStorage()), []);
  assert.deepEqual(loadRecords(fakeStorage({ 'bp-app:records': '{oops' })), []);
});

test('mergeRecords: 日付が被らない場合は両方残る', () => {
  const out = mergeRecords([rec('2026-08-09')], [rec('2026-08-10')]);
  assert.deepEqual(out.map((r) => r.date), ['2026-08-09', '2026-08-10']);
});

test('mergeRecords: 日付が被る場合はimported側の値が採用される', () => {
  const out = mergeRecords([rec('2026-08-09', 120)], [rec('2026-08-09', 150)]);
  assert.equal(out.length, 1);
  assert.equal(out[0].sysL, 150);
});

test('mergeRecords: 結果は日付でソートされている', () => {
  const out = mergeRecords(
    [rec('2026-08-10')],
    [rec('2026-08-08'), rec('2026-08-09')]
  );
  assert.deepEqual(out.map((r) => r.date), ['2026-08-08', '2026-08-09', '2026-08-10']);
});
