# ドローン航路システム（ODS-IS-UASL）調査メモ

作成日：2026年8月4日 ／ 用途：自分用の整理＋部内共有の元原稿
調査方法：GitHub organization `ODS-IS-UASL` の全18リポジトリのREADME・ファイル構成をすべて実読、およびNTTデータ／NEDO等の公表資料を確認

> **本メモの記載方針**：READMEや公表資料に「書かれていること」のみを記載しています。推測が入る箇所は【推測】と明記しました。

---

## 0. 3行サマリ

1. **ODS-IS-UASL** は、国（IPA/DADC・経産省・NEDO）主導の「ドローン航路システム」を構成するソフトウェアを、機能単位で公開したOSSリポジトリ群。全18本、ほぼMITライセンス。
2. **NTTデータの関与は2階層**。ドローン航路システム側では3本（API Gateway・外部システム連携）を担当。加えて、その下を支える **ODSのL2（トランザクションレイヤ）基盤そのもの** の著作権者でもある。
3. つまりNTTデータは、**縦（ドローンという1ユースケース）と横（全産業共通のデータ連携基盤）の両方に足を置いている**。

---

## 1. 背景 — ウラノス・エコシステムとOpen Data Spaces

### 1-1. 推進体制

| 主体 | 役割 |
|---|---|
| IPA デジタルアーキテクチャ・デザインセンター（DADC） | ODSを主導する中立機関。アーキテクチャ設計を統括。特定個社へのベンダーロックイン回避と国際的相互運用性の担保を目的と明記 |
| 経済産業省 | ウラノス・エコシステム、デジタルライフライン全国総合整備計画の所管 |
| NEDO | 開発・実証事業の実施主体（公募・採択） |

### 1-2. 用語

- **ウラノス・エコシステム**：企業・業界・国境をまたぐ横断的なデータ連携のイニシアティブ。
- **Open Data Spaces（ODS）**：国や組織ごとの多様性を尊重する、オープンでスケーラブルな分散データマネジメントの技術コンセプト。
- **ODS-RAM**：ODSのリファレンスアーキテクチャモデル。4つの疎結合なレイヤ＋4つのパースペクティブで構成。

### 1-3. ODS-RAM の構成（GitHub `open-dataspaces` の記載より）

**ファンダメンタルサービス（全産業共通の土台）**

| レイヤ | 内容 | Organization |
|---|---|---|
| L1 | データレイヤ | ODS-DFS-L1 |
| **L2** | **トランザクションレイヤ** | **ODS-DFS-L2** ← NTTデータ担当 |
| L3 | アイデンティティレイヤ | ODS-DFS-L3 |
| L4 | セマンティクスレイヤ | ODS-DFS-L4 |
| CF | 各レイヤ共通機能 | ODS-DFS-CF |

**コンプリメンタリサービス**：ODS-DCS（決済など）
**SDK**：ODS SDK for Onboarding、SDK for Semantics

**インダストリサービス（ユースケースごとの縦割りソフトウェア）**

| 略称 | 分野 |
|---|---|
| CAVC | 自動運転支援道 |
| IMDX | インフラDX |
| **UASL** | **ドローン航路** ← 本調査の対象 |
| ALCA | 自動車LCA |
| ASDP | 車載半導体データプラットフォーム |
| STID | 4次元時空間ID |
| EDCS | 奥能登版デジタルライフライン |
| BPM | 日本版電池パスポート管理 |
| SSCR | 半導体サプライチェーン強靭化 |
| IDI | サプライチェーンデータ連携基盤 |

---

## 2. ODS-IS-UASL の基本情報

| 項目 | 内容 |
|---|---|
| 正式名 | Open Data Spaces Industry Services — Unmanned Aircraft Systems Lines |
| 日本語 | ドローン航路システム |
| リポジトリ数 | **18本**（すべて public、既定ブランチ `main`、アーカイブ済みは0本） |
| ライセンス | MITが中心。例外は `airway-digitaltwin-db`（**Apache 2.0**）、および表記なし3本（`.github` / `webapi-oas-UASL` / `spatial-data-hub-infrastracture`） |
| 作成時期 | 大半が2025年4月 |
| 最終更新 | 2026年3月末〜4月1日に集中（年度末の一括公開） |
| 公開メンバー | 0人（メンバーでないと閲覧不可） |
| フォロワー | 23 |
| 所在地表記 | Japan |

