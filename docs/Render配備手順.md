# Streamlit ViewerのRender配備手順

対象：`airway-digitaltwin-db`を含まない、Streamlit Viewer単体の配備（仕様書§10-2、実装タスクリスト§5-1）。
リポジトリ：https://github.com/junhongo-ccs/airspace
Blueprint定義：`render.yaml`（リポジトリ直下）

Drone-web（Laravel）・MySQLはPhase A/Bが未完了のため、本手順の対象外。`render.yaml`にも含めていない。

---

## 1. Blueprintから作成

1. Renderダッシュボード（https://dashboard.render.com/）にログインする。
2. 「New +」→「Blueprint」を選択する。
3. GitHubリポジトリ `junhongo-ccs/airspace` を選択する。初回はRenderからGitHubへのアクセス許可（リポジトリ選択）が必要。
4. `render.yaml` が自動検出され、サービス `airspace-viewer`（Python Web Service）の内容が表示される。
5. プランを確認する。`render.yaml`では暫定で `starter` を指定している。実際に契約している安価な有償プラン名と異なる場合は、この画面またはデプロイ後のサービス設定で選び直す。
6. リージョンは `singapore` を指定している（Render に東京リージョンが無いため最寄り）。変更したい場合はここで選び直す。
7. 「Apply」でデプロイを開始する。

## 2. 環境変数の設定（デプロイ前後どちらでも可）

`render.yaml` は `APP_ACCESS_CODE` を `sync: false` で宣言しているため、値はダッシュボード側で個別に設定する必要がある（リポジトリには含めていない）。

1. 作成されたサービス `airspace-viewer` → 「Environment」タブを開く。
2. `APP_ACCESS_CODE` に、関係者だけに共有する合言葉を設定する（仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」への対応）。
3. 保存すると自動的に再デプロイされる。

**注意**：これはAPI認証やネットワーク制限の代替ではない、簡易な入室確認に過ぎない（`viewer/src/access_gate.py` 参照）。将来Drone-web APIを外部公開する際は、仕様書§9-1が求めるAPI認証・ネットワーク制限を別途実装すること。

## 3. デプロイ確認

1. 「Logs」タブでビルド・起動ログを確認する。`streamlit run viewer/app.py` が起動し、エラーが出ていないことを確認する。
2. サービス上部に表示されるURL（`https://airspace-viewer-XXXX.onrender.com` 形式）を開く。
3. `APP_ACCESS_CODE` を設定した場合はアクセスコード入力画面が出ることを確認する。
4. 入室後、design.mdどおりの画面（左設定パネル・地図・登録/照会結果・免責フッター）が表示されることを確認する。
5. 「航路を登録」→「周辺データを照会」を実行し、モックデータで地図・テーブル・CSV/GeoJSONダウンロードが動くことを確認する（`viewer/README.md`の「現在の状態」を参照。Phase A/B未実施のため実データではない）。

## 4. 既知の制約

- 無料プランではなく有償プランを使う前提のため、スリープ（アイドル時の自動停止）は基本的に発生しない想定。実際の挙動はプランの仕様に従う。
- Drone-web・MySQLは未配備のため、左パネルで「モックAPIを使用する」をOFFにしても接続先が存在せず、Disconnected/Errorになる。これは想定どおりの挙動。
- `render.yaml`のリージョン・プラン名は暫定値。実際の契約内容に合わせてダッシュボード側で調整すること。

## 5. 今後（Phase A/B着手後）

Drone-webを配備する場合は、`render.yaml`にDocker Web Service（Laravel）とMySQL互換マネージドDBのサービス定義を追加する。ローカルDocker環境の準備は別途、仕様書§10-1（Zscaler等のプロキシ・証明書の切り分け）に従う。
