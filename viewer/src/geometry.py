"""線分（航路）とGeoJSON Polygon/MultiPolygonの実交差判定。

改善タスク・2026-08-18のレビュー指摘への対応：`plateau_route_judgment.py`の
「重なっています」判定が航路・地物とも外接矩形（bbox）同士の重なりのみで、実際の
線分×ポリゴン交差ではなかった（斜めの航路で、実際には通らない地物も交差と誤判定
しうる）。外部ライブラリ（shapely等）を追加すると本番ビルド時の依存解決・ネイティブ
拡張の環境差分リスクが増える（`viewer/requirements.txt`の推移的依存固定の方針、
CLAUDE.md参照）ため、PoCの範囲で完結する純Python実装にした。

座標はすべてGeoJSON標準の[lon, lat]順（経度, 緯度）で扱う。秩父市周辺という狭い
範囲が対象のため、日付変更線・極域をまたぐケースは考慮しない。

**未検証の限界（reviewerサブエージェント指摘、2026-08-18）**：`segments_intersect`の
共線判定は外積が厳密に0かどうかの浮動小数点完全一致比較で行っている。実データの
座標がほぼ同一点（隣接する地物同士が頂点や辺を共有している等）の場合、丸め誤差で
厳密に0にならず、境界が接しているだけのケースを正しく分類できない可能性が理論上
ある。実データでの誤判定は確認できていない（未検証）。
"""

from __future__ import annotations

Point = tuple[float, float]


def _cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def _on_segment(p: Point, q: Point, r: Point) -> bool:
    """p・r と共線であることが分かっている点qが、線分p-r上（bbox内）にあるか。"""
    return min(p[0], r[0]) <= q[0] <= max(p[0], r[0]) and min(p[1], r[1]) <= q[1] <= max(p[1], r[1])


def segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    """線分p1-p2と線分p3-p4が交差するか（端点での接触・共線上の重なりも交差とみなす）。"""
    d1 = _cross(p3, p4, p1)
    d2 = _cross(p3, p4, p2)
    d3 = _cross(p1, p2, p3)
    d4 = _cross(p1, p2, p4)

    if ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)) and d1 != 0 and d2 != 0 and d3 != 0 and d4 != 0:
        return True

    if d1 == 0 and _on_segment(p3, p1, p4):
        return True
    if d2 == 0 and _on_segment(p3, p2, p4):
        return True
    if d3 == 0 and _on_segment(p1, p3, p2):
        return True
    if d4 == 0 and _on_segment(p1, p4, p2):
        return True
    return False


def _point_in_ring(point: Point, ring: list[list[float]]) -> bool:
    """レイキャスティング法。境界線上は含まない簡易判定（境界上のケースは
    segments_intersect側の端点一致・共線判定で別途拾われる）。"""
    x, y = point
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y):
            x_at_y = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < x_at_y:
                inside = not inside
        j = i
    return inside


def _point_in_rings(point: Point, rings: list[list[list[float]]]) -> bool:
    """穴（内側リング）を考慮したポリゴン内包判定。1つ目が外側リング、以降は穴。
    外側リング内かつどの穴にも含まれていなければTrue。"""
    if not rings or not _point_in_ring(point, rings[0]):
        return False
    return not any(_point_in_ring(point, hole) for hole in rings[1:])


def _segment_intersects_rings(seg_start: Point, seg_end: Point, rings: list[list[list[float]]]) -> bool:
    for ring in rings:
        for i in range(len(ring) - 1):
            edge_start = (ring[i][0], ring[i][1])
            edge_end = (ring[i + 1][0], ring[i + 1][1])
            if segments_intersect(seg_start, seg_end, edge_start, edge_end):
                return True
    return False


def segment_intersects_geometry(seg_start: Point, seg_end: Point, geometry: dict) -> bool:
    """線分（[lon, lat]の2点）とGeoJSON Polygon/MultiPolygonが実際に交差するか。

    境界線との交差だけでなく、線分の端点がポリゴン内部に収まっている
    （境界とは交わらないが線分全体がポリゴン内にある）ケースも交差として扱う。
    """
    if geometry["type"] == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry["type"] == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        return False

    for rings in polygons:
        if _segment_intersects_rings(seg_start, seg_end, rings):
            return True
        if _point_in_rings(seg_start, rings) or _point_in_rings(seg_end, rings):
            return True
    return False