---

## 3. 全18リポジトリ

### A. 航路の中核業務（4本）

| リポジトリ | 内容（README記載） | 言語 | 著作権 |
|---|---|---|---|
| **airway-design** | 航路画定モジュール。①最大落下範囲の管理 ②ドローン航路設定可能空間の算出 ③画定した航路情報の管理。Dockerイメージで提供 | Java | IntentExchange |
| **airway-reservation** | 航路予約システム。11本のAPI（仮押さえ／確定／取消／撤回／削除／一覧×2／詳細／空き状況／料金見積もり／予約完了通知）。月次精算バッチ搭載 | Go 1.23 + PostgreSQL 15 + MQTT | KDDIスマートドローン |
| **safety-management** | 安全管理モジュール。①気象情報等から飛行可否を評価 ②飛行実績の蓄積と共有 ③航路逸脱のモニタリングと通知 | Java | IntentExchange |
| **flight-geography-lib** | 落下分散計算ライブラリ。航路画定で使用（利用時は airway-design を参照せよ、と明記） | — | IntentExchange |

**airway-reservation の月次精算バッチ 処理フロー（README記載）**

1. **集計（Phase 1）**：前月分のステータス `RESERVED` の予約を `ex_administrator_id × operator_id` 単位でグループ化し、`uasl_settlements` テーブルにUPSERT
2. **未提出取得（Phase 2）**：`submitted_at IS NULL` の精算レコードを取得
3. **決済API呼び出し（Phase 3）**：L3認証トークンを取得し、金額確定APIを呼び出し。成功後に `payment_confirmed_at` → `submitted_at` の順で更新（**二重決済防止**）

### B. 空域デジタルツイン・気象（4本）

| リポジトリ | 内容 | 言語 | 著作権／ライセンス |
|---|---|---|---|
| **airway-digitaltwin-db** | 空域デジタルツイン本体。3部構成 — `SpatialId`（空間ID計算ライブラリ）／`Drone-web`（APIサーバー）／`SpaceInfra-cpp` | C++ | **Apache 2.0**（18本中唯一） |
| **airspace-digitaltwin-weather-and-prohibitedarea** | Spring Boot 2サーバー。①DIPSから飛行禁止エリアを定期取得しMQTTへ配信 ②気象業務支援センターのSFTPからGRIB2形式の気象データを取得・変換し空域デジタルツインへ登録 | Java（パッケージ `com.hitachi`） | MIT |
| **airway-digitaltwin-windspeed-and-rainfal** | 気象予報登録／気象実況登録。**Weathernews** のAPIから取得 | Python | NEC |
| **spatial-data-hub-infrastracture** | 空間IDをキーに標高・風速を可視化するデモUI（MapLibre） | Shell | **ライセンス表記なし** |

**取得している気象要素（README記載）**

- 予報：`ugrd`（東西風成分）／`vgrd`（南北風成分）／`tmp`（気温）／`apcp`（降水量）／`lcdc`（下層雲量）
- 実況：`ugrd` ／ `vgrd` ／ `hgt`（高度）／ `pres`（気圧）
- メッシュサイズ：250 / 500 / 1000 / 2000m、高度は10m単位で指定
- 気象業務支援センターからは：降水ナウキャスト（nowc）／降水短時間予報（srf）／極地数値予報モデル（lfm）

### C. 基盤・共通（5本）

| リポジトリ | 内容 | 言語 | 著作権 |
|---|---|---|---|
| **proxy** | 認証・認可API Gateway（**nginx版**）。ユーザ認証システムで認証・認可し、適切なバックエンドへルーティング | — | **NTTデータ** |
| **user-management** | ユーザ管理ライブラリ(Java版)。L3-identity-componentへのユーザ／事業者情報の登録・更新・削除、属性情報の参照。**OpenFGAの設定が必要** | Java | グリッドスカイウェイ |
| **asset** | 離着陸場・機体リソース管理API。離着陸場／機体（ペイロード・飛行許可申請情報含む）／料金単価／予約。Java 17 + Spring Boot 3.3.2 + PostGIS 3.4.2。VIS（テレメトリ）とMQTT連携 | Java | **日立＋グリッドスカイウェイの2ライセンス併記** |
| **external** | 外部システム連携ライブラリ(Java版)。DIPS 2.0へのトークン発行、飛行禁止エリア・飛行計画情報の取得、予約情報のメール配信、SWIM連携用Excelダウンロード | Java | **グリッドスカイウェイ＋NTTデータ** |
| **airway-gui** | 共通GUI。READMEはほぼ空で、手順は同梱の `コンテナ構築手順.xlsx` を参照 | Vue | NEC |

