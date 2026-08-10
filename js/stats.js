import { classifyBP, CATEGORIES } from './classify.js';
import { shiftDate } from './dateUtils.js';

// 今日を含む直近days日分(例: days=7なら今日-6日〜今日)。
export function filterByPeriod(records, days, today) {
  const from = shiftDate(today, -(days - 1));
  return records.filter((r) => r.date >= from && r.date <= today);
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function averages(records) {
  if (records.length === 0) return null;
  const left = { sys: mean(records.map((r) => r.sysL)), dia: mean(records.map((r) => r.diaL)) };
  const right = { sys: mean(records.map((r) => r.sysR)), dia: mean(records.map((r) => r.diaR)) };
  const round = (o) => ({ sys: Math.round(o.sys), dia: Math.round(o.dia) });
  return {
    left: round(left),
    right: round(right),
    overall: round({ sys: (left.sys + right.sys) / 2, dia: (left.dia + right.dia) / 2 }),
  };
}

// 血圧判定の分布(左腕基準、参考アプリと同じ)。
export function distribution(records) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  for (const r of records) counts[classifyBP(r.sysL, r.diaL).id] += 1;
  return counts;
}
