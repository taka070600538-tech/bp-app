import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAxis, buildBpChartSvg, monotonePath } from '../js/bpChart.js';

const rec = (date, sysL, diaL, sysR, diaR) => ({ date, sysL, diaL, sysR, diaR });

function cubicBezierAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// "M x0,y0 C x1,y1 x2,y2 x3,y3 C ..." を線分ごとの制御点配列に分解する。
function parseSegments(d) {
  const tokens = d.trim().split(/\s+/);
  const num = (s) => s.split(',').map(Number);
  const segments = [];
  let prev = num(tokens[1]);
  let i = 2;
  while (i < tokens.length) {
    if (tokens[i] === 'C') {
      const p1 = num(tokens[i + 1]);
      const p2 = num(tokens[i + 2]);
      const p3 = num(tokens[i + 3]);
      segments.push({ p0: prev, p1, p2, p3 });
      prev = p3;
      i += 4;
    } else {
      i += 1;
    }
  }
  return segments;
}

test('computeAxis: 5mmHg刻みに丸め、データ範囲と基準線(70/140)を必ず含む', () => {
  // sysL/diaL/sysR/diaRいずれも152と78を持たせ、6系列の値の最小78・最大152を確定させる。
  const axis = computeAxis([rec('2026-08-10', 152, 78, 152, 78)]);
  assert.equal(axis.bottom, 65);
  assert.equal(axis.top, 160);
});

test('computeAxis: 極端な値でも範囲が広がり5刻みを保つ', () => {
  const axis = computeAxis([rec('2026-08-10', 190, 40, 190, 40)]);
  assert.ok(axis.top >= 190);
  assert.ok(axis.bottom <= 40);
  assert.equal(axis.bottom % 5, 0);
  assert.equal(axis.top % 5, 0);
});

test('buildBpChartSvg: 6系列のpathと基準線3組(6本)を含むSVGを返す', () => {
  const records = [
    rec('2026-08-09', 120, 80, 118, 78),
    rec('2026-08-10', 125, 85, 121, 81),
  ];
  const svg = buildBpChartSvg(records);
  assert.match(svg, /^<svg/);
  assert.equal([...svg.matchAll(/<path /g)].length, 6);
  assert.equal([...svg.matchAll(/stroke-dasharray:4 4/g)].length, 6);
});

test('buildBpChartSvg: 記録1件でもエラーにならない', () => {
  const svg = buildBpChartSvg([rec('2026-08-10', 120, 80, 118, 78)]);
  assert.match(svg, /^<svg/);
  assert.match(svg, /08\/10/);
});

test('buildBpChartSvg: x軸ラベルは記録7件なら全件表示', () => {
  const records = Array.from({ length: 7 }, (_, i) => rec(`2026-08-0${i + 1}`, 120, 80, 118, 78));
  const svg = buildBpChartSvg(records);
  const labels = [...svg.matchAll(/>0[0-9]\/0[0-9]</g)];
  assert.equal(labels.length, 7);
});

test('buildBpChartSvg: x軸ラベルは記録30件なら間引かれる(interval=ceil(30/7)=5)', () => {
  const records = Array.from({ length: 30 }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0');
    return rec(`2026-${i < 28 ? '08' : '09'}-${day}`, 120, 80, 118, 78);
  });
  const svg = buildBpChartSvg(records);
  const labels = [...svg.matchAll(/text-anchor="middle"/g)];
  // インデックス0,5,10,15,20,25(倍数)+最後の29 = 7個
  assert.equal(labels.length, 7);
  assert.ok(labels.length < 30);
});

test('monotonePath: 点が0個・1個なら線を描かない', () => {
  assert.equal(monotonePath([]), '');
  assert.equal(monotonePath([{ x: 0, y: 0 }]), '');
});

test('monotonePath: 点が2個なら直線(制御点が両端を結ぶ直線上に乗る)', () => {
  const d = monotonePath([{ x: 0, y: 0 }, { x: 10, y: 5 }]);
  const [seg] = parseSegments(d);
  // 直線 y = 0.5x 上に制御点が乗ることを確認(round2による微小誤差は許容)。
  assert.ok(Math.abs(seg.p1[1] - 0.5 * seg.p1[0]) < 0.02);
  assert.ok(Math.abs(seg.p2[1] - 0.5 * seg.p2[0]) < 0.02);
});

test('monotonePath: オーバーシュートしない(各線分のyは両端の値の範囲を超えない)', () => {
  // V字型(0→10→0)。中間点では傾きの符号が反転するため接線0になり、
  // 各線分は自分の両端の値を超えて振れないはず。
  const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
  const d = monotonePath(points);
  const segments = parseSegments(d);
  assert.equal(segments.length, 2);
  for (const seg of segments) {
    const yMin = Math.min(seg.p0[1], seg.p3[1]);
    const yMax = Math.max(seg.p0[1], seg.p3[1]);
    for (let t = 0; t <= 1; t += 0.05) {
      const y = cubicBezierAt(seg.p0[1], seg.p1[1], seg.p2[1], seg.p3[1], t);
      assert.ok(y >= yMin - 0.01 && y <= yMax + 0.01, `y=${y} が範囲[${yMin},${yMax}]を超えている`);
    }
  }
});
