import { classifyBP, CATEGORIES } from './classify.js';

// 開始日から今日までの範囲(両端含む)。
export function filterFromDate(records, fromDate, today) {
  return records.filter((r) => r.date >= fromDate && r.date <= today);
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
