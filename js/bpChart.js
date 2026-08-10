import { diffDays } from './dateUtils.js';

const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 220;
const PAD_TOP = 12;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 24;
const PAD_LEFT = 34;

const PLOT_LEFT = PAD_LEFT;
const PLOT_RIGHT = VIEW_WIDTH - PAD_RIGHT;
const PLOT_TOP = PAD_TOP;
const PLOT_BOTTOM = VIEW_HEIGHT - PAD_BOTTOM;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

const REF_HIGH = { sys: 140, dia: 90 }; // 高血圧基準
const REF_NORMAL = { sys: 120, dia: 70 }; // 正常基準(参考アプリと同じ120/70)

// 系列定義(凡例順も参考アプリに合わせて 右→平均→左)。
export const SERIES = [
  { id: 'sysR', label: '右腕(上)', cls: 'bp-line-right bp-line-sys', pick: (r) => r.sysR },
  { id: 'diaR', label: '右腕(下)', cls: 'bp-line-right bp-line-dia', pick: (r) => r.diaR },
  { id: 'sysAvg', label: '左右平均(上)', cls: 'bp-line-avg bp-line-sys', pick: (r) => (r.sysL + r.sysR) / 2 },
  { id: 'diaAvg', label: '左右平均(下)', cls: 'bp-line-avg bp-line-dia', pick: (r) => (r.diaL + r.diaR) / 2 },
  { id: 'sysL', label: '左腕(上)', cls: 'bp-line-left bp-line-sys', pick: (r) => r.sysL },
  { id: 'diaL', label: '左腕(下)', cls: 'bp-line-left bp-line-dia', pick: (r) => r.diaL },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function toMonthDay(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${Number(month)}/${Number(day)}`;
}

// データと基準線(140と70)を必ず含む、10mmHg刻みのy軸範囲。
export function computeAxis(records) {
  const values = records.flatMap((r) => SERIES.map((s) => s.pick(r)));
  const top = Math.max(...values, REF_HIGH.sys) + 5;
  const bottom = Math.min(...values, REF_NORMAL.dia) - 5;
  return { top: Math.ceil(top / 10) * 10, bottom: Math.floor(bottom / 10) * 10 };
}

export function buildBpChartSvg(records, { fromDate, toDate }) {
  const axis = computeAxis(records);
  const span = axis.top - axis.bottom;
  const spanDays = diffDays(fromDate, toDate);

  const xFor = (dateStr) => {
    if (spanDays <= 0) return PLOT_LEFT + PLOT_WIDTH / 2;
    return PLOT_LEFT + (diffDays(fromDate, dateStr) / spanDays) * PLOT_WIDTH;
  };
  const yFor = (value) => PLOT_TOP + PLOT_HEIGHT * (1 - (value - axis.bottom) / span);

  // 10mmHgごとの目盛り線(基準線と重なる値はスキップ)。
  const refValues = [REF_HIGH.sys, REF_HIGH.dia, REF_NORMAL.sys, REF_NORMAL.dia];
  let grid = '';
  for (let v = axis.bottom; v <= axis.top; v += 10) {
    const y = round2(yFor(v));
    if (!refValues.includes(v)) {
      grid += `<line class="bp-grid" x1="${PLOT_LEFT}" y1="${y}" x2="${PLOT_RIGHT}" y2="${y}" />`;
    }
    if (v % 20 === 0) {
      grid += `<text class="bp-axis-label" x="${PLOT_LEFT - 5}" y="${y + 3}" text-anchor="end">${v}</text>`;
    }
  }

  const refLine = (value, cls) => {
    const y = round2(yFor(value));
    return `<line class="${cls}" x1="${PLOT_LEFT}" y1="${y}" x2="${PLOT_RIGHT}" y2="${y}" />`
      + `<text class="bp-ref-label ${cls}-label" x="${PLOT_RIGHT}" y="${y - 3}" text-anchor="end">${value}</text>`;
  };
  const refs = refLine(REF_HIGH.sys, 'bp-ref-high') + refLine(REF_HIGH.dia, 'bp-ref-high')
    + refLine(REF_NORMAL.sys, 'bp-ref-normal') + refLine(REF_NORMAL.dia, 'bp-ref-normal');

  const lines = SERIES.map((s) => {
    const coords = records.map((r) => `${round2(xFor(r.date))},${round2(yFor(s.pick(r)))}`);
    const dots = records
      .map((r) => `<circle class="bp-dot ${s.cls}" cx="${round2(xFor(r.date))}" cy="${round2(yFor(s.pick(r)))}" r="2.5" />`)
      .join('');
    // polylineは常に出力する(1点でもクラス数を保ち、テスト・スタイルを単純にする)。
    return `<polyline class="bp-line ${s.cls}" points="${coords.join(' ')}" fill="none" />${dots}`;
  }).join('');

  return `<svg class="bp-chart" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" width="100%" role="img" aria-label="${toMonthDay(fromDate)}から${toMonthDay(toDate)}までの血圧トレンド">
  ${grid}
  ${refs}
  ${lines}
  <text class="bp-axis-label" x="${PLOT_LEFT}" y="${VIEW_HEIGHT - 8}" text-anchor="start">${toMonthDay(fromDate)}</text>
  <text class="bp-axis-label" x="${PLOT_RIGHT}" y="${VIEW_HEIGHT - 8}" text-anchor="end">${toMonthDay(toDate)}</text>
</svg>`;
}