※ `asset` の用語注記：「droneport」＝機械式に限らない簡易離着陸場を含むドローンの離着陸場。「ペイロード」＝機体のオプションパーツ等の意（貨物や積載可能量の意ではない）。

### D. 仕様・ODS連携リファレンス（4本）＋ `.github`

| リポジトリ | 内容 |
|---|---|
| **webapi-oas-UASL** | API仕様。中身は `docs/` のみ：`Near_miss_information.yaml`（ニアミス情報）／`aircraft.yml`／`droneport.yml`／`airwayReservations/openapi/` 一式。ライセンス表記なし |
| **uas-lines-opendataspaces-l2-l3-reference** | ODSのL2（API Gateway）／L3（OpenFGA）の利用方針・構成を整理した**文書のみ**のリポジトリ。「実装コードや実際の設定ファイルを格納することを目的としたものではない」と明記 |
| **uas-lines-opendataspaces-payment-reference** | 精算決済サービス。利用料モデル管理／取引可否確認（与信）／データ交換状態管理／支払・請求予定額算出／外部決済サービス連携（**現状はダミー**）。Python。グリッドスカイウェイ |
| **webapi-generated-backend-UASL** | 2024年度デジタルライフライン全国総合整備計画の実証用資材。**非推奨（deprecated）と明記**。後継は `ODS-DFS-L2/dp-webapi-autogen`。Java。NTTデータグループ／NTTデータ |
| **.github** | 組織プロフィールREADMEとロゴ画像の置き場 |

---

## 4. ベンダー分担マップ

| 企業・団体 | 担当リポジトリ |
|---|---|
| **IntentExchange** | airway-design（航路画定）／safety-management（安全管理）／flight-geography-lib（落下分散計算） |
| **KDDIスマートドローン** | airway-reservation（航路予約・月次精算） |
| **NEC（日本電気）** | airway-gui（共通GUI）／airway-digitaltwin-windspeed-and-rainfal（気象取得） |
| **日立製作所** | asset（共同）／airspace-digitaltwin-weather-and-prohibitedarea（パッケージ名 `com.hitachi`） |
| **グリッドスカイウェイ** | user-management／external（共同）／uas-lines-opendataspaces-payment-reference／asset（共同） |
| **NTTデータ** | **proxy／external（共同）／webapi-generated-backend-UASL（非推奨）** |

**要点**：1社が全部を作るのではなく、機能単位で分担している。ドローン固有の業務ロジック（航路画定・安全評価・予約）は他社が担当し、NTTデータは**境界（外部連携）とセキュリティ（認証・認可）**を押さえている。

---

## 5. 業務の流れ（リポジトリ構成から読み取れる範囲）

```
① 航路を設計する        airway-design（+ flight-geography-lib で落下分散を計算）
        ↓
② 空域の状態を把握する   airway-digitaltwin-db（空間ID）
                        + 気象データ（NEC / 日立の2系統）
                        + 飛行禁止エリア（DIPS 2.0 経由）
        ↓
③ 予約する              airway-reservation（仮押さえ→確定）
                        asset（離着陸場・機体リソースの予約）
        ↓
④ 安全に飛ばす          safety-management（飛行可否評価・逸脱モニタリング・通知）
        ↓
⑤ 料金を精算する        airway-reservation 月次精算バッチ
                        → uas-lines-opendataspaces-payment-reference（決済）

    全体を貫くもの：proxy（認証・認可）／user-management（ID）／
                    external（外部連携）／airway-gui（画面）
```

---

## 6. 外部データへの依存

