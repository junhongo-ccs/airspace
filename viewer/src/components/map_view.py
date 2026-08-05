"""design.md §7, §8: 地図表示。

レイヤ色は design.md §5-3 のトークンをそのまま使用する。ただし塗りパターン
（斜線・交差ハッチ・点ハッチ）はfolium/Leafletで直接表現できないため、破線境界＋
半透明塗りで近似している。正式な塗りパターン実装（SVGパターン）はdesign.md §16の
未決定事項ではないが、本実装の既知の compromise として凡例内に明記する。
"""

from __future__ import annotations

import folium
from folium.plugins import MousePosition
from streamlit_folium import st_folium

from ..config import DEFAULT_CENTER_LAT, DEFAULT_CENTER_LON, DEFAULT_ZOOM

# design.md §5-3 地図レイヤ色トークン（暫定HEX。§5-1が正式値に差し替わり次第追従する）
COLOR_ROUTE = "#0B3D75"  # --map-route
COLOR_ROUTE_DRAFT = "#3E9BE0"  # --map-route-draft
COLOR_CAUTION = "#FF8A00"  # --map-caution
COLOR_PROHIBITED = "#E8380D"  # --map-prohibited
COLOR_BUILDING = "#8A96A0"  # --map-building
COLOR_UNKNOWN = "#FFD400"  # --map-unknown

_GSI_ATTR = "地理院タイル"
_GSI_STD_URL = "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"

_LEGEND_HTML = """
<div style="
    position: absolute; bottom: 40px; right: 10px; z-index: 9999;
    background: rgba(255,255,255,0.92); border: 1px solid #D0D7DE; border-radius: 4px;
    padding: 8px 10px; font-size: 11px; font-family: 'Yu Gothic UI','Meiryo UI',sans-serif;
    color: #0B1E2D; line-height: 16px; max-width: 190px;">
  <div style="font-weight:600; margin-bottom:4px;">凡例</div>
  <div><span style="display:inline-block;width:14px;height:3px;background:{route};margin-right:6px;"></span>航路（登録済み）</div>
  <div><span style="display:inline-block;width:14px;height:0;border-top:2px dashed {route_draft};margin-right:6px;"></span>航路（入力中）</div>
  <div><span style="display:inline-block;width:10px;height:10px;background:{caution};opacity:0.45;border:1px dashed {caution};margin-right:6px;"></span>注意区域</div>
  <div><span style="display:inline-block;width:10px;height:10px;background:{prohibited};opacity:0.5;border:1px solid {prohibited};margin-right:6px;"></span>禁止区域</div>
  <div><span style="display:inline-block;width:10px;height:10px;background:{building};margin-right:6px;"></span>建物</div>
  <div><span style="display:inline-block;width:10px;height:10px;background:{unknown};opacity:0.6;border:1px dotted {unknown};margin-right:6px;"></span>情報不足・mock</div>
  <div style="margin-top:4px; color:#5A6B78;">
    ※塗りパターン（斜線・交差ハッチ・点ハッチ）は破線・不透明度による暫定近似（design.md §5-3）
  </div>
</div>
""".format(
    route=COLOR_ROUTE,
    route_draft=COLOR_ROUTE_DRAFT,
    caution=COLOR_CAUTION,
    prohibited=COLOR_PROHIBITED,
    building=COLOR_BUILDING,
    unknown=COLOR_UNKNOWN,
)


