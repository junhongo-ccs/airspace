# 空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書

版：1.2（DID地区の地図描画対応版）  
作成日：2026年8月7日  
ステータス：Phase A受入基準達成、Phase Bは建物・道路・土砂災害・洪水浸水・土地利用を部分達成（地形のみ未着手）、§5-3高度基準統一は建物レイヤ＋150m高度制限に限り達成、飛行禁止エリアはDID地区（実データ）を追加。Phase C（Viewer）はStreamlitからReact＋FastAPI BFFへ実装が移行済み（Streamlit版の正式廃止は未決定、§4-1参照）。React版はDID地区・建物のジオメトリを地図に描画できる  

| 版 | 日付 | 変更内容 | 対応レビュー |
|---|---|---|---|
| 1.2 | 2026年8月7日 | React版のDID地区（人口集中地区）を地図に描画できるようにした。実APIレスポンス自体にはポリゴン座標が含まれないが、DID地区はimport時に安定した識別子（flightProhibitedAreaId、例: `DID-11207-CHICHIBU`）を持つため、国土数値情報A16-2020（埼玉県）から秩父市分のMultiPolygon（3サブポリゴン、最大1289頂点）を再取得し、`viewer/src/data/flight_prohibited_areas.json`として保存・BFF経由でクライアントに返すようにした。地図には交差ハッチ（design.md §5-3 `--map-prohibited`）で描画する。道路・土砂災害・洪水浸水・土地利用はimport時にランダムUUIDが割り当てられておりソース側の要素へ再度たどれないため、同じ手法は使えず引き続き対象外と判明した。§4-1・§7-3を更新。 | 実装セッション（2026-08-07、[進捗ログ](進捗ログ.md)参照） |
| 1.1 | 2026年8月7日 | Phase C（Viewer）がStreamlitからReact＋TypeScript＋FastAPI BFF（`viewer-react/`＋`viewer_api/`）へ実装が移行したことを反映（移行自体は2026-08-06に実施済みだったが未反映だった）。あわせて、地物照会が始点座標のみでbboxを作っており空間IDが1タイルずれて常に0件になっていたバグを修正（始点・終点の両方から作るよう変更）。判定詳細（150m AGL判定・建物垂直判定）をBFFに実装（`viewer/src/altitude.py`をStreamlit版と共有）。建物フットプリント（`lod0RoofEdge`）をPLATEAU CityGMLから再抽出し（高さのみ保存済みで、フットプリントは未保存だったため）、React版の地図にPhase B投入分29件の建物ポリゴンを描画できるようにした。§4・§4-1・§7-3・実装タスクリストを更新。 | 実装セッション（2026-08-07、[進捗ログ](進捗ログ.md)参照） |
| 1.0 | 2026年8月6日 | 飛行禁止空域3類型のうち、150m高度制限（空間データ不要）とDID地区（国土数値情報A16、秩父市、実データ）を実装した。DIPS・日立のSpring Bootサービスは使わず、PLATEAU同様「ネイティブ変換exeを経由せず直接DB投入」する方式（`digitaltwin:import-flight-prohibited-area`）を採用。空港周辺（②）は国土数値情報が制限表面を含まないため対象外。既定航路とDID地区の位置が約3km離れているため、DID地区の取得確認には始点座標の変更が必要である旨を明記。§7-2-補（新設）・§6-2・実装タスクリストを更新。 | 実装セッション（2026-08-06、[進捗ログ](進捗ログ.md)参照） |
| 0.9 | 2026年8月6日 | 高度基準統一（§5-3）に建物レイヤに限り着手・達成した。PLATEAU建物のCityGML宣言（EPSG:6697＝JGD2011標高、地理院DEMと同一鉛直基準）と、AGL・measuredHeightがともに地盤面基準の相対高さであることを根拠に、絶対標高変換を行わずAGLと建物高さを直接比較する方式を採用（`viewer/src/altitude.py`）。LOD0フットプリントのz座標が全件0.0固定で実測許容差を算出できなかったため、暫定許容差±2mをドローン運用の一般的な安全マージンとして採用（実測未検証、要ラベル明記）。あわせて、建物投入データ中1件（`11207-bldg-96`）のmeasuredHeightがPLATEAUの欠測値センチネル`-9999`であった不具合を発見・修正（高さ情報なし扱いに変更）。建物以外のレイヤは高さ情報が無いため引き続き「未検証」。§5-3・§11受入基準#9・§12を更新。 | 実装セッション（2026-08-06、[進捗ログ](進捗ログ.md)参照） |
| 0.8 | 2026年8月6日 | Phase Bを継続し、土地利用（`udx/luse`、対象2次メッシュ`533970`）もPLATEAU秩父市2025の実データから投入した。ファイルサイズ（約19MB、圧縮後約3.4MB）を理由に見送っていたが、HTTP Range取得で全体取得後、既定航路周辺±0.008度で5302件中99件に絞り込み`ground_feature_objects`へ登録（`object_cd=5`）。他レイヤと異なり航路周辺に絞ったため、`GET /ground_feature_voxel`で実際に土地利用1件を取得できることを確認した（建物・土砂災害と合わせて3レイヤが取得可能に）。§7-2・実装タスクリストを更新。地形（`udx/dem`）を除きPhase B主要レイヤの投入が完了。 | 実装セッション（2026-08-06、[進捗ログ](進捗ログ.md)参照） |
| 0.7 | 2026年8月6日 | Phase Bを継続し、道路（30件）・土砂災害警戒区域（13件）・洪水浸水想定区域（20件）もPLATEAU秩父市2025の実データからground_feature_objectsへ投入した（`object_cd`は1=建物・2=道路・3=土砂災害・4=洪水浸水という本PoC独自の割り当て）。`GET /ground_feature_voxel`が空間IDの完全一致検索のみで周辺検索ができない制約が実際に確認された（既定航路の位置では建物・土砂災害の2件のみ取得、道路・洪水浸水は別タイルのため0件）。§7-2・§11・実装タスクリストを更新。 | 実装セッション（2026-08-06、[進捗ログ](進捗ログ.md)参照） |
| 0.6 | 2026年8月6日 | Phase Bに着手し、PLATEAU秩父市2025の実建物データ（3次メッシュ`53397062`、29件）をground_feature_objectsへ投入し、APIから取得できることを実際に確認した。`SpaceInfra-cpp`がWindows専用プロジェクトでRenderでは動かせないこと、Laravel側にも地物ボクセルの登録APIが存在しないことが判明したため、自前のPython変換＋Artisanコマンドによる直接DB投入で代替する方針とした。§7-2・§11・§12・§14-2を更新。 | 実装セッション（2026-08-06、[進捗ログ](進捗ログ.md)参照） |
| 0.5 | 2026年8月6日 | `drone_route_id`不一致バグの修正（fork）を実際にデプロイ・動作確認し、Phase A受入基準#2（航路の登録・取得）を達成。`ground_feature_voxel`の`$request`型ヒント欠落による500エラーを修正。注意区域の登録・取得を、tinkerでのDB手動投入（ネイティブ変換処理の代替）により実際に確認し、受入基準#3を達成。`area`/`flight_prohibited_area`取得結果のPoC判定を接頭辞ベースに修正し、受入基準#8を達成。§11の各項目の充足状況を更新し、§6-2・§7-4・§14-2に追記。 | 実装セッション（2026-08-06、[進捗ログ](進捗ログ.md)参照） |
| 0.4 | 2026年8月5日 | Streamlit ViewerおよびDrone-webの実装・Render配備を実施し判明した事実を反映。API各エンドポイントの実際の必須パラメータ・レスポンス形式（§6-2）、空間IDの実仕様（ズーム17固定・Web Mercatorタイル形式）、drone_route取得が主キー`drone_route_info_id`とクライアント採番`drone_route_id`の不一致により機能しない点、area/flight_prohibited_area登録がネイティブ変換処理に依存し取得側が機能しない可能性がある点、Render配備の実際の構成（MySQLはPrivate Service＋永続ディスクで代替、ローカルDockerではなくRenderのPrivate Serviceで検証）を追加。§6冒頭・§7-1・§10-3の前提を「ローカルまたはRender Private Service」に統一。§14に実コード確認根拠（§14-2、forkのパス起点ルールを明記）を追加。 | 実装セッション（2026-08-05、[進捗ログ](進捗ログ.md)参照。レビュー指摘を反映） |
| 0.3 | 2026年8月5日 | 実コード確認の根拠、PLATEAU秩父市2025を正データとする方針、高度基準、PoC識別、ライセンス、撤退基準、実行環境上の注意を追加。フェーズ呼称をA/B/Cへ統一。 | 仕様レビュー指摘（第2回・第3回） |
| 0.2 | 2026年8月5日 | Streamlit単体GIS評価から、空域デジタルツインをデータ基盤として直接起動・活用する構成へ変更。 | 仕様レビュー指摘（第1回） |

