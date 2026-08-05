"""アプリ全体の定数。

免責文言は `ドローン航路GIS-PoC_仕様書.md` §2-2 を正文とする。
design.md §9-4 の指示により、この文言はコード内でもここ一箇所にのみ保持し、
フッター・ダウンロード出力・API応答表示のすべてがこの定数を参照する。
"""

APP_TITLE = "空域デジタルツインGIS Viewer（PoC）"

# 仕様書 §2-2 の文字列をそのまま転記する。仕様書側が更新された場合はここも合わせて更新する。
DISCLAIMER_TEXT = (
    "本ツールは公開GISデータを用いた机上検討用PoCです。"
    "飛行可否、法令適合性、安全性を保証せず、実運航・飛行計画提出には使用できません。"
)

# 仕様書 §6-1 PoCデータの識別
POC_PREFIX = "POC-CHICHIBU-"
ENVIRONMENT = "poc-local"
IS_POC = True
CREATED_BY = "viewer-poc"

# 仕様書 §5-1 対象地域
DEFAULT_CENTER_LAT = 35.9906
DEFAULT_CENTER_LON = 139.0836
DEFAULT_ZOOM = 14

# 仕様書 §14「実コード確認の根拠」に基づく既定APIプレフィックス
API_PREFIX = "/airDtw/api"
