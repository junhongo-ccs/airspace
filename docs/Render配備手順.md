# RenderへのPoC配備手順

対象：Streamlit Viewer、Drone-web（Laravel）、MySQLの3サービス（仕様書§10-2、実装タスクリスト§1・§5-1）。
Viewerリポジトリ：https://github.com/junhongo-ccs/airspace
Drone-webリポジトリ：https://github.com/junhongo-ccs/airway-digitaltwin-db（ODS-IS-UASL/airway-digitaltwin-dbのfork。Apache License 2.0）
Blueprint定義：`render.yaml`（junhongo-ccs/airspace リポジトリ直下）

## 全体構成

| サービス | 種別 | 公開範囲 | 役割 |
|---|---|---|---|
| airspace-viewer | Web Service（Python、Docker不要） | 公開（アクセスコードで入室制限） | Streamlit Viewer |
| airspace-drone-web | Private Service（Docker） | Render内部のみ（外部到達不可） | Drone-web API、簡易APIキー認証で保護 |
| airspace-mysql | Private Service（Docker、公式mysqlイメージ＋永続ディスク） | Render内部のみ | Drone-webの永続ストア |

仕様書§10-2は「MySQLは永続ディスクだけで代用しない」＝本来はマネージドDB推奨としているが、
Renderにネイティブ管理MySQLが無いため、本PoCではPrivate Service＋永続ディスクで割り切る
（レビュー時の合意事項）。

`airspace-drone-web`をPrivate Serviceにしているのは、仕様書§9「外部公開前にAPI認証・
ネットワーク制限を追加する」に対応するため。簡易APIキー認証（`X-API-Key`ヘッダー、
`VerifyApiKey`ミドルウェア）と、Render内部ネットワークからしか到達できない構成の
二重防御にしている。本格的なSanctumトークン認証はまだ導入していない。

---

## 1. Blueprintを同期する

既存の `airspace-poc` Blueprint（junhongo-ccs/airspace）を更新すると、`render.yaml`に
追加した `airspace-mysql` と `airspace-drone-web` が新規サービスとして検出されるはず。

1. Renderダッシュボードで `airspace-poc` Blueprintのページを開く。
2. 「Manual Sync」を実行し、最新コミットを取り込む。
3. `airspace-drone-web` は別リポジトリ（`junhongo-ccs/airway-digitaltwin-db`）を参照するため、初回はそのリポジトリへのアクセス許可を求められる可能性がある。許可する。
4. 新規サービス2件（`airspace-mysql`、`airspace-drone-web`）の作成内容が表示される。プラン・リージョンを確認し、問題なければ適用する。

**もし `render.yaml` の検証エラーが出た場合**（`fromService`や`dockerfilePath`等のフィールド名がRender側の現行仕様と合わない可能性がある）：エラーメッセージをそのまま開発者に共有してほしい。フィールド名を実際の仕様に合わせて修正する。

## 2. 環境変数を設定する

`render.yaml`で`sync: false`にしている項目は値をリポジトリに含めていないため、各サービスの
「Environment」タブで個別に設定する。下記の値は今回のセッションで生成したものなので、
このまま使うか、社内のシークレット管理ルールに従って別の値に差し替えてよい。

### airspace-mysql

| キー | 値 |
|---|---|
| `MYSQL_ROOT_PASSWORD` | チャットで共有した値を使用 |
| `MYSQL_PASSWORD` | チャットで共有した値を使用 |

### airspace-drone-web

| キー | 値 |
|---|---|
| `APP_KEY` | チャットで共有した `base64:...` の値 |
| `API_KEY` | チャットで共有した値 |
| `DB_PASSWORD` | airspace-mysqlの`MYSQL_PASSWORD`と**同じ値** |

`DB_HOST`は`render.yaml`の`fromService`でairspace-mysqlから自動注入される想定。もし空欄になる場合は、airspace-mysqlサービスの内部ホスト名（サービス詳細画面に表示される）を手動で設定する。

### airspace-viewer

| キー | 値 |
|---|---|
| `APP_ACCESS_CODE` | 関係者に共有する合言葉（既存の手順どおり） |
| `DIGITAL_TWIN_API_KEY` | airspace-drone-webの`API_KEY`と**同じ値** |

`DIGITAL_TWIN_HOST`・`DIGITAL_TWIN_PORT`は`fromService`でairspace-drone-webから自動注入される想定。

## 3. マイグレーションの確認

`airspace-drone-web`の起動時（`docker/entrypoint.sh`）に`php artisan migrate --force`を
自動実行する。「Logs」タブで以下を確認する。

- `Migrating: ...` のログが並び、エラーなく完了していること
- 最終的に `Your service is live` 相当のメッセージが出ること

失敗する場合は、`DB_HOST`/`DB_PASSWORD`がairspace-mysql側の値と一致しているかをまず疑う。

## 4. 動作確認

1. `airspace-viewer`のURLを開き、アクセスコードで入室する。
2. 左パネルの「モックAPIを使用する」をOFFにする。「API接続先」「APIキー」は環境変数から自動で埋まっているはず（空なら手動入力）。
3. API接続状態が `● Connected` になることを確認する（`Connected（mock）`ではなく実接続の表示）。
4. 「航路を登録」→「周辺データを照会」を実行し、実際にDrone-web／MySQLへ登録・取得できることを確認する。
5. 登録したレコードに`POC-CHICHIBU-`接頭辞とPoCメタデータが付与されていることを確認する（仕様書§6-1、受入基準#8）。

## 5. 既知の制約・今後の課題

- 認証は簡易APIキーのみ。本格的なSanctumトークン認証・ユーザー単位の権限管理は未実装（仕様書§12の未決定事項）。
- MySQLはRenderのPrivate Service＋永続ディスクで代用しており、自動バックアップ等の運用面はマネージドDBに劣る。長期運用する場合は外部マネージドMySQL（PlanetScale、Aiven等）への移行を検討する。
- Phase B（PLATEAU秩父市2025データの投入）はまだ実施していない。API疎通確認ができても、地物ボクセル等は空またはPoC用のダミーデータのみ。
- ローカルDocker環境（仕様書§10-1）は今回使っていない。ローカル検証が必要になった場合は、Zscaler等のプロキシ・証明書の切り分けを別途行うこと。