---

## 1. 目的

ODS-IS-UASLの `airway-digitaltwin-db` を空域データ基盤として起動し、無償公開GISデータを三次元空間情報として登録・照会・可視化するPoCを作る。

このPoCでは、**PLATEAU秩父市2025**の建物、地形、洪水浸水、土砂災害、土地利用、道路を正データとして、次を検証する。国土地理院DEMは品質比較用とし、国土数値情報はPLATEAUに不足するレイヤが必要になった場合だけ後続で扱う。

1. 公開GISデータを、空域デジタルツインが扱う空間ID／ボクセル／APIの単位へ変換できること。
2. 空域デジタルツインのAPIを通じ、航路・地物・注意区域を登録・取得できること。
3. Streamlit画面から候補航路と空域レイヤを重ね、評価根拠を可視化できること。
4. 後続の `airway-design`、`safety-management` と接続できるデータ境界を明らかにすること。

初期対象地域は、**秩父市の2025年度PLATEAU整備範囲内にある1三次メッシュ相当**とする。対象メッシュ内に、実在の航路ではない**仮想の1〜3km航路**を設定する。

Streamlitは空域デジタルツインの代替DBではない。データ登録・照会を行うデモUIとし、空間データの永続管理は空域デジタルツイン側に置く。

---

## 2. 安全・業務上の位置付け

### 2-1. 対象

- 机上検討、地域・事業者への説明、データ連携の技術検証
- 公開GISを空域デジタルツインへ格納する手順の検証
- 候補航路と静的な地形・建物・注意区域の相対比較
- ODS-IS-UASL各サービスと接続する前のデータ品質・インターフェース確認

### 2-2. 対象外

- 飛行許可・承認の判定、DIPS 2.0への飛行計画提出
- 航空法その他の法令適合性・安全性の保証
- 実運航中のUTM、飛行制御、衝突回避
- リアルタイム気象、電波、第三者侵入、動的障害物を用いた安全判断
- 実運用の予約、決済、利用者認証・認可

画面、APIレスポンス、およびダウンロード出力には常時、次を表示する。

> 本ツールは公開GISデータを用いた机上検討用PoCです。飛行可否、法令適合性、安全性を保証せず、実運航・飛行計画提出には使用できません。

**例外（2026年8月7日、ユーザー判断）**：React版（`viewer-react/`）は社内限定公開のPoCであるため、
画面上の固定フッター表示は完全に削除した。この免責文言の「常時表示」要件は、React版に限り
明示的に撤回されている。CSV／GeoJSON出力（Streamlit版のみ実装、§7-3手順6）には引き続き
本文言を含めること。公開範囲が変わる場合（社外公開等）は、この例外を見直すこと。

---

## 3. 活用するODS-IS-UASL実装

| リポジトリ／構成要素 | PoCでの役割 | 活用度 |
|---|---|---:|
| `airway-digitaltwin-db/drone-web`（表示名：Drone-web） | Laravel/MySQLのAPIサーバー。航路、地物ボクセル、エリア、風、気象、飛行禁止区域を登録・照会する。 | 直接利用（中核） |
| `airway-digitaltwin-db/SpatialId` | 三次元空間IDを算出する。変換・照会のキー設計に使用する。 | 直接利用候補 |
| `airway-digitaltwin-db/spaceInfra-cpp`（表示名：SpaceInfra-cpp） | CityGML、点群、エリア等の前処理・ボクセル化に使用する。 | 直接利用候補 |
| `airway-design` | 登録済みの航路・障害物データを、飛行可能空間・落下範囲評価へ渡す後続候補。 | 後続接続 |
| `safety-management` | 注意区域・気象・逸脱などのイベント連携先。 | 後続接続 |
| `airway-gui` | 航路中心の画面設計および接続先の参考。 | UX参照 |

`airway-reservation`、`asset`、`external`、`user-management`、`proxy`、決済は、本PoCでは直接起動しない。これらは実運用に近い予約・認可・DIPS・決済の領域であり、GIS／デジタルツインの検証スコープから分離する。

---

## 4. システム構成

```text
                 PLATEAU秩父市2025（MVPの正データ）
     建物・地形・洪水浸水・土砂災害・土地利用・道路
                                │
                        GIS変換・登録バッチ
                                │
        ┌───────────────────────▼──────────────────────┐
        │ 空域デジタルツイン                             │
        │  SpatialId                                     │
        │  spaceInfra-cpp（前処理）                       │
        │  drone-web /airDtw/api                          │
        │  MySQL（永続ストア）                            │
        └───────────────────────┬──────────────────────┘
                                │ HTTP API
        ┌───────────────────────▼──────────────────────┐
        │ FastAPI BFF（viewer_api/）                     │
        │ ・Reactからの唯一の接続先                       │
        │ ・DigitalTwinApiClientでLaravelを呼ぶ           │
        │ ・判定詳細（150m AGL・建物垂直判定）を付与       │
        └───────────────────────┬──────────────────────┘
                                │ HTTP（CORS許可）
        ┌───────────────────────▼──────────────────────┐
        │ React（viewer-react/、実装の主系統）           │
        │ ・航路入力／登録                               │
        │ ・レイヤ照会／地図可視化（MapLibre GL）         │
        │ ・静的リスクの説明・出力                        │
        └───────────────────────┬──────────────────────┘
                                │
                              Render
              （UI、BFF、API、DB、バッチを別サービスで配備）

  ※ Streamlit版（viewer/）は2026-08-06にReact＋BFFへ移行した。判定ロジック
    （viewer/src/altitude.py等）はBFFがモジュールとしてimportして共有しており、
    Streamlitプロセス自体は不要。廃止するか維持するかは未決定（§4-1参照）。

  地理院DEM ───→ 品質比較・欠測確認（永続登録しない）
  国土数値情報 ┄→ PLATEAUに不足するレイヤのみ後続で登録
```

### 4-1. サービス分割

| サービス | 実装 | 責務 | 配備先 |
|---|---|---|---|
| Digital Twin API | `Drone-web`（Laravel/PHP） | 空域データの登録・照会 | **実績**：Render Docker Private Service（`airspace-drone-web`、外部非公開） |
| Digital Twin DB | MySQL | Laravelの永続データストア | **実績**：Render Private Service（`airspace-mysql`、公式イメージ＋永続ディスク。§10-2・§12参照） |
| GIS ETL | Python／C++バッチ | GISをAPI投入形式・空間ID・ボクセルへ変換 | Render Cron Job／Background Worker、または手動実行（Phase B、未着手） |
| BFF | FastAPI（`viewer_api/`） | ReactからLaravelへの唯一の接続経路。CORS・認証情報の露出を防ぐ | **実績**：Render Web Service（`airspace-viewer-api`、公開） |
| Viewer（主系統） | React＋TypeScript＋Vite＋MapLibre GL（`viewer-react/`） | データの登録操作、照会、可視化、CSV/GeoJSON出力 | **実績**：Render Web Service（`airspace-viewer-react`、公開）。BFF経由でのみLaravelへ接続 |
| Viewer（旧系統） | Streamlit（`viewer/`） | React移行前のViewer実装。判定ロジック（`viewer/src/altitude.py`等）はBFFがモジュールとして共有利用しており、プロセス自体は不要になっている | **稼働中だが廃止方針は未決定**：Render Web Service（`airspace-viewer`、公開・アクセスコードで入室制限）。2026-08-06にReact＋BFFへ移行済み（進捗ログ参照） |

RenderへViewerだけを置く構成ではない。LaravelとMySQLを必要とする。当初はまずローカルDockerで起動・疎通を確認してからの配備を想定していたが、実際にはローカルDocker環境が無かったため、Render上に直接サービスを構築して疎通確認した（§10-1実績注記）。2026-08-06のReact＋BFF移行により、Renderの有償サービスはStreamlit版を含めて4つ（`airspace-viewer`／`airspace-viewer-react`／`airspace-viewer-api`／`airspace-drone-web`）＋DBの`airspace-mysql`に増えている。コスト確認は未実施（進捗ログ参照）。

---

## 5. データ仕様と登録方針

### 5-1. 対象地域の選定

