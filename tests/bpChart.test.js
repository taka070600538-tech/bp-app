import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAxis, buildBpChartSvg } from '../js/bpChart.js';

const rec = (date, sysL, diaL, sysR, diaR) => ({ date, sysL, diaL, sysR, diaR });

test('computeAxis: データと基準線(140/70)を必ず含む10mmHg刻みの範囲', () => {
  const axis = computeAxis([rec('2026-08-10', 120, 80, 118, 78)]);
  assert.ok(axis.bottom <= 70);
  assert.ok(axis.top >= 140);
  assert.equal(axis.bottom % 10, 0);
  assert.equal(axis.top % 10, 0);
});

test('computeAxis: 極端な値でも範囲が広がる', () => {
  const axis = computeAxis([rec('2026-08-10', 190, 40, 190, 40)]);
  assert.ok(axis.top >= 190);
  assert.ok(axis.bottom <= 40);
});

test('buildBpChartSvg: 6系列のpolylineと基準線2組を含むSVGを返す', () => {
  const records = [
    rec('2026-08-09', 120, 80, 118, 78),
    rec('2026-08-10', 125, 85, 121, 81),
  ];
  const svg = buildBpChartSvg(records, { fromDate: '2026-08-04', toDate: '2026-08-10' });
  assert.match(svg, /^<svg/);
  assert.equal([...svg.matchAll(/class="bp-line/g)].length, 6);
  assert.match(svg, /bp-ref-high/); // 高血圧基準 140/90
  assert.match(svg, /bp-ref-normal/); // 正常基準 120/70
});

test('buildBpChartSvg: 記録1件でもエラーにならない', () => {
  const svg = buildBpChartSvg([rec('2026-08-10', 120, 80, 118, 78)], { fromDate: '2026-08-10', toDate: '2026-08-10' });
  assert.match(svg, /^<svg/);
});
