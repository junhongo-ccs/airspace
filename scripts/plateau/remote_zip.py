"""HTTP RangeリクエストでZIPの一部分だけを取得するユーティリティ。

PLATEAU秩父市2025のCityGML ZIP（580MB、G空間情報センター配布）は全体をダウンロード
せず、必要なエントリだけを部分取得する。2026-08-06の進捗ログに記録された手動での
単一メッシュ取得（中央ディレクトリ＋対象メッシュの建物ファイルのみ、合計約96KB）を、
任意のメッシュ集合・任意のレイヤに一般化したもの。

`requests`ではなく`curl`をサブプロセスで呼ぶ。この開発環境ではPython標準の証明書束
（certifi）がプロキシ経由のTLS終端証明書を検証できずrequests/urllibが失敗する一方、
curlはOSの証明書ストアを使うため成功する（2026-08-17に実機確認）。curlは最近の
Windows/Linux/macOSに標準搭載されているため、追加依存を増やさずに済む。
"""

from __future__ import annotations

import struct
import subprocess
import zlib
from dataclasses import dataclass
from io import RawIOBase
from zipfile import ZipFile, ZipInfo

# ZIPのEnd Of Central Directoryレコードは末尾22バイト＋コメント（最大65535バイト）。
# コメント無しの場合が大半だが、余裕を見て毎回65557バイト分を取得する。
_EOCD_SEARCH_WINDOW = 65557
_EOCD_SIGNATURE = b"PK\x05\x06"
_LOCAL_HEADER_SIGNATURE = b"PK\x03\x04"
_LOCAL_HEADER_FIXED_SIZE = 30
# ローカルヘッダのファイル名・extraフィールドは中央ディレクトリと同じはずだが、
# 実装差異に備えて範囲取得に余裕を持たせる（超過分は末尾を切り詰めて使う）。
_LOCAL_HEADER_SLACK = 256
# ストリーミング書き込み時に立つ汎用目的ビットフラグ（データディスクリプタ使用）。
_FLAG_DATA_DESCRIPTOR = 0x0008


def _curl_range(url: str, start: int, end: int) -> bytes:
    result = subprocess.run(
        ["curl", "-sf", "--max-time", "30", "-H", f"Range: bytes={start}-{end}", url],
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"curl failed rc={result.returncode} url={url} range={start}-{end} "
            f"stderr={result.stderr[:300]!r}"
        )
    return result.stdout


class _CachedRegionFile(RawIOBase):
    """ZIPの実サイズを保ったまま、キャッシュ済み領域だけを読める仮想ファイル。

    `zipfile.ZipFile()`のコンストラクタは末尾(EOCD探索)と中央ディレクトリ領域しか
    読まない。この2領域だけ実際のHTTPレスポンスで埋めておけば、`header_offset`等の
    絶対オフセットを元ファイル（580MBの実体）と一致させたままエントリ一覧を取得できる。
    最初の実装では中央ディレクトリのみを詰めた短いバッファを渡しており、zipfile内部の
    「先頭に余分なデータが付いたZIP（自己解凍書庫等）」向け補正ロジックが誤動作して
    `header_offset`が負値になるバグを踏んだ（2026-08-17）。実サイズを保持する本実装で解消。
    """

    def __init__(self, total_size: int, regions: dict[int, bytes]):
        self._total_size = total_size
        self._regions = regions
        self._pos = 0

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return True

    def seek(self, offset: int, whence: int = 0) -> int:
        if whence == 0:
            self._pos = offset
        elif whence == 1:
            self._pos += offset
        elif whence == 2:
            self._pos = self._total_size + offset
        return self._pos

    def tell(self) -> int:
        return self._pos

    def readinto(self, b: bytearray) -> int:
        for start, data in self._regions.items():
            if start <= self._pos < start + len(data):
                rel = self._pos - start
                chunk = data[rel : rel + len(b)]
                b[: len(chunk)] = chunk
                self._pos += len(chunk)
                return len(chunk)
        raise OSError(f"region not cached for offset {self._pos}（末尾/中央ディレクトリ以外は未対応）")


@dataclass
class RemoteZipIndex:
    url: str
    total_size: int
    infolist: list[ZipInfo]


def build_remote_zip_index(url: str, total_size: int) -> RemoteZipIndex:
    """ZIPの中央ディレクトリだけを部分取得し、絶対オフセット付きのエントリ一覧を返す。"""
    tail_start = total_size - _EOCD_SEARCH_WINDOW
    tail = _curl_range(url, tail_start, total_size - 1)
    idx = tail.rfind(_EOCD_SIGNATURE)
    if idx == -1:
        raise ValueError("EOCD signature not found（末尾ウィンドウを広げる必要あり）")
    eocd = tail[idx : idx + 22]
    _, _, _, _, _total_entries, cd_size, cd_offset, _ = struct.unpack("<IHHHHIIH", eocd)

    cd_bytes = _curl_range(url, cd_offset, cd_offset + cd_size - 1)
    regions = {cd_offset: cd_bytes, tail_start: tail}
    virtual_file = _CachedRegionFile(total_size, regions)
    zf = ZipFile(virtual_file)
    return RemoteZipIndex(url=url, total_size=total_size, infolist=zf.infolist())


def fetch_entry_bytes(url: str, info: ZipInfo) -> bytes:
    """1エントリのローカルヘッダ＋圧縮データを実オフセットで取得し、展開したbytesを返す。"""
    start = info.header_offset
    end = start + _LOCAL_HEADER_FIXED_SIZE + len(info.filename.encode("utf-8")) + _LOCAL_HEADER_SLACK + info.compress_size
    raw = _curl_range(url, start, end)

    sig_idx = raw.find(_LOCAL_HEADER_SIGNATURE)
    if sig_idx == -1:
        raise ValueError(f"local file header not found for {info.filename}")
    (_version, flags, method, _mtime, _mdate, _crc, _local_comp_size, _local_uncomp_size, fname_len, extra_len) = (
        struct.unpack("<HHHHHIIIHH", raw[sig_idx + 4 : sig_idx + 30])
    )
    # flags & _FLAG_DATA_DESCRIPTOR（ストリーミング書き込み）の場合、ローカルヘッダの
    # 圧縮サイズは0になるため使わない。中央ディレクトリのinfo.compress_sizeは常に正しい
    # （2026-08-17、実データがこのケースだったため必須の修正）。
    comp_size = info.compress_size
    data_start = sig_idx + _LOCAL_HEADER_FIXED_SIZE + fname_len + extra_len
    comp_data = raw[data_start : data_start + comp_size]
    if len(comp_data) < comp_size:
        raise ValueError(f"under-fetched compressed data for {info.filename}: got {len(comp_data)} want {comp_size}")

    if method == 8:  # deflate
        return zlib.decompress(comp_data, -15)
    if method == 0:  # stored
        return comp_data
    raise ValueError(f"unexpected compression method {method} for {info.filename}")