| 項目 | 決定内容 |
|---|---|
| 対象自治体 | 埼玉県秩父市 |
| 対象範囲 | PLATEAU 2025の索引図から選ぶ1三次メッシュ相当（おおむね1km四方） |
| 初期航路 | 対象範囲内の仮想1〜3km航路 |
| 選定理由 | ドローン航路の先行地域という文脈に加え、PLATEAUに建物、地形、洪水浸水、土砂災害、土地利用、道路のレイヤがそろうため。 |
| 禁止する表現 | 仮想航路を「秩父地域の実際のドローン航路」「飛行可能な航路」と表現しない。 |

実在する送電網上空のドローン航路については、公開情報で正確な座標・区間・利用条件を確認できた場合に限り、後続フェーズで比較対象として扱う。

| データ | 初期利用 | 変換／登録先 | PoCでの使い方 |
|---|---|---|---|
| 国土地理院・標準地図タイル | 背景地図 | 永続登録しない | Streamlitの地図背景に表示する。 |
| 国土地理院・DEM | 背景・欠測確認・品質比較 | MVPでは永続登録しない | PLATEAU地形モデルの妥当性を確認する補助データ。 |
| PLATEAU秩父市2025 | 建物、地形、洪水浸水、土砂災害、土地利用、道路 | `SpaceInfra-cpp`での変換可能性を検証し、地物ボクセルまたはエリアへ登録 | **MVPの正データ**。静的空域レイヤを一つのデータセットから構成する。 |
| 国土数値情報 | PLATEAUで不足するレイヤのみ | MVP外。必要時にエリアまたは汎用オブジェクトとして登録 | PLATEAUに同種レイヤがある洪水、土砂災害、土地利用は二重登録しない。 |
| 気象庁防災情報XML | 後続フェーズ | 気象／風の登録API | 注意情報として扱う。実運航用途にはしない。 |

### 5-2. データメタデータ

すべての登録データに、少なくとも次を付与する。

- データ名称、提供者、URL、ライセンス、取得日、加工日
- 元データの座標参照系、変換後の座標参照系
- 対象範囲、時点、解像度またはLOD
- 変換ツールとバージョン、変換パラメータ

PLATEAUと国土数値情報はデータセットごとに個別の利用条件を確認し、出典と加工の事実を画面・出力へ記載する。

### 5-3. 高度基準の統一

MVPにおける静的レイヤの正データはPLATEAU秩父市2025とする。地理院DEMは表示・欠測確認・品質比較だけに使い、二つの地形データを同じ評価式で混在させない。

PLATEAU地形・建物、地理院DEM、SpatialId／ボクセル、入力AGLは、高度基準面・単位・座標参照系が一致することを確認するまで、相互の数値比較をしてはならない。特に、ボクセルが楕円体高等で格納される場合は、PLATEAU／DEMの標高との変換パラメータを検証してから使用する。

高度比較を有効化するための前提条件は次のとおりとする。

1. 各入力データの水平・鉛直座標参照系、単位、時点を記録する。
2. 変換が必要な場合、変換式・ジオイドモデル・実装ライブラリ・バージョンを登録する。
3. 既知地点でPLATEAU、DEM、ボクセルの高度を比較し、許容差を定義する。
4. これらが完了するまで、画面は「高度比較未検証」と表示し、垂直方向の交差・離隔判定を出力しない。

AGLは地盤標高を基準とする入力値である。計画絶対高度への変換および建物高さとの比較は、上記前提を満たした後にのみ有効化する。

**実績（2026年8月6日、建物レイヤに限定して有効化）**：

1. PLATEAU建物のCityGML（`gml:Envelope`の`srsName`）を実ファイルで確認した結果、
   `http://www.opengis.net/def/crs/EPSG/0/6697`が宣言されていた。EPSG:6697は
   「JGD2011＋JGD2011（vertical）height」の複合座標系で、鉛直方向は国土地理院が
   地理院DEM等でも用いる標高（ジオイド補正済み、楕円体高ではない）。`measuredHeight`は
   CityGML Buildingモジュールの定義上、地盤面から建物最高点までの相対高さ（m）。AGL入力も
   定義上「地盤面からの相対高さ」であり、両者は同じ基準を共有する。水平座標系は
   Streamlit入力がWGS84、PLATEAU側がJGD2011だが、日本国内での差はメートル未満で
   ズーム17タイル1マス（本PoC対象緯度で約1.5m）と比べて無視できるため変換しない。
2. 上記1の理由により、AGLとmeasuredHeightの比較には絶対標高への変換・ジオイド補正は
   不要と判断した。地理院DEM等の絶対標高データとの混在比較は行わない（本節冒頭の方針どおり）。
3. PLATEAU秩父市2025のLOD0フットプリント（`lod0RoofEdge`）のz座標は取得した29件全件で
   0.0固定であり、実測の地盤標高としては使えないことが判明した（簡易な2次元相当表現と
   判断）。そのため実測誤差からの許容差算出はできず、ドローン運用で一般的な安全マージンを
   暫定許容差として採用した：**AGL_TOLERANCE_M = 2.0m**（`viewer/src/altitude.py`）。
   実運用前には実測（既知地点でのGPS高度・RTK測量等）による検証が必要。
4. 上記1〜3の記録により、**建物レイヤに限り**「検証済み（暫定許容差±2m）」として
   垂直方向の交差判定を有効化した。建物以外のレイヤ（道路・土砂災害・洪水浸水・
   土地利用・注意区域・禁止区域）は高さ情報を保持しないため、引き続き「未検証」のまま。
   受入基準#9は、この「建物のみ検証済み・他は未検証」という状態で条件付き充足とする。

---

## 6. API連携仕様（PoC対象）

公開されている `Drone-web` のルーティングでは、APIプレフィックスは `/airDtw/api` である。根拠は「§14. 実コード確認の根拠」に示す。PoCは少なくとも次のAPI群を確認・利用する。

| API | 操作 | PoC用途 |
|---|---|---|
| `POST /airDtw/api/drone_route` | 航路登録 | Streamlitで指定した候補航路をデジタルツインへ保存する。 |
| `GET /airDtw/api/drone_route` | 航路取得 | 保存済み航路をStreamlitへ表示する。 |
| `GET /airDtw/api/ground_feature_voxel` | 地物ボクセル取得 | 登録済み地形・建物等を航路周辺で照会する。 |
| `POST /airDtw/api/area` | エリア登録 | ハザード・注意区域を登録する。 |
| `GET /airDtw/api/general_purpose` | 汎用オブジェクト取得 | 任意GISレイヤの照会に使う。 |
| `POST /airDtw/api/flight_prohibited_area` | 飛行禁止区域登録 | PoC用の注意区域登録の検証に加え、国土数値情報DID地区（実データ）の投入にも使う契約を確認した。DIPS実データは扱わない（§7-2-補）。 |

風・気象のAPI（`/wind`、`/weather/now`、`/weather/forecast`）は、データ形式と無償ソースからの変換を確認後、**Phase B以降**で扱う。

各エンドポイントの必須パラメータ、認証要否、レスポンス形式は、実際にローカルまたはRender Private Serviceで起動したAPIへ最小データを送って確定する。公開コードのルート定義だけを根拠に、本仕様でJSONペイロードを固定しない。§6-2はRender Private Serviceでの起動検証により確定した内容である。

### 6-1. PoCデータの識別

PoCで作成・登録する全レコードは、実データと機械的に区別できなければならない。

- 識別子または名称には `POC-CHICHIBU-` 接頭辞を必須とする。
- `source`、`created_by`、`created_at`、`environment`、`is_poc` をメタデータとして必須化する。公開APIのペイロードがこれらを受け付けない場合は、関連メタデータテーブルまたはETL監査ログで管理する。
- `environment` は少なくとも `poc-local`、`poc-staging` を区別する。
- PoCレコードを実環境または実運用用DBへ登録しない。

### 6-2. 実コード確認済みのAPIパラメータ（2026年8月5日、v0.4で追加）

§6冒頭で「本仕様でJSONペイロードを固定しない」としていた部分について、実際に
junhongo-ccs/airspace の Streamlit Viewer から junhongo-ccs/airway-digitaltwin-db
（fork、Render Private Serviceとして配備）へ疎通した結果、以下が判明した。
根拠ファイルは §14 を参照。

