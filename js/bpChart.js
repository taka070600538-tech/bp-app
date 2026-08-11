const VIEW_HEIGHT = 480;

const PLOT_LEFT = 35;
const RIGHT_MARGIN = 10; // viewWidthとplotRightの差(右余白)
const MIN_VIEW_WIDTH = 374; // 30点以下はこの固定幅
const PLOT_TOP = 6;
const PLOT_BOTTOM = 425; // 下側はx軸ラベル用に余白55
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
// 30点表示時の点間隔。31点以上ではこれを下回らないよう幅を広げる基準値にする。
const SPACING_30 = (364 - 35) / 29;
const X_LABEL_MIN_GAP = 45; // x軸ラベル1つあたりに確保する最低幅(px)

// 表示点数Nに応じたSVG全体の幅。30点までは固定、31点以上は間隔がspacing30を下回らないよう広げる。
function computeViewWidth(n) {
  if (n <= 30) return MIN_VIEW_WIDTH;
  return PLOT_LEFT + (n - 1) * SPACING_30 + RIGHT_MARGIN;
}

const X_LABEL_Y = 433;
const Y_LABEL_X = 27;
const AXIS_LABEL_COLOR = '#9ca3af';

// 基準線3組(数値ラベルはy軸目盛りで読めるため描かない)。
const REF_HIGH = { sys: 140, dia: 90, color: '#ef4444' }; // 高血圧
const REF_ELEVATED = { sys: 130, dia: 80, color: '#facc15' }; // 高値血圧
const REF_NORMAL = { sys: 120, dia: 70, color: '#3b82f6' }; // 正常

