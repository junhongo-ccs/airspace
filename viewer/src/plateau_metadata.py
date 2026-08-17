"""6-6a/6-10: PLATEAU秩父市2025データセットの出典・データ時点。

`viewer/src/data/plateau/`配下の各GeoJSONファイル（建物・道路・土砂災害・洪水浸水・
土地利用）はすべて同じデータセットから再抽出したものなので、メッシュファイルごとに
重複して埋め込まず、bboxエンドポイントのレスポンス全体に付与するメタ情報として
一箇所で持つ。
"""

from __future__ import annotations

PLATEAU_DATASET_SOURCE = "PLATEAU秩父市2025"

# `docs/ドローン航路GIS-PoC_仕様書.md`§13に記載の「データセット最終更新日」
# （製品仕様書V5、2026-08-05取得時点で確認）。データセット自体が更新された場合は
# 再取得・再抽出時にここも合わせて更新する。
PLATEAU_DATASET_DATE = "2026-04-02"


def plateau_dataset_meta() -> dict:
    return {"source": PLATEAU_DATASET_SOURCE, "data_date": PLATEAU_DATASET_DATE}