| API | 実際の必須パラメータ | 備考 |
|---|---|---|
| `GET /drone_route` | `drone_route_id`（数値） | **一覧取得ではない。** 指定idの単体取得のみで、一覧APIは存在しない。無指定・存在しないidは400。 |
| `POST /drone_route` | `drone_route_id`（数値、クライアント採番）、`drone_route_name`、`coordinates`、`from_datetime`（`Y-m-d H:i:s`厳密一致） | 成功時のレスポンス本文は空。**`drone_route_id`はDBの主キーではない**（`drone_route`テーブルの主キーは自動採番の`drone_route_info_id`で、`drone_route_id`は一意制約の無いただのInteger列）。さらに`GET /drone_route`側は`DroneRoute::find($request->drone_route_id)`を呼んでおり、Eloquentの`find()`はモデルの`$primaryKey`（＝`drone_route_info_id`）で検索するため、**クライアントが指定・記憶する`drone_route_id`では実質的に該当行を引けない**。GET側で存在確認を行うには、別途`drone_route_info_id`を返す手段（現状のAPIには無い）か、`drone_route_id`列に対する検索条件への実装修正が必要。 |
| `GET /ground_feature_voxel` | `other.typeCd`（数値）、`identification`（空間ID文字列）、`timing`（日時） | 呼び出し元コントローラはtry/catchしておらず、必須パラメータ欠如は例外未捕捉のまま500になる。レスポンスは緯度経度ポリゴンを含まず、ボクセルビットファイルへの参照（`spatialId`／`voxelBitFileName`等）のみ。地図への直接描画は不可。 |
| `GET /general_purpose` | `identification`、`timing`、`requestType`（`area`／`flightProhibitedArea`／`groundFeature`等） | `requestType=area`の場合は`other[timingTo]`も必須。抽出条件は`from_datetime BETWEEN timing AND timingTo`であり「timing時点で有効か」ではない。 |
| `POST /area` | `features`（GeoJSON Feature配列。各Featureに`geometry.coordinates`、`properties.area`、`properties.timestamp`、`properties.intrusionStatus`、`properties.traffics[].currentTime`） | 成功時のレスポンス本文は空。DBの主キー（`area_object_id`、自動採番）はAPIから返らないため、`properties.area`に指定した値を手掛かりに追跡する必要がある。 |
| `POST /flight_prohibited_area` | `flightProhibitedAreaInfo`（配列。`flightProhibitedAreaId`、`name`、`range`、`flightProhibitedAreaTypeId`、`startTime`等） | `startTime`は空白除去後に独自変換（`ApiFunction::edit_datetime`）を経るため、一般的なISO8601とは異なる入力形式を要求する。 |

**area・flight_prohibited_areaの登録は、外部のネイティブ実行ファイル
（`popen('start /B '.$cmd)`で起動、`SpaceInfra-cpp`相当と推定）を呼び出し、
空間IDとの紐付けテーブル（`area_detail_objects`／`flight_prohibited_area_objects`）
を作成する設計になっている。** このexeは`airway-digitaltwin-db`リポジトリに
同梱されておらず、Docker配備にも含めていないため、**登録（POST）自体は成功しても、
一覧取得（`GET /general_purpose`）が恒久的に空を返す可能性が高い**。§7-4・§11の
評価に影響する既知のリスクとして扱う。

**実績（2026年8月6日）**：飛行禁止区域について、PLATEAU地物投入と同じ「ネイティブ変換
処理を経由せず、マスタ行・空間ID紐付け行を直接作成する」方式で、本物の飛行禁止エリア
データ（国土数値情報 人口集中地区＝DID地区、A16-2020、埼玉県、秩父市分1件）を投入した
（Artisanコマンド`digitaltwin:import-flight-prohibited-area`、junhongo-ccs/airway-digitaltwin-db）。
DIPS実データは扱わない方針は変わらないが、DIPSを経由しない別の公式オープンデータ
（国土数値情報）で「本物の」飛行禁止エリアレイヤを実現できた。DID地区は航空法上の
飛行禁止空域3類型の1つ（人口集中地区の上空）に該当する。詳細は§7-2の実績注記を参照。

空間IDの水平方向の仕様も確認できた：`ApiFunction::get_spatial_xy_on_point`は
ズームレベル17固定のWeb Mercatorスライッピータイル座標（`"{zoom}/0/{x}/{y}"`
形式、OSM等のXYZタイルと同じ計算式）を返す。§12で未決定としていた「空間ID仕様」
のうち水平方向の形式はこれで判明した。高度方向の扱い（AGLとの対応、ボクセルの
鉛直分割）は実コードからは未確認のまま残る。

---

## 7. 実施フェーズと機能仕様

本仕様でいうMVPは、**Phase Cを完了した状態**を指す。Phase A、B、Cの順に進め、前フェーズの成功条件を満たすまで次フェーズへ進まない。

### 7-1. Phase A：起動・API登録検証

1. `Drone-web` とMySQLを、ローカルコンテナまたはRenderのPrivate Serviceとして起動する。
2. マイグレーションを実行し、航路・エリア・地物関連テーブルを作成する。
3. サンプル航路を `drone_route` APIへ登録し、同APIから取得できることを確認する。
4. サンプルGeoJSONから作成した注意区域を、エリアまたは禁止区域APIへ登録する。
5. 登録したデータをAPIで照会し、空間ID、座標、高度、メタデータの保持状況を確認する。

### 7-2. Phase B：PLATEAU静的GISの投入

1. 秩父市PLATEAU 2025の索引図から、対象の一三次メッシュ相当を選ぶ。**実績（2026年8月6日）**：3次メッシュ`53397062`を選定（索引図と厳密に照合したものではなく、CityGML ZIP内の建物ファイルサイズから実際に建物が一定数含まれるメッシュを選んだ）。
2. 同データセットの建物、地形、洪水浸水、土砂災害、土地利用、道路の各レイヤを取得する。**実績**：建物・道路・土砂災害・洪水浸水・土地利用（`udx/bldg`・`udx/tran`・`udx/lsld`・`udx/fld`・`udx/luse`配下のCityGML）を取得。ZIP全体（580MB）はダウンロードせず、HTTP RangeリクエストでZIP中央ディレクトリと対象ファイルだけを部分取得した（§14-3・§14-5）。土地利用（`udx/luse`、対象2次メッシュ`533970`で約19MB、圧縮後約3.4MB）はRangeリクエストで全体取得したうえで、既定航路周辺（緯度経度±0.008度）99件に絞り込んで投入した。地形（`udx/dem`は1ファイル300〜500MBのため対象外と判断）のみ未取得。
3. 建物と地形を `SpaceInfra-cpp` により変換できるか確認し、変換結果を地物ボクセルとして登録する。**実績：`SpaceInfra-cpp`は使用不可と判断（§10-3参照）**。Windows専用のVisual Studioプロジェクト（VS2022＋vcpkgの手動セットアップが必要、CMake等の自動ビルドは無し）であり、Renderでは動かせない。加えて、Laravel側にも地物ボクセルを登録するAPIが存在しない（`GroundFeatureVoxelController`等は取得専用、`UserApiController`の"voxel"系メソッドも取得・ダウンロード専用）ことが判明した。代替として、CityGMLをPython（`parse_bldg.py`・`parse_layer.py`）でフットプリント・空間ID（ズーム17）を抽出したJSONに変換し、fork側に追加したArtisanコマンド（`plateau:import-buildings`／`plateau:import-features`）で`ground_feature_objects`へ直接登録した。建物29件・道路30件・土砂災害13件・洪水浸水20件・土地利用99件を登録。`object_cd`は1=建物・2=道路・3=土砂災害・4=洪水浸水・5=土地利用という本PoC独自の割り当て（実コードに定義が無いため）。
4. 洪水浸水、土砂災害、土地利用、道路を、エリアまたは汎用オブジェクトとして登録する。**実績あり**（土地利用を含め全レイヤ登録済み）。ただし`area`／`general_purpose`経由ではなく、建物と同じ`ground_feature_objects`への直接登録とした（`area`経由だとPhase Aで判明したネイティブ変換処理依存の問題を再度踏むため）。
5. 航路周辺の地物・エリアをAPIで取得できることを確認する。**建物・土砂災害・土地利用で実績あり**：`GET /ground_feature_voxel`で、既定航路の位置にある建物1件・土砂災害1件・土地利用1件を取得できることを確認した（同APIは`->first()`で1件のみ返す設計のため、この件数が正しい）。土地利用は既定航路周辺±0.008度で抽出・投入したことで、他レイヤと異なり実際に空間IDが一致し取得できた。道路・洪水浸水は登録済みだが、既定航路の空間IDと一致するデータが無いため未確認（**同APIが空間IDの完全一致検索のみで周辺検索に対応していないための制約であり、データや実装の不備ではない**）。地形は未実施につき確認していない。
6. データセット・出典・変換履歴をDBまたは付属メタデータに保存する。**実績**：`data_sources`テーブルへレイヤごとに、データセット名・出典URL・取得日・座標参照系（EPSG:6697）を登録した。個々の地物には`update_memo`へ詳細（建物ID・高さ・中心座標等）を記録した。

