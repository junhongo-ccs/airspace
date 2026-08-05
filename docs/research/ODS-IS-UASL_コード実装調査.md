# ODS-IS-UASL コード実装調査

作成日：2026年8月5日  
調査対象：GitHub Organization `ODS-IS-UASL` の公開18リポジトリ（各リポジトリの `main` を2026年8月5日に shallow clone して確認）  
調査方針：READMEの説明を根拠にせず、ソース、設定、API定義、DBスキーマ／マッパー、コンテナ定義、テスト構成を確認した。

> 注意：各リポジトリは公開履歴が1コミットに圧縮されているため、コードの変更経緯や実運用環境での有効化設定までは判定できない。本書の「実装」は、公開時点のソース中に存在することを意味し、稼働中であることを意味しない。

---

## 1. 結論

ODS-IS-UASLは、単に個別APIを置いたリポジトリ集ではない。航路画定、安全管理、資産管理、予約、外部連携、ID／認可、決済、空域デジタルツイン、画面を別実装として組み合わせる、分散型の業務システムである。

特に航路予約は中核の調停層である。Go実装の `CompositeReservationOrchestrator` が、航路予約の永続化に加え、機体・離着陸場の外部予約を順に実施する。失敗時には Saga として成功済みの外部予約取消し、および自身の予約レコード削除を行う。さらにODSのL2／L3／L4、航路画定、適合性評価、決済の各ゲートウェイIFを持つ。

一方で、これらを一括起動する完全なプロダクト構成は公開されていない。DIPS、Weathernews、気象データ提供元、L3 Identity／OpenFGA、MQTT、各DB、外部決済などの接続情報は環境変数・プレースホルダであり、個別契約・環境構築が前提である。

---

## 2. 実装上の全体像

```text
Vue/Nuxt GUI
  │  （BFF的な server/api を含む）
  ▼
proxy（nginx + Lua） ── トークンイントロスペクション ── ユーザ認証システム
  │
  ├── airway-design       ── 落下範囲・飛行可能空間・航路
  ├── safety-management   ── 飛行ログ・位置・逸脱・ニアミス・通知
  ├── airway-reservation  ── 航路／機体／離着陸場の複合予約・精算
  ├── asset               ── 機体・ペイロード・離着陸場・価格・各予約
  ├── external            ── DIPS・SWIM・予約通知
  ├── user-management     ── L3 Identity・OpenFGA・利用者／事業者属性
  └── 空域デジタルツイン ── SpatialId／Drone-web／SpaceInfra
                                  ▲
                    気象取得（Java系、Python/Weathernews系）

決済リファレンス（FastAPI）は、L2のデータ交換結果を基に取引・料金モデル・
支払予定／請求予定を管理する別サービスとして存在する。
```

---

## 3. コードから確認した主要サービス

### 3-1. 航路予約：`airway-reservation`

- Go + Echo + PostgreSQLのサービスで、通常APIと月次精算用の別エントリーポイントを持つ。
- APIは一覧、仮押さえ、空き確認、見積、予約完了通知、検索、取消、確定、撤回、削除を公開する。
- `CompositeReservationOrchestrator` は機体予約とポート予約を外部APIで実行し、結果の外部予約IDを自サービスに対応付けて保存する。
- 外部予約の成功をSagaのステップとして記録し、後続失敗時には機体／ポート予約の取消しと航路予約レコードの削除を行う。外部呼出しには指数バックオフのリトライを使用する。
- インフラゲートウェイとして、機体、ポート、航路画定、適合性評価、飛行計画、決済、ODS L2 discovery／proxy、L3認証、L4を定義している。したがって予約サービスは、他サービスを横断するオーケストレーターである。
- `monthly_settlement` コンテナも同梱され、予約DBの精算データを対象にする設計である。

### 3-2. 航路画定：`airway-design`

- Java／Spring Boot。`Aircraft`、`MaxFallRange`、`FallDistance`、`FeasibleVol`、`DronePortsMapping`、`UaslDesign`、`UaslList` のREST APIと対応するコントローラを持つ。
- ソースとOpenAPI定義が同居し、航路画定の入出力契約だけでなくアプリケーション実装を含む。
- 開発・ステージング・本番相当のプロパティにMQTT接続先があり、コンテナ環境ではActiveMQ系のホスト名を用いる設定がある。

### 3-3. 安全管理：`safety-management`

