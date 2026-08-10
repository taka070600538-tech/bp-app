import { renderRecordView } from './recordForm.js';
import { renderGraphView } from './graphView.js';
import { renderSettingsView } from './settingsView.js';
import { loadRecords, saveRecords } from './records.js';
import { buildBackupPayload, validateBackupData } from './backup.js';

function switchView(viewName) {
  for (const view of document.querySelectorAll('.view')) {
    view.classList.toggle('hidden', view.id !== `view-${viewName}`);
  }
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.classList.toggle('is-active', btn.dataset.view === viewName);
  }
  if (viewName === 'record') renderRecordView(document.getElementById('view-record'));
  if (viewName === 'graph') renderGraphView(document.getElementById('view-graph'));
  if (viewName === 'settings') renderSettingsView(document.getElementById('view-settings'));
}

function init() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  switchView('record');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // 共有バックアップ基盤は動的import。オフラインやapp-sync障害時は黙ってスキップし、
  // アプリ本体の起動を妨げない(次回オンライン起動時に再試行される)。
  import('https://taka070600538-tech.github.io/app-sync/v1/sync.js')
    .then((sync) => sync.initDailyBackup({
      appId: 'bp-app',
      collect: async () => buildBackupPayload(loadRecords(localStorage)),
      restore: async (data) => {
        validateBackupData(data);
        saveRecords(localStorage, data.records);
      },
    }))
    .catch(() => {});
}

init();