### 7-2-補. 本物の飛行禁止エリア（DID地区）の投入（2026年8月6日追加）

ドローンの飛行禁止空域は航空法上3類型ある：①人口集中地区（DID地区）の上空、②空港等の周辺、
③地表・水面から150m以上の高さ。このPoCでは、`airspace-digitaltwin-weather-and-prohibitedarea`
（日立製作所、Java/Spring Boot、DIPS連携＋MQTT配信）は使わない方針とした（Spring Boot・MQTT
ブローカーという追加インフラが必要でPoCの規模に見合わないため）。代わりに、DIPSを経由しない
別の公式オープンデータで代替できないか調査し、次の実装を行った。

1. **①DID地区**：国土数値情報「人口集中地区データ」（A16-2020、埼玉県、
   `https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A16-2020.html`、GeoJSON形式・
   商用利用可）から秩父市のDID地区（MultiPolygon、最大サブポリゴン1289頂点）を取得した。
   `POST /flight_prohibited_area`はPLATEAU同様ネイティブ変換exe依存で空間ID紐付けが
   機能しないため、Artisanコマンド（`digitaltwin:import-flight-prohibited-area`、
   junhongo-ccs/airway-digitaltwin-db）でマスタ行・空間ID紐付け行を直接作成する方式を
   採用した。DID地区内の実在点（頂点平均、点内包判定済み）の空間ID（ズーム17）で
   紐付けているため、`GET /general_purpose?requestType=flightProhibitedArea`で
   その空間IDに対して取得できる。**既定航路の位置とは約3km離れているため、既定航路
   のままでは取得できない**（道路・洪水浸水と同様の制約）。実際に取得を確認するには、
   始点座標を緯度35.998778・経度139.083660付近に変更して照会する必要がある。
2. **②空港周辺**：国土数値情報「空港データ」（C28）は空港の敷地・標点位置のみで、
   実際の制限表面（進入表面等）を含まないことが判明した。秩父市周辺に大きな空港も
   無いため、本PoCでは未実装（対象外）。
3. **③150m高度制限**：空間データを一切要さない絶対高度ルールのため、AGL入力のみで
   判定できる（`viewer/src/altitude.py`の`evaluate_agl_legal_limit`）。結果テーブルの
   航路行に反映済み。

### 7-3. Phase C：Viewer（2026年8月6日、StreamlitからReact＋BFFへ実装移行）

当初はStreamlit単体で実装したが、2026年8月6日にReact＋TypeScript＋Vite＋MapLibre GL
（`viewer-react/`）＋FastAPI BFF（`viewer_api/`）へ移行した（進捗ログ参照）。判定ロジック
（`viewer/src/altitude.py`）はBFFがStreamlit版と共有してimportしており、以下の手順自体は
変わらない。

1. 始点・終点・地上高（AGL）・評価対象レイヤを入力する。**実績**：React版で実装済み。
2. 航路をデジタルツインへ登録し、登録済み航路として取得する。**実績**：React→BFF
   （`POST /register_route`）→Laravel経由で実装済み。
3. 航路周辺の地物ボクセル、エリア、注意区域をAPIから取得する。**実績（地物ボクセル・
   DID地区）**：React→BFF（`POST /query_features`・`POST /query_prohibited_areas`）で
   実装済み。当初は始点座標のみでbboxを作っており空間IDが1タイルずれて常に0件になる
   バグがあったが、2026年8月7日に始点・終点の両方からbboxを作るよう修正した。注意区域
   （area）はBFFに未実装（Streamlit版のみ）。
4. 地図上に航路と空域レイヤを重ねる。**実績（航路・建物・DID地区）**：MapLibre GLで航路を
   描画。建物はPhase B投入分29件（フットプリント再抽出済み、2026年8月7日）のみポリゴン
   描画に対応。DID地区は国土数値情報A16-2020から秩父市分のジオメトリを再取得し
   （2026年8月7日）、交差ハッチ（design.md §5-3 `--map-prohibited`）で描画に対応した。
   道路・土砂災害・洪水浸水・土地利用は、投入時に安定した識別子ではなくランダムUUIDが
   割り当てられておりソースへ再度たどれないため、同じ手法が使えず引き続き未対応
   （§7-2手順3参照）。
5. 航路と地物／注意区域の交差、取得不能、属性不足を「要確認」として表示する。**実績
   （建物・150m AGL・DID地区）**：BFFが`viewer/src/altitude.py`の判定関数を呼び、
   地物ごとの交差判定と航路のAGL判定をReact版に返すよう2026年8月7日に実装。DID地区は
   同日、再取得したジオメトリでの水平方向簡易判定に対応した。それ以外の飛行禁止区域・
   その他レイヤは「要確認（ジオメトリ未提供）」のまま。
6. 入力値、照会日時、データ出典、結果をCSV／GeoJSONで出力する。**未実装（React版）**：
   Streamlit版のみ実装済み。

### 7-4. 共通の評価上の限界

- **Phase A**では、APIに登録・照会できることを主な成功条件とする。
- 「交差なし」は、登録済みの静的レイヤに限った結果である。
- DEM・建物の精度、変換誤差、更新時点、ボクセル解像度を別途表示する。
- AGL、絶対高度、建物高さ、地形高の比較式は、格納形式を実測してから確定する。
- §5-3の高度基準の統一が完了するまで、垂直方向の交差・離隔判定を表示しない。
- **drone_routeの主キー不一致（2026年8月6日 解消済み）**：`GET /drone_route`が
  主キー`drone_route_info_id`で検索しておりクライアント採番の`drone_route_id`と
  一致しない問題があったが、fork側で`drone_route_id`列を検索するよう修正し
  （コミット`b60544e`）、Render上で登録・取得の往復を確認した（§11-2、§14-2）。
- **ground_feature_voxelの型ヒント欠落（2026年8月6日 解消済み）**：直接ルートとして
  呼ぶとLaravelのDIが解決できず500になる問題があったが、型ヒントを追加して修正
  （コミット`1ebf957`）。Phase Bのデータが無いため、修正後は0件が正しい結果となる。
- **area・flight_prohibited_areaの取得（未解消、運用時の課題として残存）**：登録
  （POST）は成功するが、空間ID紐付け用のネイティブ変換処理が未配備のため、通常の
  運用フローでは一覧取得（GET）が恒久的に空を返す。2026年8月6日、Renderの
  `airspace-drone-web`でtinkerによりDBへ手動投入し、API自体の登録・照会ロジックが
  正しく機能することは確認できた（§11-3）が、これは検証目的の代替手段であり、
  ネイティブ変換処理そのものは依然として未実装・未配備のままである。
- **PoC識別の欠落（2026年8月6日 解消済み）**：`area`/`flight_prohibited_area`の
  取得結果が実APIにis_poc等のメタデータが無いため常に「実データ」表示になって
  いたが、`POC-CHICHIBU-`接頭辞での判定に修正した（コミット`e65d0d6`、§11-8）。

---

## 8. 画面仕様（Streamlit版として策定、React版が実装を引き継ぐ）

design.mdのデザイントークンはそのままReact版（`viewer-react/`）へ流用しており、
下記のレイアウト・必須表示項目はReact版にも適用する（§4-1参照）。

```text
┌──────────────────┬─────────────────────────────────────┐
│ 接続・航路設定    │ デジタルツイン地図                  │
│ ・API接続状態     │ ・地理院背景地図                    │
│ ・始点／終点      │ ・登録済み航路                      │
│ ・AGL             │ ・地物ボクセル／エリア              │
│ ・対象レイヤ      │ ・注意区域・評価結果                │
├──────────────────┴─────────────────────────────────────┤
│ 登録・照会結果：API応答、件数、データ時点、出典           │
├────────────────────────────────────────────────────────┤
│ 交差・情報不足の詳細表／CSV・GeoJSONダウンロード          │
└────────────────────────────────────────────────────────┘
```

必須表示項目は、空域デジタルツインAPIの接続状態、データ取得日時、対象空間IDまたはボクセル解像度、各レイヤの出典、PoC識別子（`POC-CHICHIBU-`接頭辞）、実行環境、`is_poc`の値、実運航に使えない旨の注意文とする。

---

## 9. 非機能・セキュリティ要件