// 系列定義(描画順も参考アプリに合わせて 右→平均→左)。色・線幅・ドット寸法を直書き。
export const SERIES = [
  { id: 'sysR', label: '右腕(上)', color: '#38bdf8', lineWidth: 1, dotRadius: 1.5, dotStrokeWidth: 1, pick: (r) => r.sysR },
  { id: 'diaR', label: '右腕(下)', color: '#e0f2fe', lineWidth: 1, dotRadius: 1.5, dotStrokeWidth: 1, pick: (r) => r.diaR },
  { id: 'sysAvg', label: '左右平均(上)', color: '#0d9488', lineWidth: 3, dotRadius: 3, dotStrokeWidth: 3, pick: (r) => (r.sysL + r.sysR) / 2 },
  { id: 'diaAvg', label: '左右平均(下)', color: '#0ea5e9', lineWidth: 3, dotRadius: 2.5, dotStrokeWidth: 3, pick: (r) => (r.diaL + r.diaR) / 2 },
  { id: 'sysL', label: '左腕(上)', color: '#99f6e4', lineWidth: 1, dotRadius: 1.5, dotStrokeWidth: 1, pick: (r) => r.sysL },
  { id: 'diaL', label: '左腕(下)', color: '#bae6fd', lineWidth: 1, dotRadius: 1.5, dotStrokeWidth: 1, pick: (r) => r.diaL },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function toMonthDay(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${month}/${day}`;
}

function sign(n) {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

// データと基準線(最小70・最大140)を必ず含む、5mmHg刻みのy軸範囲。
export function computeAxis(records) {
  const values = records.flatMap((r) => SERIES.map((s) => s.pick(r)));
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const bottom = Math.floor((Math.min(dataMin, 70) - 5) / 5) * 5;
  const top = Math.ceil((Math.max(dataMax, 140) + 5) / 5) * 5;
  return { bottom, top };
}

// 各点の傾き(隣接区間の符号が異なれば接線0、同じなら調和平均ベース)から接線を求め、
// 3次ベジェで結ぶ(d3-shape/Rechartsのtype="monotone"相当、Fritsch-Carlson法)。
// オーバーシュートしないことが特徴で、単調でないデータでも隣接2点の範囲を超えて振れない。
function computeTangents(points) {
  const n = points.length;
  const t = new Array(n).fill(0);
  if (n < 2) return t;

  if (n === 2) {
    const dx = points[1].x - points[0].x;
    const m = dx === 0 ? 0 : (points[1].y - points[0].y) / dx;
    t[0] = m;
    t[1] = m;
    return t;
  }

  for (let i = 1; i < n - 1; i++) {
    const h0 = points[i].x - points[i - 1].x;
    const h1 = points[i + 1].x - points[i].x;
    const s0 = h0 === 0 ? 0 : (points[i].y - points[i - 1].y) / h0;
    const s1 = h1 === 0 ? 0 : (points[i + 1].y - points[i].y) / h1;
    const p = (s0 * h1 + s1 * h0) / (h0 + h1);
    const sgn = sign(s0) + sign(s1);
    t[i] = sgn === 0 ? 0 : sgn * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
  }

  const h0 = points[1].x - points[0].x;
  t[0] = h0 === 0 ? t[1] : (3 * (points[1].y - points[0].y) / h0 - t[1]) / 2;
  const hLast = points[n - 1].x - points[n - 2].x;
  t[n - 1] = hLast === 0 ? t[n - 2] : (3 * (points[n - 1].y - points[n - 2].y) / hLast - t[n - 2]) / 2;

  return t;
}

// monotone cubic補間によるSVGパスのd属性を返す純粋関数。点が1個以下なら線を描かない(空文字)。
export function monotonePath(points) {
  if (points.length < 2) return '';

  const t = computeTangents(points);
  let d = `M ${round2(points[0].x)},${round2(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const x1 = points[i].x + dx / 3;
    const y1 = points[i].y + (t[i] * dx) / 3;
    const x2 = points[i + 1].x - dx / 3;
    const y2 = points[i + 1].y - (t[i + 1] * dx) / 3;
    d += ` C ${round2(x1)},${round2(y1)} ${round2(x2)},${round2(y2)} ${round2(points[i + 1].x)},${round2(points[i + 1].y)}`;
  }
  return d;
}

// 描画順(細い4本を先に、太い平均2本を後に描いて平均線を上に重ねる)。凡例順のSERIESとは別に保持。
const DRAW_ORDER = [...SERIES].sort((a, b) => a.lineWidth - b.lineWidth);

export function buildBpChartSvg(records) {
  const axis = computeAxis(records);
  const span = axis.top - axis.bottom;
  const n = records.length;
  const viewWidth = computeViewWidth(n);
  const plotRight = viewWidth - RIGHT_MARGIN;
  const plotWidth = plotRight - PLOT_LEFT;

  const xFor = (i) => (n === 1 ? (PLOT_LEFT + plotRight) / 2 : PLOT_LEFT + (i / (n - 1)) * plotWidth);
  const yFor = (value) => PLOT_TOP + PLOT_HEIGHT * (1 - (value - axis.bottom) / span);

  // 5mmHgごとの水平グリッド線と数値ラベル(垂直グリッドは無し)。
  let grid = '';
  for (let v = axis.bottom; v <= axis.top; v += 5) {
    const y = round2(yFor(v));
    grid += `<line class="bp-grid" x1="${PLOT_LEFT}" y1="${y}" x2="${round2(plotRight)}" y2="${y}" />`;
    grid += `<text class="bp-axis-label" x="${Y_LABEL_X}" y="${round2(y + 3)}" text-anchor="end" fill="${AXIS_LABEL_COLOR}">${v}</text>`;
  }

  const refLine = (value, color) => {
    const y = round2(yFor(value));
    return `<line x1="${PLOT_LEFT}" y1="${y}" x2="${round2(plotRight)}" y2="${y}" style="stroke:${color}; stroke-width:1.2; stroke-dasharray:4 4;" />`;
  };
  const refs = refLine(REF_HIGH.sys, REF_HIGH.color) + refLine(REF_HIGH.dia, REF_HIGH.color)
    + refLine(REF_ELEVATED.sys, REF_ELEVATED.color) + refLine(REF_ELEVATED.dia, REF_ELEVATED.color)
    + refLine(REF_NORMAL.sys, REF_NORMAL.color) + refLine(REF_NORMAL.dia, REF_NORMAL.color);

  const seriesSvg = DRAW_ORDER.map((s) => {
    const points = records.map((r, i) => ({ x: round2(xFor(i)), y: round2(yFor(s.pick(r))) }));
    const d = monotonePath(points);
    const path = d ? `<path d="${d}" style="stroke:${s.color}; stroke-width:${s.lineWidth}; fill:none; stroke-linejoin:round; stroke-linecap:round;" />` : '';
    const dots = points
      .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${s.dotRadius}" style="fill:#fff; stroke:${s.color}; stroke-width:${s.dotStrokeWidth};" />`)
      .join('');
    return path + dots;
  }).join('');

  // ラベル1つあたり最低45pxを確保できるよう、画面密度ベースで間引く(線とドットは全点描く)。
  const spacing = n > 1 ? plotWidth / (n - 1) : 0;
  const interval = n > 1 ? Math.max(1, Math.ceil(X_LABEL_MIN_GAP / spacing)) : 1;
  const xLabels = records
    .map((r, i) => {
      if (i % interval !== 0 && i !== n - 1) return '';
      return `<text class="bp-axis-label" x="${round2(xFor(i))}" y="${X_LABEL_Y}" text-anchor="middle" fill="${AXIS_LABEL_COLOR}">${toMonthDay(r.date)}</text>`;
    })
    .join('');

  const first = toMonthDay(records[0].date);
  const last = toMonthDay(records[n - 1].date);
  // 31点以上で幅が374を超えるときだけmin-widthを付け、横スクロールで全点を見せる。
  const minWidthAttr = viewWidth > MIN_VIEW_WIDTH ? ` style="min-width:${round2(viewWidth)}px"` : '';

  return `<svg class="bp-chart" viewBox="0 0 ${round2(viewWidth)} ${VIEW_HEIGHT}" width="100%"${minWidthAttr} role="img" aria-label="${first}から${last}までの血圧トレンド">
  ${grid}
  ${refs}
  ${seriesSvg}
  ${xLabels}
</svg>`;
}
