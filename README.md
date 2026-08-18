# 空域デジタルツインGIS Viewer（PoC）

空域デジタルツイン活用・ドローン航路GIS-PoC のリポジトリ。詳細な仕様は
[`docs/ドローン航路GIS-PoC_仕様書.md`](docs/ドローン航路GIS-PoC_仕様書.md)、デザイン方針は
[`docs/design.md`](docs/design.md) を正とする（本READMEはこれらの要約であり、詳細はリンク先を参照）。

## これは何か

ODS-IS-UASL の `airway-digitaltwin-db`（Laravel/MySQL API、通称 Drone-web）を空域データ基盤として、
PLATEAU秩父市2025（建物・道路・土砂災害・洪水浸水・土地利用）と国土数値情報（人口集中地区＝DID地区）を
登録・照会・地図可視化するPoC。候補航路（始点・終点・飛行高度）を入力すると、周辺の地物との位置関係を
文章で表示する（詳細は仕様書§1）。

## 安全・業務上の位置付け（重要）

本ツールの対象・対象外、および画面に表示すべき免責文言は
[`docs/ドローン航路GIS-PoC_仕様書.md` §2-2](docs/ドローン航路GIS-PoC_仕様書.md) に定義されている。
飛行許可・法令適合性・安全性の判断には使用できない机上検討用PoCである。

## アクセス

| 環境 | URL / 起動方法 | 備考 |
|---|---|---|
| 本番（React版） | `https://airspace-viewer-react.onrender.com/` | 社内限定公開のPoC。現時点で認証機能は無い（仕様書§2-2直後の例外規定参照） |
| 本番BFF | `https://airspace-viewer-api.onrender.com/` | Reactからのみ呼ばれる想定。CORSは許可オリジンをホワイトリスト化済み |
| 本番（旧Streamlit版） | Render Web Service `airspace-viewer` | アクセスコードで入室制限（`APP_ACCESS_CODE`）。廃止方針は未決定 |
| ローカル | 下記「ローカル開発」参照 | |

## システム構成

```
PLATEAU秩父市2025 CityGML
  → scripts/plateau/（HTTP Range抽出・GeoJSON化）
  → viewer/src/data/plateau/{bldg,road,landslide,flood,landuse}/{3次メッシュコード}.geojson
  → viewer_api/（FastAPI BFF）→ viewer-react/（React + MapLibre GL）

Laravel API（別リポジトリ junhongo-ccs/airway-digitaltwin-db、Render Private Service）
  ← viewer/src/api_client.py（DigitalTwinApiClient）← BFF のみが呼ぶ
```

React（`viewer-react/`）が実装の主系統。FastAPI BFF（`viewer_api/`）を唯一の接続先とし、
BFFがLaravel APIを呼ぶ。判定ロジック（高度AGL判定・建物垂直判定など）は `viewer/src/` に
実装されており、BFFとStreamlit版（旧系統）の両方がここをモジュールとしてimportして共有する。

| ディレクトリ | 役割 |
|---|---|
| `viewer-react/` | 主系統のViewer（React + TypeScript + Vite + Tailwind CSS + MapLibre GL） |
| `viewer_api/` | FastAPI BFF。Reactからの唯一の接続先 |
| `viewer/src/` | 判定・データロジックの本体（Streamlit版とBFFの共有層） |
| `viewer/`（`app.py`, `components/`） | 旧Streamlit版Viewer。廃止方針は未決定 |
| `scripts/plateau/` | PLATEAU CityGMLからのデータ抽出バッチ |
| `docs/` | 仕様書・デザインガイドライン・タスクリスト・進捗ログ |

## ローカル開発

Pythonはリポジトリ直下から `viewer/.venv` の実行ファイルを直接呼ぶ（`activate`しない）。

```bash
# BFF起動（:8001）
./viewer/.venv/Scripts/python.exe -m uvicorn viewer_api.app:app --reload --port 8001

# React起動（:5173、.env.localがBFFの接続先を指定）
cd viewer-react
npm install
npm run dev

# 旧Streamlit版（:8501）
cd viewer && ./.venv/Scripts/streamlit run app.py
```

## デプロイ

Render（[`render.yaml`](render.yaml) のBlueprint）。サービス構成・手順は
[`docs/Render配備手順.md`](docs/Render配備手順.md) を参照。

## データ出典

- 建物・道路・土砂災害警戒区域・洪水浸水想定区域・土地利用：PLATEAU秩父市2025
- 人口集中地区（DID地区）：国土数値情報 人口集中地区データ（A16-2020、埼玉県）

## 現在の開発状況

日々の作業記録は [`docs/進捗ログ.md`](docs/進捗ログ.md)、既知の制約・未実装項目は
[`docs/実装タスクリスト.md`](docs/実装タスクリスト.md) と各 `docs/改善タスク_*.md` を参照。