| 項目 | 要件 |
|---|---|
| データ永続化 | 空域デジタルツインのMySQLへ保存する。Streamlitに恒久保存しない。 |
| 公開範囲 | 初期はアクセス制限を掛けた検証環境とする。一般公開はデータ利用条件と脆弱性確認後に判断する。 |
| 認証 | 公開ルートでは認証がコメントアウトされているため、外部公開前にAPI認証・ネットワーク制限を追加する。**実績（2026年8月5日）**：簡易APIキー認証＋Render Private Service化により対応済み（§10-2、§14-2）。本格的なSanctum認証は引き続き未着手（§12）。 |
| 秘密情報 | DIPS、Weathernews、実運用の認証情報を投入しない。 |
| アップロード | 初期は運用者が変換済みのデータを投入し、一般利用者による任意ファイルアップロードは行わない。 |
| 性能 | 対象都市・範囲・ボクセル解像度を限定し、登録と照会の所要時間を計測する。 |
| 監査性 | 登録者、登録時刻、変換元、変換パラメータ、API応答を記録する。 |

### 9-1. ライセンスと帰属表示

`airway-digitaltwin-db` はApache License 2.0で公開されている。派生物を配布する場合は、LICENSE、著作権・特許・帰属表示を保持し、同梱されるNOTICEファイルがある場合はその表示を引き継ぐ。`SpaceInfra-cpp`等の同梱サードパーティライブラリは、各`LICENSE`／`Licenses`を個別に棚卸ししてから配備物へ含める。

PLATEAU、国土地理院、国土数値情報についても、アプリケーションのソフトウェアライセンスとは別に、データセットごとの出典・利用条件を表示する。

---

## 10. 配備方針

### 10-1. ローカル検証

まずDockerでLaravel、MySQL、GIS変換ジョブ、Streamlitを起動する。これにより、APIの必須項目・DB依存・変換実行条件を確定する。

開発PCのZscaler等のプロキシ・証明書設定により、Dockerのイメージ取得、依存パッケージ取得、外部GISタイル／データ取得が失敗する可能性がある。最初の起動検証では、ネットワーク、プロキシ、CA証明書の状況を切り分けて記録する。

**実績（2026年8月5日）**：開発PCにDocker Desktopが未導入であり、Zscaler環境下での
Docker利用可否の切り分けも未実施だったため、ローカルDocker検証は見送った。代わりに
Render上でDrone-web（Laravel）をDocker Web Service（Private Service）として、
MySQLを公式イメージ＋永続ディスクのPrivate Serviceとしてビルド・起動し、Phase Aの
検証をRender上で行った。ビルド自体はRender側がリモートで実行するため、ローカルの
Docker Desktop有無に関わらず実施できることを確認した（§10-2参照）。ローカルでの
再現・デバッグが必要になった場合は、本節の手順を別途実施する。

### 10-2. Render配備

| サービス | Renderでの扱い |
|---|---|
| Streamlit Viewer | Python Web Service（公開）。`PORT`へ`0.0.0.0`でbindする。仕様書§9への対応として簡易アクセスコードで入室制限する。 |
| Laravel API | Docker Private Service（外部非公開）。簡易APIキー認証（`X-API-Key`）で書き込み系エンドポイントを保護する。環境変数にDB接続情報・`APP_KEY`・`API_KEY`を設定する。 |
| GIS ETL | Cron Jobまたは手動実行ジョブ。大容量CityGML／点群処理はRenderのリソース制約を先に検証する。（未着手、Phase B対応） |
| MySQL | **実績（2026年8月5日）**：RenderにネイティブのMySQL管理サービスが無いため（Postgres・Key Valueのみ提供）、公式`mysql:8`イメージ＋永続ディスクのPrivate Serviceで代替した。当初想定していた「互換マネージドDBを選定し、永続ディスクだけで代用しない」方針とは異なる、PoCとしての割り切り。自動バックアップ等の運用面はマネージドDBに劣るため、長期運用する場合は外部マネージドMySQL（PlanetScale、Aiven等）への移行を検討する。 |

初期デプロイでは、DBを一般公開せずLaravel APIからのみ接続可能にする。StreamlitはLaravel APIだけを参照する。

**実績（2026年8月5日）**：Laravel APIも公開Web ServiceではなくPrivate Serviceとして
配備し、Render内部ネットワーク経由でのみStreamlit Viewerから到達できる構成にした。
これにより、簡易APIキー認証と合わせて「認証・ネットワーク制限」の両方（仕様書§9）に
対応している。デプロイ構成の詳細・トラブルシューティング手順は
[Render配備手順.md](Render配備手順.md)を参照。

### 10-3. フォールバックと撤退基準

| 段階 | タイムボックス | 成功条件 | 未達時の判断 |
|---|---|---|---|
| Phase A: 起動・API登録検証 | 10営業日 | `Drone-web`、MySQL、マイグレーション、最小APIがローカルまたはRender Private Serviceで動作し、仮想航路とPoC注意区域を登録・取得できる。 | 原因をランタイム、依存関係、ネットワーク、コード不整合に分類する。大規模改修が必要または解消見込みがない場合、空域デジタルツインの直接利用は停止する。 |
| Phase B: PLATEAU静的GISの投入 | 10営業日 | 小範囲のLOD1建物を変換・登録・照会できる。 | `SpaceInfra-cpp`を使えない場合は、LOD1建物のフットプリントと高さから自前でボクセル化し、同一の登録インターフェースへ投入する代替案を評価する。**実績（2026年8月6日）**：`SpaceInfra-cpp`はWindows専用でRenderでは使用不可と判断し、この代替案を実行した（自前Python変換＋Artisanコマンドで`ground_feature_objects`へ直接投入）。建物29件（1メッシュ）で登録・照会を確認。地形・洪水浸水・土砂災害・土地利用・道路は未実施。 |
| Phase C: Streamlit Viewer | 5営業日 | StreamlitがAPIから航路・空域レイヤを取得し、接続状態・PoC識別・地図・結果を表示できる。 | APIまたはUIの最小限の補正で解決可能かを判断する。解決不能なら、Viewerを単独の照会ツールに限定し、統合PoC完了とはしない。 |

Phase AまたはBで直接利用を停止した場合は、前版の構成へ戻す。すなわちStreamlit＋PostGIS等の独立GIS基盤で、同じデータメタデータ、PoC識別、高度基準の統一、出典表示を維持してPoCを継続する。

---

## 11. 受入基準

以下をすべて満たせば、空域デジタルツイン活用PoCの**Phase C（MVP）**を完了とする。

1. `Drone-web` とMySQLをローカルまたはRender Private Serviceで起動し、マイグレーションを完了できる。**充足（2026年8月5日）**。
2. `POST /airDtw/api/drone_route` でサンプル航路を登録し、`GET`で同じ航路を取得できる。**充足（2026年8月6日）**：`GET /drone_route`が主キー`drone_route_info_id`で検索していたバグ（§6-2）を修正し（fork、コミット`b60544e`）、Render上で実際に登録→取得の往復を確認した。
3. サンプルの注意区域をエリアまたは禁止区域として登録し、APIから照会できる。**充足（2026年8月6日、条件付き）**：登録（POST）は問題なく動作する。取得（GET）はネイティブ変換処理（§6-2）が未配備のため、Renderの`airspace-drone-web`のWeb Shellから`php artisan tinker`で空間ID紐付けテーブル（`area_detail_objects`）へ手動投入し、API自体の登録・照会ロジックが正しく機能することを確認した。**運用でこの基準を恒久的に満たすには、ネイティブ変換処理の実装または代替手段が別途必要**（§7-4参照）。
4. StreamlitがデジタルツインAPIの接続状態と取得結果を表示できる。**充足**。
5. Streamlit上で、登録済み航路・注意区域・背景地図を重ねて表示できる。**一部充足**：航路は地図に表示される。地物ボクセル・注意区域・禁止区域は実APIのレスポンスに緯度経度ポリゴンが含まれないため（§6-2）、結果テーブルには表示されるが地図描画は未対応。
6. 出力に、入力値、API応答時刻、データ出典、変換履歴、注意文を含められる。**充足**（CSV／GeoJSON出力、免責文言含む）。
7. APIがインターネットへ無認証公開されない構成である。**充足**：簡易APIキー認証＋Render Private Service化（§10-2）。
8. PoCレコードが、接頭辞およびメタデータにより実データと機械的に区別できる。**充足（2026年8月6日）**：`area`/`flight_prohibited_area`の取得結果で常に「実データ」表示になっていたバグ（実APIレスポンスにis_poc等のメタデータが無いため）を、`POC-CHICHIBU-`接頭辞での判定に修正（コミット`e65d0d6`）し、Renderで実際に「PoC」表示になることを確認した。
9. 高度基準の統一が完了していない状態では「高度比較未検証」と表示され、垂直方向の交差・離隔判定が出力されない。**充足（2026年8月6日、条件付き）**：§5-3の前提を満たせた建物レイヤは「検証済み（暫定許容差±2m）」として垂直判定を出力する。建物以外のレイヤは高さ情報が無いため引き続き「未検証」と表示し、判定を出力しない。

