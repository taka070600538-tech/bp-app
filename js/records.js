// 記録の保存形式: { date: 'YYYY-MM-DD', sysL, diaL, sysR, diaR, createdAt }
// 1日1件(dateがキー)。storageはlocalStorage互換(テストではフェイクを注入)。
const KEY = 'bp-app:records';

export function upsertRecord(records, record) {
  const rest = records.filter((r) => r.date !== record.date);
  return [...rest, record].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function loadRecords(storage) {
  try {
    const raw = storage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(storage, records) {
  storage.setItem(KEY, JSON.stringify(records));
}