def render_map(ctx: dict, query_result: dict | None) -> None:
    show_layers = set(ctx["layers"])
    center = ctx["start"] if ctx.get("start") else (DEFAULT_CENTER_LAT, DEFAULT_CENTER_LON)

    # design.md §4-3 の最小高さ要件のうち、開発時のデフォルト表示として1920×1080側の値に寄せる
    m = folium.Map(location=list(center), zoom_start=DEFAULT_ZOOM, control_scale=True, tiles=None)

    if "地理院地図" in show_layers:
        folium.TileLayer(
            tiles=_GSI_STD_URL, attr=_GSI_ATTR, name="地理院地図", overlay=False, control=False
        ).add_to(m)
    else:
        folium.TileLayer(tiles="cartodbpositron", name="背景（簡易）", overlay=False, control=False).add_to(m)

    # 航路（入力中・未登録）: design.md §5-3 破線4px
    if "航路" in show_layers and ctx.get("start") and ctx.get("end"):
        folium.PolyLine(
            [ctx["start"], ctx["end"]],
            color=COLOR_ROUTE_DRAFT,
            weight=4,
            dash_array="8,6",
            tooltip="入力中の航路（未登録）",
        ).add_to(m)

    if query_result and query_result.get("ok"):
        if "航路" in show_layers:
            for route in query_result.get("routes", []):
                pts = [
                    (route["start"]["lat"], route["start"]["lon"]),
                    (route["end"]["lat"], route["end"]["lon"]),
                ]
                kind = "PoC" if route.get("is_poc") else "実データ"
                folium.PolyLine(
                    pts, color=COLOR_ROUTE, weight=4,
                    tooltip=f"{route.get('name', '')}（登録済み・{kind}）",
                ).add_to(m)

        if "建物" in show_layers:
            for voxel in query_result.get("voxels", []):
                if "footprint" not in voxel:
                    # 実APIのground_feature_voxelはボクセルビット参照を返すのみで
                    # 緯度経度ポリゴンを含まないため、地図描画は対象外とする（結果テーブルには出る）。
                    continue
                is_placeholder = "mock" in str(voxel.get("source", ""))
                color = COLOR_UNKNOWN if is_placeholder else COLOR_BUILDING
                folium.Polygon(
                    voxel["footprint"],
                    color=color,
                    weight=1,
                    dash_array="2,2" if is_placeholder else None,
                    fill=True,
                    fill_color=color,
                    fill_opacity=0.5,
                    tooltip=f"建物（{voxel.get('height_m')}m、{voxel.get('source')}）",
                ).add_to(m)

        # 注意区域・禁止区域は「注意区域」チェックボックスでまとめて制御する
        # （design.md §8-1の初期表示レイヤは4種のみのため、禁止区域は同グループとして扱う）
        if "注意区域" in show_layers:
            for area in query_result.get("areas", []):
                if "polygon" not in area:
                    # 実APIのgeneral_purpose(area)はポリゴンを返さないため地図描画は対象外
                    continue
                pts = [(p["lat"], p["lon"]) for p in area["polygon"]]
                kind = "PoC" if area.get("is_poc") else "実データ"
                folium.Polygon(
                    pts, color=COLOR_CAUTION, weight=2, dash_array="6,4",
                    fill=True, fill_color=COLOR_CAUTION, fill_opacity=0.35,
                    tooltip=f"{area.get('name', '')}（注意区域・{kind}）",
                ).add_to(m)
            for area in query_result.get("prohibited", []):
                if "polygon" not in area:
                    continue
                pts = [(p["lat"], p["lon"]) for p in area["polygon"]]
                kind = "PoC" if area.get("is_poc") else "実データ"
                folium.Polygon(
                    pts, color=COLOR_PROHIBITED, weight=2,
                    fill=True, fill_color=COLOR_PROHIBITED, fill_opacity=0.4,
                    tooltip=f"{area.get('name', '')}（禁止区域・{kind}）",
                ).add_to(m)

    # design.md §8-2 座標・空間ID表示（右下の細帯）: カーソル位置の緯度経度を表示
    MousePosition(position="bottomright", separator=" / ", num_digits=6, prefix="緯度経度: ").add_to(m)
    # design.md §8-2 凡例（右下）
    m.get_root().html.add_child(folium.Element(_LEGEND_HTML))
    # design.md §8-2 北矢印: 2D固定表示のみのため省略

    st_folium(m, use_container_width=True, height=560, returned_objects=[])