- Java／Spring Boot。飛行中の監視に関係する `DroneLocation`、`FlightLogs`、`ConformityAssessment`、`MonitoringNotification`、`NearMissInformation`、`PlannedDeviation`、`ThirdPartyEntryNotification`、`UaslReservation`、`Idid` を実装対象にしている。
- MQTT用コントローラがあり、航路予約・制限空域などを非同期に受ける構成である。
- テストは91ファイルあり、公開リポジトリ群の中では比較的テストが多い。

### 3-4. 機体・離着陸場資産：`asset`

- Java／Spring Bootの `droneport-server`。機体（Aircraft）、機体予約、離着陸場（DronePort）、離着陸場予約、価格（Price）を別ドメインとして扱う。
- パッケージは `arm`（Aircraft Resource Management）、`dpm`（Drone Port Management）、`prm`（Price Resource Management）に分かれる。
- PostGISを前提にし、機体／ポート予約は航路予約からOpenAPIゲートウェイ経由で利用される。
- テストは102ファイルある。

### 3-5. 外部連携：`external`

- Mavenマルチモジュール構成で、認証、DIPS、通知、SWIM、アプリケーション起動を分離する。
- DIPSトークン取得、飛行禁止エリア受信、飛行計画取得、航路情報のDIPS出力、予約通知、SWIM出力／フィードバックのコントローラ実装を含む。
- `variables.env` はDIPSの各URL、クライアント資格情報、MQTT、SWIM接続先を未設定値で要求する。OSS単体では外部接続できない。

### 3-6. ユーザ・事業者管理：`user-management`

- JavaのMavenマルチモジュール構成。L3 Identity Componentへの登録・更新・削除と、ドローン固有の利用者／事業者属性を扱う。
- 属性にはDIPSアカウント、SWIM事業者IDなどが含まれる。
- 操作前にOpenFGA評価APIを呼び出して書込み認可を判定する実装であり、単なる属性DBではない。

### 3-7. 決済：`uas-lines-opendataspaces-payment-reference`

- FastAPI + SQLAlchemy + Alembic migrations + Helmの構成で、料金モデル、データ交換状態、取引、支払予定、請求予定を実装する。
- `PaymentBillingService` は、消費者・提供者双方のデータ交換ステータスが `completed` で、設定有効時にはL2 HTTPステータスが `200` の取引だけを集計対象にする。
- 集計はトラッキングID単位で行い、同じ取引束のデータIDと金額をまとめて支払予定／請求予定として返す。
- L3、認可、利用者属性、外部決済のクライアントを持つ。外部決済連携の実効性は接続先設定と契約に依存する。
- テストは42ファイル、コンテナ、Helm、cronjob構成がある。

---

## 4. 空域デジタルツインと気象

### 4-1. `airway-digitaltwin-db`

- C++主体の複合リポジトリで、`SpatialId`、`drone-web`、`spaceInfra-cpp` を含む。
- `SpatialId` は空間ID関連ライブラリ、`drone-web` はWeb/API側、`spaceInfra-cpp` は空間インフラ・点群等の処理側という構成である。
- SQLite関連のコードには移行を示すTODOが残る。空間処理のすべてが完成済み・運用済みであるとは公開コードだけでは断定できない。

### 4-2. `airway-digitaltwin-windspeed-and-rainfal`

- Pythonの常駐バッチで、予報と実況の二つの定期ジョブを並行実行する。
- Weathernews API設定を読み、取得結果をデジタルツインの登録APIへHTTP送信する。アクセストークンはユーティリティで復号して用いる。
- 予報と実況の実行間隔、対象領域、高度、要素、登録済み基準時刻の保存先はYAML設定で制御する。

### 4-3. `airspace-digitaltwin-weather-and-prohibitedarea`

- Java／Spring Bootの二サービス（気象データ連携、飛行禁止エリア連携）で構成される。
- こちらはPython系とは別のデータ取得・変換・配信経路である。

### 4-4. 空域デジタルツインAPIの確認根拠

以下は、公開コードの当該ファイルを直接確認した結果である。実際に起動・疎通を確認した結果ではない。

| 事実 | 根拠ファイル |
|---|---|
| `Drone-web` はAPIサーバーとして位置付けられる | `airway-digitaltwin-db/README.md:6-8` |
| APIのルートプレフィックスは `airDtw/api` | `drone-web/laravel/app/Providers/RouteServiceProvider.php:31-34` |
| 航路の登録・取得ルートが定義されている | `drone-web/laravel/routes/api.php:49-52`（`POST`／`GET` `/drone_route`） |
| 地物ボクセル、エリア、汎用オブジェクト、風、気象、飛行禁止区域のルートが定義されている | `drone-web/laravel/routes/api.php:53-70` |
| Sanctum認証を包むルートグループはコメントアウトされている | `drone-web/laravel/routes/api.php:46, 82` |
| 既定のDB接続はMySQL | `drone-web/laravel/config/database.php:18, 46-64` |
| リポジトリのライセンスはApache License 2.0 | `airway-digitaltwin-db/LICENSE:2-4` |