| 提供元 | データ | 備考 |
|---|---|---|
| **DIPS 2.0**（国土交通省航空局） | 飛行禁止エリア、飛行計画 | 連携には**事前にクライアントID発行手続きとDIPSアカウント作成が必要** |
| **気象業務支援センター** | GRIB2形式の降水ナウキャスト／降水短時間予報／極地数値予報モデル | SFTP経由。**「データを加工せずに第三者に公開することはできる限りご遠慮いただきたい」** と注意書きあり。2次利用時の負担金は要相談 |
| **Weathernews** | 風速・気温・降水量・下層雲量・気圧 | **契約が必要**とREADMEに明記。アクセストークンはbase64化して設定 |
| **気象協会（JWA）** | 風速（デモで2024/1/1 10:00 標高150mを使用） | デモリポジトリのみ |
| **国土地理院** | 数値標高モデル DEM10B | デモリポジトリのみ |

---

## 7. NTTデータの取り組み

### 7-1. 【第1層】ドローン航路システム内での担当 — 「玄関番」

| リポジトリ | 役割 | 位置づけ |
|---|---|---|
| **proxy** | 認証・認可API Gateway（nginx版） | NTTデータ単独 |
| **external** | DIPS 2.0トークン発行、飛行禁止エリア・飛行計画取得、予約情報メール配信、SWIM連携用Excelダウンロード | グリッドスカイウェイとの共同 |
| **webapi-generated-backend-UASL** | 2024年度実証用。**非推奨**、後継は `ODS-DFS-L2/dp-webapi-autogen` へ移行済み | 役目を終えた |

### 7-2. 【第2層】ODS基盤そのもの — こちらが本丸

**`open-dataspaces/L2-dp-webapi`（Web API転送モジュール）の著作権は NTTデータグループ／NTTデータ。**

- ODS-RAMの**トランザクションレイヤ（L2）**のデータプレーンモジュールの1つ
- 低ペイロードのWeb API転送に特化したAPIゲートウェイ
- ドローンだけでなく、**自動運転・インフラDX・電池パスポート・自動車LCAなど全産業のインダストリサービスが共通で使う土台**

**技術構成（README記載）**

| 要素 | 採用技術 |
|---|---|
| フレームワーク | Spring Cloud Gateway（Java 21 / Maven） |
| IdP（認証） | Keycloak |
| 認可 | OpenFGA、**AuthZEN**準拠のPEP機能 |
| ルート管理DB | PostgreSQL（Flywayでマイグレーション） |
| Mock | Prism |
| 提供形態 | Docker / Docker Compose |

> **今回の最大の発見**：ODS-IS-UASL の `uas-lines-opendataspaces-l2-l3-reference` が参照している L2 が、まさにNTTデータ製。UASL側で3本しか持っていないように見えるが、その下の共通基盤を押さえている。

### 7-3. 【別枠】ドローン事業としての取り組み

**airpalette® UTM**（NTTデータの登録商標、2017年提供開始）

- FOS（Flight Operation System）：飛行ルート設定・自動遠隔制御
- UTM core：一定空域内の複数機の位置情報を一元管理し、空中衝突の危険や禁止空域への侵入を検知

**複数USP間の飛行計画調整実証（2025年2月19〜20日）**

| 項目 | 内容 |
|---|---|
| 場所 | 福島ロボットテストフィールド（福島県南相馬市） |
| 参加 | KDDI（推進）、トラジェクトリー、Terra Drone、NTTデータ |
| NTTデータの役割 | **DIPS 2.0を模擬する機能**と、複数USPによる検証システムの構築 |
| 検証内容 | 複数USP共存時の飛行計画調整手法／国際標準フォーマット準拠の制限空域情報連携／実機の試験飛行 |
| シナリオ | 重複解消／飛行時間調整／災害時の緊急用務空域設定時の計画調整 |
| 位置づけ | NEDO「次世代空モビリティの社会実装に向けた実現プロジェクト（ReAMo）」の一環 |

背景として、国土交通省航空局が**「UTMサービスプロバイダー認定制度」**を検討中。この制度開始に向けた環境整備が狙い。

### 7-4. 社内の担当部署（公表資料より）

| 領域 | 部署・連絡先 |
|---|---|
| ドローン航路システム | `info@airpalette.net` |
| UTM／airpalette | 第一公共事業本部 モビリティ＆レジリエンス事業部 **航空システム統括部** |
| データスペース基盤 | 第一公共事業本部 パブリックサービスデザイン事業部／NTTデータグループ 技術革新統括本部 Innovation技術部 |

---

## 8. 事業ステータス

### 8-1. NEDO「デジタルライフライン整備事業／ドローン航路の開発」（2025年10月14日 採択公表）

