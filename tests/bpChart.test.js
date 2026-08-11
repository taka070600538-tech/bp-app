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

function manyRecords(n) {
  return Array.from({ length: n }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String(8 + Math.floor(i / 28)).padStart(2, '0');
    return rec(`2026-${month}-${day}`, 120, 80, 118, 78);
  });
}

test('buildBpChartSvg: 30点以下はviewBox幅374固定でmin-widthを付けない', () => {
  const svg30 = buildBpChartSvg(manyRecords(30));
  assert.match(svg30, /viewBox="0 0 374 480"/);
  assert.ok(!svg30.includes('min-width'));

  const svg10 = buildBpChartSvg(manyRecords(10));
  assert.match(svg10, /viewBox="0 0 374 480"/);
});

test('buildBpChartSvg: 31点以上は間隔を保つため幅が広がりmin-widthが付く', () => {
  const svg31 = buildBpChartSvg(manyRecords(31));
  const m31 = svg31.match(/viewBox="0 0 ([\d.]+) 480"/);
  assert.ok(m31);
  const width31 = Number(m31[1]);
  assert.ok(width31 > 374);
  assert.match(svg31, new RegExp(`style="min-width:${width31}px"`));

  const svg60 = buildBpChartSvg(manyRecords(60));
  const m60 = svg60.match(/viewBox="0 0 ([\d.]+) 480"/);
  const width60 = Number(m60[1]);
  assert.ok(width60 > width31, '点数が増えるほど幅も広がる');
});

test('buildBpChartSvg: x軸ラベルは画面密度ベースで間引かれる(60点、最低45px確保)', () => {
  const records = manyRecords(60);
  const svg = buildBpChartSvg(records);
  const labels = [...svg.matchAll(/text-anchor="middle"/g)];
  // spacing30=(364-35)/29、interval=ceil(45/spacing30)=4 → 0,4,...,56(15個)+最後の59 = 16個
  assert.equal(labels.length, 16);
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
