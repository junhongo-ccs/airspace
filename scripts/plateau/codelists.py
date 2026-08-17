"""PLATEAU CityGMLのコードリスト（`codelists/*.xml`）を読み、コード→日本語名の辞書にする。

コードリストはgml:Dictionary形式で共通構造を持つ（`gml:dictionaryEntry/gml:Definition`
の`gml:name`がコード値、`gml:description`が日本語名）。ZIP内のコードリストは
どのレイヤの抽出でも同じ形式なので、汎用パーサとして切り出す。
"""

from __future__ import annotations

from xml.etree import ElementTree as ET
from zipfile import ZipInfo

from remote_zip import RemoteZipIndex, fetch_entry_bytes

_GML_NS = "http://www.opengis.net/gml"


def parse_codelist(xml_bytes: bytes) -> dict[str, str]:
    """gml:Dictionaryのbytesから{コード値: 日本語名}を返す。"""
    root = ET.fromstring(xml_bytes)
    labels: dict[str, str] = {}
    for definition in root.iter(f"{{{_GML_NS}}}Definition"):
        name = definition.find(f"{{{_GML_NS}}}name")
        description = definition.find(f"{{{_GML_NS}}}description")
        if name is not None and name.text and description is not None and description.text:
            labels[name.text] = description.text
    return labels


def load_codelist(url: str, index: RemoteZipIndex, codelist_name: str) -> dict[str, str]:
    """`codelists/{codelist_name}.xml`を取得してパースする。"""
    filename = f"codelists/{codelist_name}.xml"
    info: ZipInfo | None = next((i for i in index.infolist if i.filename == filename), None)
    if info is None:
        raise FileNotFoundError(f"codelist not found in zip: {filename}")
    return parse_codelist(fetch_entry_bytes(url, info))