| 項目 | 内容 |
|---|---|
| 採択者 | **9者** — グリッドスカイウェイ、IntentExchange、KDDIスマートドローン、トラジェクトリー、東京大学、日立製作所、**NTTデータ**、NEC、宇宙サービスイノベーションラボ |
| 実施期間 | **2025年9月〜2026年3月末（予定）** |
| 前身 | 2024年度「産業DXのためのデジタルインフラ整備事業／デジタルライフラインの先行実装に資する基盤に関する研究開発」の成果を継承 |

**既存の整備実績（2024年度）**

- 浜松市 天竜川上空：約 **180km**
- 秩父エリア 送電設備上空：約 **150km**

**今後の取り組み（公表内容）**

1. 複数事業者の**相互乗り入れ**等の実現を目指したドローン航路システムの改修・高度化
2. エアモビリティデータスペース群の確立（ウラノス・エコシステム連携）
3. 仕様・規格への適合性認証制度等の運用、国際標準化／海外展開に向けた戦略検討
4. 航路の相互乗り入れ実証や国際標準化活動

### 8-2. NEDO「ウラノス・エコシステムに資するデータスペース基盤整備・普及促進事業」（2025年7月14日 採択公表）

- 採択者：**NTTデータグループ**（一般社団法人 自動車・蓄電池トレーサビリティ推進センターとの共同提案）
- 内容：データスペース基盤のプロトコル設計、構成要素となるソフトウェア技術の開発・実証
- 適用予定ユースケース：自動車業界、化学業界、**デジタルライフライン全国総合整備計画のアーリーハーベストプロジェクト（ドローン航路、インフラ管理DX、自動運転サービス支援道等）**
- 方針：**開発する技術仕様・ソフトウェアは原則OSSとして公開**

---

## 9. 部内で押さえておきたい論点

1. **「共創」の実態**
   組織トップには「共創しています」とあるが、`airway-reservation` は「IssueやPull Requestは受け付けておりません」、`airway-gui` は「本ソフトウェアに関する問い合わせは一切受け付けません」と明記。実態は**共同開発の場ではなく、成果物の配布場所**。

2. **更新が年度末で止まっている**
   2026年3月末〜4月1日の一括更新以降、動きがない。年度単位の成果物公開という運用形態。継続的なメンテナンスが行われる保証はREADMEには書かれていない。

3. **NTTデータの立ち位置は「縦」より「横」が効いている**
   UASL内では3本（うち1本は非推奨）だが、ODS L2という全産業共通基盤の著作権者。他インダストリサービス（自動運転、インフラDX等）にも同じ構図が波及する可能性がある。

4. **外部データの商用契約が前提**
   Weathernewsとの契約、DIPSのクライアントID発行、気象業務支援センターの負担金。**OSSを取得しただけでは動かない**。

5. **ライセンスの不統一**
   MIT中心だが `airway-digitaltwin-db` のみ Apache 2.0、3本は表記なし。`asset` は日立とグリッドスカイウェイの2ファイル併記。利用時は個別確認が必要。

---

## 10. 出典

**GitHub**

- ODS-IS-UASL 組織トップ — https://github.com/ODS-IS-UASL
- Open Dataspaces Organization — https://github.com/open-dataspaces
- open-dataspaces/L2-dp-webapi — https://github.com/open-dataspaces/L2-dp-webapi
- 各リポジトリのREADME（18本すべて実読）

**公表資料**

- NEDO「デジタルライフライン整備事業／ドローン航路の開発」に採択（NTTデータ, 2025/10/14）
  https://www.nttdata.com/global/ja/news/topics/2025/101400/
- ウラノス・エコシステムに資するデータスペース基盤の構築・実証を開始（NTTデータ, 2025/7/14）
  https://www.nttdata.com/global/ja/news/topics/2025/071400/
- ドローン運航管理システム（UTMS）を活用した複数運航者間での飛行計画調整によるドローン接近回避の実証に成功（NTTデータ, 2025/5/16）
  https://www.nttdata.com/global/ja/news/topics/2025/051601/
- airpalette UTM（NTTデータ） — https://www.nttdata.com/jp/ja/lineup/airpaletteutm/
- ウラノス・エコシステム（経済産業省） — https://www.meti.go.jp/policy/mono_info_service/digital_architecture/ouranos.html
- Open Data Spaces（IPA） — https://www.ipa.go.jp/digital/opendataspaces/
