export function renderSettingsView(container) {
  container.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">データについて</h2>
      <p class="panel-note">記録はこの端末(ブラウザ)に保存され、1日1回GitHubにも自動バックアップされます。
      機種変更のときは、新しい端末でトークンを設定して「GitHubから復元」してください。</p>
    </section>
    <section class="panel" id="backup-section"></section>
  `;
  import('https://taka070600538-tech.github.io/app-sync/v1/sync.js')
    .then((sync) => sync.renderSyncSettings(container.querySelector('#backup-section')))
    .catch(() => {
      container.querySelector('#backup-section').innerHTML =
        '<p class="panel-note">バックアップ機能は現在利用できません(オフラインの可能性)。</p>';
    });
}
