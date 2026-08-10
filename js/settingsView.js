import { loadRecords, saveRecords, mergeRecords } from './records.js';
import { buildBackupPayload, validateBackupData } from './backup.js';
import { formatDate } from './dateUtils.js';

export function renderSettingsView(container) {
  container.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">データについて</h2>
      <p class="panel-note">記録はこの端末(ブラウザ)に保存され、1日1回GitHubにも自動バックアップされます。
      機種変更のときは、新しい端末でトークンを設定して「GitHubから復元」してください。</p>
    </section>
    <section class="panel" id="backup-section"></section>
    <section class="panel">
      <h2 class="panel-title">ファイルへのバックアップ</h2>
      <p class="panel-note">記録をファイルに書き出したり、ファイルから取り込んだりできます。</p>
      <button type="button" id="export-file-btn" class="save-btn">ファイルにエクスポート</button>
      <button type="button" id="import-file-btn" class="save-btn">ファイルからインポート</button>
      <input type="file" id="import-file-input" accept="application/json" hidden>
      <p id="file-backup-message" class="save-message" role="status"></p>
    </section>
  `;

  const exportBtn = container.querySelector('#export-file-btn');
  const importBtn = container.querySelector('#import-file-btn');
  const importInput = container.querySelector('#import-file-input');
  const message = container.querySelector('#file-backup-message');

  exportBtn.addEventListener('click', () => {
    const records = loadRecords(localStorage);
    const payload = buildBackupPayload(records);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bp-app-backup-${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      validateBackupData(data);
      const merged = mergeRecords(loadRecords(localStorage), data.records);
      saveRecords(localStorage, merged);
      message.textContent = `${data.records.length}件を取り込みました(現在の合計${merged.length}件)`;
    } catch {
      message.textContent = 'ファイルの形式が正しくありません。';
    }
  });

  import('https://taka070600538-tech.github.io/app-sync/v1/sync.js')
    .then((sync) => sync.renderSyncSettings(container.querySelector('#backup-section')))
    .catch(() => {
      container.querySelector('#backup-section').innerHTML =
        '<p class="panel-note">バックアップ機能は現在利用できません(オフラインの可能性)。</p>';
    });
}
