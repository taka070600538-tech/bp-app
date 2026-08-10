// JSH2019の診察室血圧分類(参考アプリと同じくII度以上は1つに統合)。
// 収縮期・拡張期それぞれで分類し、重い方を採用する。
export const CATEGORIES = [
  { id: 'normal', label: '正常血圧', short: '正常', range: '120/80未満', color: '#2E9463' },
  { id: 'normalHigh', label: '正常高値血圧', short: '正常高値', range: '120-129/80未満', color: '#93A93C' },
  { id: 'elevated', label: '高値血圧', short: '高値', range: '130-139/80-89', color: '#D9932B' },
  { id: 'grade1', label: 'I度高血圧', short: 'I度', range: '140-159/90-99', color: '#D0662B' },
  { id: 'grade2plus', label: 'II度以上の高血圧', short: 'II度以上', range: '160/100以上', color: '#BE3E3E' },
];

const BY_ID = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));

function sysLevel(sys) {
  if (sys < 120) return 'normal';
  if (sys < 130) return 'normalHigh';
  if (sys < 140) return 'elevated';
  if (sys < 160) return 'grade1';
  return 'grade2plus';
}

function diaLevel(dia) {
  if (dia < 80) return 'normal';
  if (dia < 90) return 'elevated';
  if (dia < 100) return 'grade1';
  return 'grade2plus';
}

export function classifyBP(sys, dia) {
  const s = sysLevel(sys);
  const d = diaLevel(dia);
  return CATEGORIES[Math.max(BY_ID[s], BY_ID[d])];
}
