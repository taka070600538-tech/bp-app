import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDaySection, upsertSection, datesToTranscribe } from '../tools/transcribe.mjs';

const records = [
  { date: '2026-08-10', sysL: 152, diaL: 96, sysR: 141, diaR: 97 },
  { date: '2026-08-11', sysL: null, diaL: null, sysR: 130, diaR: 80 },
  { date: '2026-08-12', sysL: null, diaL: null, sysR: null, diaR: null },
];

test('buildDaySection: 左右とも記録があれば両方の行を出す', () => {
  assert.equal(
    buildDaySection(records, '2026-08-10'),
    '## 血圧記録\n\n- 左: 152/96 mmHg\n- 右: 141/97 mmHg'
  );
});

test('buildDaySection: 片腕がnullならその行だけ省略する', () => {
  assert.equal(buildDaySection(records, '2026-08-11'), '## 血圧記録\n\n- 右: 130/80 mmHg');
});

test('buildDaySection: 両腕ともnull、または記録が無ければnull', () => {
  assert.equal(buildDaySection(records, '2026-08-12'), null);
  assert.equal(buildDaySection(records, '2026-01-01'), null);
});

test('datesToTranscribe: 当日を除いた日付昇順', () => {
  assert.deepEqual(datesToTranscribe(records, '2026-08-12'), ['2026-08-10', '2026-08-11']);
});

test('upsertSection: マーカーが無ければ末尾に追記', () => {
  const out = upsertSection('既存の本文\n', 'セクション');
  assert.equal(out, '既存の本文\n\n<!-- bp-app:start -->\nセクション\n<!-- bp-app:end -->\n');
});

test('upsertSection: 既存マーカー区間だけを置換し他は触らない', () => {
  const before = '前文\n\n<!-- bp-app:start -->\n古い内容\n<!-- bp-app:end -->\n後文\n';
  const out = upsertSection(before, '新しい内容');
  assert.equal(out, '前文\n\n<!-- bp-app:start -->\n新しい内容\n<!-- bp-app:end -->\n後文\n');
});

test('upsertSection: CRLFの日記ではCRLFを保つ', () => {
  const out = upsertSection('本文\r\n', 'A\nB');
  assert.equal(out, '本文\r\n\r\n<!-- bp-app:start -->\r\nA\r\nB\r\n<!-- bp-app:end -->\r\n');
});

test('upsertSection: 空ファイルにはブロックのみ', () => {
  assert.equal(upsertSection('', 'S'), '<!-- bp-app:start -->\nS\n<!-- bp-app:end -->\n');
});
