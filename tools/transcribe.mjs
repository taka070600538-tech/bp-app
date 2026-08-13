// app-data/bp-app/backup.json を読み、Obsidianデイリーノートに転記する。
// マーカー区間を冪等にupsertするため、再実行のたびに最新内容へ自己修復される。
// 日本語パスはこのファイル(UTF-8)内に持つ(.ps1に書くと文字化けするため)。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const START = '<!-- bp-app:start -->';
const END = '<!-- bp-app:end -->';
const DEFAULT_BACKUP = String.raw`D:\Obsidian Vault for Claude Code\Git\app-data\bp-app\backup.json`;
const DEFAULT_DIARY_DIR = String.raw`D:\Obsidian Vault for Claude Code\01_油田`;

export function todayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// その日の記録から「左/右」の血圧行を組み立てる。sys/diaのどちらかがnullの腕は行ごと省略。
// 両方省略(記録が無い、または両腕ともnull)ならその日は転記対象外としてnullを返す。
export function buildDaySection(records, date) {
  const rec = records.find((r) => r.date === date);
  if (!rec) return null;
  const lines = [];
  if (rec.sysL != null && rec.diaL != null) lines.push(`- 左: ${rec.sysL}/${rec.diaL} mmHg`);
  if (rec.sysR != null && rec.diaR != null) lines.push(`- 右: ${rec.sysR}/${rec.diaR} mmHg`);
  if (lines.length === 0) return null;
  return ['## 血圧記録', '', ...lines].join('\n');
}

// contentの改行スタイルを保ちながら、マーカー区間を冪等に置換(無ければ末尾に追記)する。
// 日記本文の他の部分には一切触れない。
export function upsertSection(content, section) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const block = `${START}${eol}${section.replaceAll('\n', eol)}${eol}${END}${eol}`;
  const startIdx = content.indexOf(START);
  const endIdx = content.indexOf(END);
  if (startIdx !== -1 && endIdx !== -1) {
    return content.slice(0, startIdx) + block + content.slice(endIdx + END.length).replace(/^\r?\n/, '');
  }
  if (content === '') return block;
  const sep = content.endsWith(eol) ? eol : eol + eol;
  return content + sep + block;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 転記対象の日付(当日より前かつYYYY-MM-DD形式のみ)。記録のある日を昇順で返す。
export function datesToTranscribe(records, today) {
  const dates = new Set(records.map((r) => r.date));
  return [...dates].filter((d) => DATE_RE.test(d) && d < today).sort();
}

// diaryDir配下の各日付ファイルへ、backup.json記載の内容をupsertする。
// action: 'created'(新規ファイル) / 'updated'(内容変更あり) / 'unchanged'(差分なし) / 'error'
export function runTranscription({ records, diaryDir, today }) {
  const results = [];
  for (const date of datesToTranscribe(records, today)) {
    const section = buildDaySection(records, date);
    if (!section) continue;
    const path = join(diaryDir, `${date}.md`);
    try {
      const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
      const next = upsertSection(existing, section);
      if (existing === next) {
        results.push({ date, action: 'unchanged' });
      } else {
        writeFileSync(path, next, 'utf8');
        results.push({ date, action: existing === '' ? 'created' : 'updated' });
      }
    } catch (err) {
      results.push({ date, action: 'error', message: err.message });
    }
  }
  return results;
}

function main() {
  const backupPath = process.argv[2] || DEFAULT_BACKUP;
  const diaryDir = process.argv[3] || DEFAULT_DIARY_DIR;
  if (!existsSync(backupPath)) {
    console.log('backup.jsonがまだありません。スキップします');
    return;
  }
  let records;
  try {
    const data = JSON.parse(readFileSync(backupPath, 'utf8'));
    records = Array.isArray(data.records) ? data.records : null;
  } catch (err) {
    console.log(`backup.jsonを読めません (${err.message})`);
    return;
  }
  if (!records) {
    console.log('backup.jsonにrecordsがありません。スキップします');
    return;
  }
  mkdirSync(diaryDir, { recursive: true });
  const results = runTranscription({ records, diaryDir, today: todayString() });
  for (const r of results) {
    console.log(r.action === 'error' ? `${r.date}: ERROR (${r.message})` : `${r.date}: ${r.action}`);
  }
  if (results.length === 0) console.log('転記対象なし');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