PLATEAUの建物を `SpaceInfra-cpp` 経由で登録・照会できた場合を、**Phase B**の完了基準とする。**実績（2026年8月6日）**：`SpaceInfra-cpp`はRenderで使用できないと判断し、§10-3が定める代替案（自前でのボクセル化）を採用した。この代替案によりPLATEAU秩父市2025の実データ（建物29件・道路30件・土砂災害13件・洪水浸水20件）を登録し、うち建物・土砂災害はAPIから取得できることを確認した（道路・洪水浸水は登録済みだが、`GET /ground_feature_voxel`が空間ID完全一致検索のみのため既定航路の位置では未確認）。地形・土地利用は未実施であり、Phase Bは部分達成にとどまる。

2026年8月6日時点で、Phase Aの受入基準（#1〜#3、#7〜#9）はいずれも充足した。#5は地図描画の範囲が航路のみという制約付きで一部充足。Phase Bは建物・道路・土砂災害・洪水浸水の登録、および建物・土砂災害の照会を確認（地形・土地利用は未実施、道路・洪水浸水の照会は空間ID不一致のため未確認）。Phase Cとしての完全なMVP完了は、Phase Bの残り作業が未完のため引き続き未達。詳細経緯は[進捗ログ.md](進捗ログ.md)の該当日エントリを参照。

---

## 12. 未決定事項と事前調査項目

| 論点 | 確認・決定事項 |
|---|---|
| 対象メッシュ | 秩父市PLATEAU 2025の索引図を確認し、建物・地形・災害リスクのレイヤが重なる1メッシュを選ぶ。（未着手） |
| MySQLの配備先 | **暫定決定済み（2026年8月5日）**：RenderにネイティブMySQLが無いため、公式イメージ＋永続ディスクのPrivate Serviceで代替（§10-2）。長期運用時は外部マネージドDBへの移行を再検討する。 |
| API認証 | **暫定決定済み（2026年8月5日）**：本格的なSanctum導入までの間、簡易APIキー認証（`X-API-Key`）＋Render Private Serviceによるネットワーク制限を組み合わせる（§10-2）。Sanctum本格導入は引き続き未着手。 |
| APIペイロード | **判明済み（2026年8月5日）**：`drone_route`・`ground_feature_voxel`・`area`・`flight_prohibited_area`（`general_purpose`経由含む）の必須パラメータを実コードから確認（§6-2）。ただしarea／flight_prohibited_areaの取得側はネイティブ変換処理依存の制約が残る。 |
| 変換経路 | **決定済み（2026年8月6日）**：`SpaceInfra-cpp`は不使用。PLATEAU CityGMLをPython（`parse_bldg.py`、junhongo-ccs/airspace）でJSONへ変換し、Laravelのartisanコマンド（`plateau:import-buildings`、junhongo-ccs/airway-digitaltwin-db）で`ground_feature_objects`へ直接投入する。登録用APIが存在しないため、DBへの直接投入以外の経路は無い（§7-2、§14-4）。 |
| 空間ID・ボクセル | **水平方向のID形式は2026年8月5日に判明済み**（§6-2：ズーム17固定のWeb Mercatorタイル形式`"z/0/x/y"`、`ApiFunction::get_spatial_xy_on_point`）。空間ID自体は鉛直方向を含まない（実コード確認済み）。高度基準は**建物レイヤに限り2026年8月6日に統一済み**（§5-3実績）：PLATEAU建物はEPSG:6697（JGD2011標高）で、AGL入力・`measuredHeight`とも地盤面基準の相対高さのため変換不要。暫定許容差±2m。建物以外の鉛直情報・ボクセルの鉛直分割は引き続き未確認。 |
| データ量 | CityGML・点群をRenderで扱えるか。必要なら変換はローカルまたは別バッチ基盤へ分離する。 |
| 気象 | 無償データを取り込む場合の遅延・利用条件・格納形式を確認する。 |

---

## 13. 参照先

- 実装リポジトリ（Streamlit Viewer、Render配備設定）  
  https://github.com/junhongo-ccs/airspace
- Drone-web実装フォーク（Docker配備・簡易APIキー認証を追加）  
  https://github.com/junhongo-ccs/airway-digitaltwin-db
- 実装進捗ログ（日付ごとの作業記録）  
  `C:\github\airspace\docs\進捗ログ.md`
- ODS-IS-UASL コード実装調査  
  `C:\github\airspace\docs\research\ODS-IS-UASL_コード実装調査.md`
- 国土地理院「地理院タイルについて」  
  https://maps.gsi.go.jp/development/siyou.html
- 国土地理院「標高タイルの詳細仕様」  
  https://maps.gsi.go.jp/development/demtile.html
- 国土数値情報ダウンロードサイト  
  https://nlftp.mlit.go.jp/
- Project PLATEAU FAQ  
  https://www.mlit.go.jp/plateau/faq/
- 3D都市モデル（Project PLATEAU）秩父市（2025年度）  
  https://www.geospatial.jp/ckan/dataset/plateau-11207-chichibu-shi-2025  
  製品仕様書：V5／データセット最終更新日：2026年4月2日（取得時に再照合して登録メタデータへ記録する）
- Render Web Services  
  https://render.com/docs/web-services

---

## 14. 実コード確認の根拠

本仕様のAPIパス、実装言語、DB既定値、認証状態に関する記述は、次の公開コードを2026年8月5日に確認した結果に基づく。§14-1は初回のコードリーディング（起動確認前）による事実、§14-2はRenderへの実配備・実接続を通じて確認した事実である。

本書では、README準拠の表示名を `Drone-web`／`SpaceInfra-cpp`、ファイルパスを実ディレクトリ名の `drone-web`／`spaceInfra-cpp` と表記する。根拠パスはすべて `airway-digitaltwin-db` を起点とし、大文字小文字を含めて実ファイルシステムに一致させる。**§14-2（v0.4で追加）における `airway-digitaltwin-db` は、junhongo-ccs/airway-digitaltwin-db（fork）を指す。** forkはリポジトリ直下の構成をそのまま引き継いでいるため、アプリケーションコードのパスは上流（ODS-IS-UASL/airway-digitaltwin-db）と同一である。fork後に追加したファイル（`Dockerfile`、`docker/`配下、`VerifyApiKey.php`等）は上流には存在しない。

### 14-1. 初回コードリーディングによる根拠

| 仕様で用いる事実 | 根拠ファイルと行 |
|---|---|
| `Drone-web`がAPIサーバーである | `airway-digitaltwin-db/README.md:6-8` |
| APIプレフィックスが`/airDtw/api`である | `airway-digitaltwin-db/drone-web/laravel/app/Providers/RouteServiceProvider.php:31-34` |
| `POST`／`GET /drone_route` | `airway-digitaltwin-db/drone-web/laravel/routes/api.php:49-52` |
| 地物ボクセル・エリア・汎用オブジェクトのルート | `airway-digitaltwin-db/drone-web/laravel/routes/api.php:53-62` |
| 風・気象・飛行禁止区域のルート | `airway-digitaltwin-db/drone-web/laravel/routes/api.php:63-70` |
| Sanctum認証グループがコメントアウトされている | `airway-digitaltwin-db/drone-web/laravel/routes/api.php:46, 82` |
| 既定DB接続がMySQLである | `airway-digitaltwin-db/drone-web/laravel/config/database.php:18, 46-64` |
| Apache License 2.0 | `airway-digitaltwin-db/LICENSE:2-4` |
| 取得時点の公開HEAD | `cc3da7a`（2025年4月25日、取得日2026年8月5日） |

### 14-2. Render実配備・実接続による根拠（2026年8月5日、v0.4で追加）

junhongo-ccs/airspaceのStreamlit Viewerからjunhongo-ccs/airway-digitaltwin-db（fork、コミット`a6817b0`以降）をRender Private Serviceとして実際に配備・接続し、以下を確認した。§6-2の記述の直接の根拠。

