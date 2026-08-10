# 毎朝の血圧手帳 (bp-app)

毎朝、左右両腕の血圧を記録するPWA。Google AI Studioで作った同名アプリを
Claude Codeで作り直したもの。ビルド不要の静的構成(GitHub Pagesで配信)。

- 公開URL: https://taka070600538-tech.github.io/bp-app/
- データ保存: 端末のlocalStorage + [app-sync共通基盤](https://github.com/taka070600538-tech/app-sync)で
  1日1回 `app-data/bp-app/backup.json` に自動バックアップ
- PC側同期: 既存のタスクスケジューラ`AppDataGitPull`(app-dataを毎日pull)がそのまま使われる。追加設定不要

## 機能

- **記録**: 測定日を選び、左腕・右腕の最高/最低血圧をスライダーと±1/±5ボタンで入力。
  入力値に応じてJSH分類(正常〜II度以上の5段階)をリアルタイム表示。1日1件(同日は上書き)
- **グラフ**: 6系列トレンド(左腕・右腕・左右平均の上下)+基準線(高血圧140/90、正常120/70)、
  期間切替(7/14/30日)、腕別平均値カード、血圧判定の分布(左腕基準)
- **設定**: GitHubバックアップのトークン設定・手動保存・復元(app-syncのUIをそのまま利用)

## 開発

    npm test        # node:test(依存なし)
    node tools/serve.js  # http://localhost:8123 で動作確認

## 構成

- `js/classify.js` — JSH血圧分類(純ロジック)
- `js/records.js` — localStorage記録の読み書き(1日1件)
- `js/stats.js` — 期間フィルタ・平均・分布
- `js/bpChart.js` — トレンドグラフSVG生成
- `js/backup.js` — バックアップpayloadの構築と検証
- `js/recordForm.js` / `graphView.js` / `settingsView.js` / `app.js` — 各タブのUI
