# Streamlit Viewer（PoC）

`docs/design.md`（v1.2）と `docs/ドローン航路GIS-PoC_仕様書.md`（v0.3）に基づく
Streamlit Viewerの実装。`docs/実装タスクリスト.md` の §0（事前準備）と §3（Phase C）の
一部に対応する。

## 現在の状態

- **Phase A（`Drone-web`+MySQLのローカルDocker起動）は未実施。** そのため本アプリは
  既定で **モックAPIモード**で動く。左パネルの「モックAPIを使用する」をOFFにすると、
  「API接続先」に入力したURLへ実際にHTTPで接続を試みる（`src/api_client.py`）。
- 地物ボクセル（建物）はPhase B（PLATEAU秩父市2025投入）が未実施のため、
  mockモードでは出典に「mock」と明記したプレースホルダを返す。
- 空間ID／ボクセル解像度は仕様書§12で未確定のため、`src/spatial_id.py` に
  プレースホルダ実装を分離してある。実仕様確定後はここだけを差し替える。
- 交差判定はバウンディングボックスによる水平方向の簡易判定のみ。仕様書§5-3の
  高度基準統一が完了していないため、垂直方向の判定は一切行わない
  （画面には常に「高度比較未検証」と表示される。design.md §9-2）。
- 地図の塗りパターン（斜線・交差ハッチ・点ハッチ、design.md §5-3）はfolium/Leafletで
  直接表現できないため、破線境界＋半透明塗りで近似している（凡例に明記）。

## セットアップ

```bash
cd viewer
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt
```

## 起動

```bash
cd viewer
./.venv/Scripts/streamlit run app.py
```

ブラウザで `http://localhost:8501` を開く。

## ディレクトリ構成

```
viewer/
  app.py                     画面の組み立て（design.md §4-1のレイアウト順）
  requirements.txt
  src/
    config.py                免責文言・PoC識別子など、正文を1箇所にまとめた定数
    theme.py                 design.md §5・§6のカラートークン／タイポグラフィCSS注入
    api_client.py             空域デジタルツインAPI（仕様書§6）クライアント（mock/実API切替）
    spatial_id.py             空間ID／ボクセル解像度のプレースホルダ計算
    components/
      route_form.py           左設定パネル（API状態・航路設定・レイヤ選択・登録・照会）
      status_panel.py         API接続状態・空間ID・評価状態・PoC識別バッジ
      map_view.py              地図（folium）
      results_table.py         登録・照会結果、交差詳細表、CSV/GeoJSON出力
```

## 未実装・既知の制約（`docs/実装タスクリスト.md` 参照）

- Phase A/B（実API・実データ投入）と接続した動作確認は未実施。
- アクセシビリティ（§3-6：Tab順、フォーカスリング適用範囲、ショートカットキー）は
  CSSのフォーカスリングのみ実装し、キーボードショートカットは未実装。
- 固定フッター（`position: fixed`）はStreamlitの実行環境によっては効かない場合がある。
  その場合は本文末尾のフォールバック表示（`disclaimer_inline_html`）を正とする。