| 仕様で用いる事実 | 根拠ファイルと行 |
|---|---|
| `GET /drone_route`が`drone_route_id`必須の単体取得であり一覧取得ではない | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/DroneRouteController.php:96-165`（`get_drone_route`） |
| `POST /drone_route`の必須パラメータと成功時の空レスポンス | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/DroneRouteController.php:21-94`（`drone_route`） |
| `drone_route`テーブルの主キーは`drone_route_info_id`（自動採番）であり、`drone_route_id`は一意制約の無いInteger列。`DroneRoute::find()`は`$primaryKey`（＝`drone_route_info_id`）で検索するため、GETの`drone_route_id`パラメータでは実質的に該当行を引けない | `airway-digitaltwin-db/drone-web/laravel/app/Models/DroneRoute.php:13-17`、`airway-digitaltwin-db/drone-web/laravel/database/migrations/2024_10_05_0758000_create_dorone_route.php:14-16` |
| `check_datetime`が`'Y-m-d H:i:s'`の厳密一致のみ許可する | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/ApiFunction.php:37-53` |
| 空間IDがズーム17固定のWeb Mercatorタイル形式`"z/0/x/y"`である | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/ApiFunction.php:256-273`（`get_spatial_xy_on_point`） |
| `GET /ground_feature_voxel`が`other.typeCd`／`identification`／`timing`必須で、try/catchが無く例外は500になる | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/GroundFeatureVoxelController.php:19-66` |
| `GET /general_purpose`が`identification`／`timing`／`requestType`必須のディスパッチャである | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/GeneralPurposeController.php:22-93` |
| `POST /area`の必須パラメータ（features配列）と、登録が外部exe（`popen('start /B ...')`）に依存する設計 | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/AreaObjectController.php:17-131` |
| `area`の取得が`area_object_masters`と`area_detail_objects`のJOINに依存する | `airway-digitaltwin-db/drone-web/laravel/app/Models/AreaObjectMaster.php:23-26`、`airway-digitaltwin-db/drone-web/laravel/database/migrations/2024_11_30_100000_create_area_detail_objects.php` |
| `POST /flight_prohibited_area`の必須パラメータと、登録が外部exeに依存する設計 | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/FlightProhibitedAreaController.php:18-145` |
| `drone-web`に`Dockerfile`・`public/.htaccess`が同梱されていない（新規作成が必要だった） | fork時点のリポジトリ全体（`airway-digitaltwin-db/`以下）を再帰検索し確認（該当ファイル無し） |
| Sanctum認証は実際にコメントアウトされたままであり、書き込み系エンドポイントが無認証で到達可能だった | `airway-digitaltwin-db/drone-web/laravel/routes/api.php:46, 82`（v0.3時点の記述どおり。fork後、簡易APIキー認証へ置き換え済み） |

実行時の必須ペイロード・認証動作・DBスキーマ適合は上記のとおり検証済み。ただし、area／flight_prohibited_areaの取得側（ネイティブ変換処理依存）とPLATEAUデータでの変換ツール（`SpaceInfra-cpp`）の実用性は、Phase Bの範囲としてなお未検証である。

### 14-3. Phase A受入基準の達成確認による根拠（2026年8月6日、v0.5で追加）

| 仕様で用いる事実 | 根拠 |
|---|---|
| `drone_route_id`修正後、航路の登録・取得が実際に往復することを確認した | Renderの`airspace-viewer`で登録→照会を実行し、「登録済み航路数」が0→1件になることを確認（[進捗ログ.md](進捗ログ.md) 2026-08-06） |
| `GET /ground_feature_voxel`が引数ゼロで呼ばれてTypeErrorになっていた（`$request`に型ヒントが無いためLaravelのDIが解決できない） | Renderのアクセスログのスタックトレース：`Controller.php(54): App\Http\Controllers\Api\GroundFeatureVoxelController::get_ground_feature_voxel()`（引数無し） |
| `AreaDetailObject`モデルに`$fillable`/`$guarded`が設定されておらず、`create()`による一括代入が`MassAssignmentException`になる | `airway-digitaltwin-db/drone-web/laravel/app/Models/AreaDetailObject.php`（Renderの`php artisan tinker`で実際にエラーを確認） |
| ネイティブ変換処理が本来作る`area_detail_objects`の行を手動投入すれば、`GET /general_purpose?requestType=area`が該当エリアを返す | Renderの`airspace-drone-web`のWeb Shellから`php artisan tinker`で`area_detail_objects`へ行を追加し、Streamlitの照会結果に反映されることを確認（[進捗ログ.md](進捗ログ.md) 2026-08-06） |

### 14-4. Phase B着手による根拠（2026年8月6日、v0.6で追加）

| 仕様で用いる事実 | 根拠 |
|---|---|
| `SpaceInfra-cpp`はCMake/Makefileを持たない、Visual Studio専用（`.sln`/`.vcxproj`）のC++プロジェクトである | `airway-digitaltwin-db/spaceInfra-cpp/`配下に`.sln`ファイルが14件存在し、CMakeLists.txt・Makefileは存在しない（再帰検索で確認）。ビルド手順は`airway-digitaltwin-db/spaceInfra-cpp/README.md`（VS2022インストール、vcpkgへの`libcitygml`手動配置、MySQL Connector/C++の手動ダウンロード・配置を要求） |
| 地物ボクセルを登録するAPIが存在しない | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/UserApiController.php`の`spatial_voxel`・`point_cloud_file`等は全て取得・ZIPダウンロード専用（`SpaceObject::where(...)->first()`で既存データを検索するのみ）。`GroundFeatureVoxelController`も同様に取得専用 |
| `ground_feature_objects`テーブルの主キーは`ground_feature_object_id`（自動採番）、`data_sources`の主キーは`data_source_id`（クライアント採番、自動採番ではない） | `airway-digitaltwin-db/drone-web/laravel/database/migrations/2024_11_22_105259_create_ground_feature_objects_table.php`、`.../2023_10_13_201539_create_data_sources.php` |
| `GroundFeatureObject`モデルも`$fillable`/`$guarded`が未設定（コメントアウトされている） | `airway-digitaltwin-db/drone-web/laravel/app/Models/GroundFeatureObject.php:17`（`#protected $guarded = [];`） |
| Laravelアプリのタイムゾーンは`Asia/Tokyo`である。サーバー側`now()`で生成した日時と、UTCで送られるクライアントの`timing`パラメータとの比較が9時間ずれ、`GET /ground_feature_voxel`が該当データを取得できない不具合の原因になった | `airway-digitaltwin-db/drone-web/laravel/config/app.php:73`（`'timezone' => 'Asia/Tokyo'`）。実際に`now()`使用時は0件、`now('UTC')`修正後は取得成功したことをRenderで確認（[進捗ログ.md](進捗ログ.md) 2026-08-06） |
| PLATEAU秩父市2025のCityGML ZIP（580MB）は、HTTP RangeリクエストでZIP中央ディレクトリと個別エントリを部分取得できる（ZIP形式が末尾に中央ディレクトリを持つ構造であるため） | 実際にPythonの`zipfile`とHTTP Range対応の疑似ファイルオブジェクトで、約96KBの通信量のみで対象メッシュの建物CityGML（15〜217KB）を取得できることを確認（[進捗ログ.md](進捗ログ.md) 2026-08-06） |

### 14-5. 道路・土砂災害・洪水浸水投入による根拠（2026年8月6日、v0.7で追加）

| 仕様で用いる事実 | 根拠 |
|---|---|
| PLATEAU CityGML ZIP内のレイヤ構成は`udx/bldg`（建物）・`udx/dem`（地形、1ファイル300〜500MB）・`udx/fld`（洪水浸水、2次メッシュ配下に3次メッシュ単位で256ファイル）・`udx/lsld`（土砂災害、2次メッシュ単位で9ファイル）・`udx/luse`（土地利用、2次メッシュ単位で14ファイル、対象メッシュで約19MB）・`udx/tran`（道路、3次メッシュ単位で80ファイル）・`udx/urf`（都市計画基礎調査等） | ZIP中央ディレクトリの一覧をHTTP Rangeで取得して確認（[進捗ログ.md](進捗ログ.md) 2026-08-06） |
| `GET /ground_feature_voxel`は空間IDの完全一致（`->first()`）でのみ検索し、bbox・周辺検索には対応していない | `airway-digitaltwin-db/drone-web/laravel/app/Http/Controllers/Api/GroundFeatureVoxelController.php:41-50`（`where([['spatial_id', '=', $spatial_id], ...])->first()`）。実際に道路・洪水浸水を登録済みでも、既定航路の空間IDと一致しない限り取得結果に含まれないことをRenderで確認 |
| 「関連データセット」ZIP（105KB）は避難所・公園・ランドマーク・駅・鉄道・緊急輸送道路・行政界のGeoJSONであり、洪水浸水・土砂災害・土地利用・道路のレイヤはメインのCityGML ZIP側に含まれる | 実際にダウンロードしZIP内の7ファイルを確認（[進捗ログ.md](進捗ログ.md) 2026-08-06） |