公開ルートの認証グループがコメントアウトされていることは、**公開コード上の既定状態**を示すだけであり、実環境が無認証であることを意味しない。PoCでの外部公開時には、別途認証またはネットワーク制限を必須とする。

---

## 5. 画面・ゲートウェイ

### 5-1. `airway-gui`

- Nuxt/Vueの画面実装で、航路作成、分岐追加、落下許容範囲、航路予約、航路状態、機体、離着陸場、料金、関係者、DIPS認可、通知を扱う。
- `server/api` に多数のサーバー側APIプロキシがあり、単なる静的SPAではない。航路画定、予約、資産、外部連携のバックエンドを呼び分けるBFF的な役割を持つ。
- MQTTクライアント、OIDC／Keycloak関連の処理、401時の認証処理を含む。
- リポジトリ内には `nec` と `hitachi` の実装ツリーが共存するため、どちらを本番ビルド対象とするかはコンテナ構築手順またはデプロイ設定で確認する必要がある。

### 5-2. `proxy`

- nginx/OpenResty設定であり、Luaにより内部の`/auth`へトークンイントロスペクション要求を行う。
- 認可判定に失敗すれば401／403、認証サービス側の障害系では500を返す。
- 空域デジタルツイン、航路画定、航路予約、安全管理、資産、外部連携などへパス単位で転送する。
- 利用者トークンをバックエンドへそのまま渡さない構成であり、予約サービス向けにはバックエンド用の固定APIキーを `Authorization` に設定する。
- CORSは `Access-Control-Allow-Origin: *` としている。実環境でこの設定をそのまま採用するかはセキュリティ上の確認事項である。

---

## 6. 実装物ではない／限定的なリポジトリ

| リポジトリ | コード確認結果 |
|---|---|
| `.github` | 組織プロフィールと画像。アプリケーション実装なし。 |
| `webapi-oas-UASL` | OpenAPI YAML定義。実装本体なし。 |
| `uas-lines-opendataspaces-l2-l3-reference` | ODS L2/L3連携の資料・参照構成。実装コードなし。 |
| `webapi-generated-backend-UASL` | Spring Bootの旧自動生成バックエンド。READMEでも後継への移行済みとされる。 |
| `flight-geography-lib` | `flight-geography-library-1.0.jar` のバイナリ配布。ライブラリ内部のソースは公開されていない。 |
| `spatial-data-hub-infrastracture` | スクリプト／デモ寄りの構成で、主要業務サービスではない。 |

---

## 7. 実装から見える運用・技術上の論点

1. **全体稼働には多数の外部依存がある**  
   DIPS、Weathernews、MQTT、PostgreSQL／PostGIS、L3 Identity、OpenFGA、ODS L2/L4、外部決済の設定が別途必要である。公開コードだけを取得しても統合環境は完成しない。

2. **コンポーネント間の結合はAPIと非同期メッセージの混在である**  
   予約はHTTP APIで資産等を呼び、航路画定・安全管理・外部連携にはMQTTも現れる。障害時の整合性は、少なくとも予約側ではSaga補償により扱おうとしている。

3. **決済は「航路料金の月次処理」と「ODSデータ取引決済」が別系統である**  
   `airway-reservation` の月次精算と、FastAPIのODS決済リファレンスは同じ業務語を使うが、後者はL2データ交換の取引を基礎にした汎用決済サービスである。直接の完全統合は公開コードだけでは確認できない。

4. **公開品質はリポジトリごとに差がある**  
   航路画定・安全管理・資産・決済にはテストが相当数ある一方、予約、空域デジタルツイン、GUIなどには公開テストが少ないか存在しない。テスト数だけで品質を断定はできないが、検証可能性の濃淡はある。

5. **公開履歴から保守の継続性は評価しにくい**  
   取得した各`main`は履歴が1コミットであり、実装がいつ・どのように変更されたかはGitHub公開履歴から追跡できない。

---

## 8. 調査時点の取得情報

- Organization：`https://github.com/ODS-IS-UASL`
- 取得日：2026年8月5日
- 取得方法：GitHub APIでpublic repository一覧を取得し、各`main`を`--depth 1`でclone
- 取得対象：18リポジトリ
- ローカル確認用コピー：`C:\github\airspace\_analysis\ODS-IS-UASL`
