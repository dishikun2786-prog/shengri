"""地理编码与时区适配

将城市名转换为经纬度+时区，支持全球出生地。
"""
from __future__ import annotations

import json
import os
from typing import Optional

CITY_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "city_coordinates.json")

_city_cache: Optional[dict] = None


def _load_city_data() -> dict:
    global _city_cache
    if _city_cache is not None:
        return _city_cache
    try:
        with open(CITY_DATA_PATH, "r", encoding="utf-8") as f:
            _city_cache = json.load(f)
    except FileNotFoundError:
        _city_cache = {}
    return _city_cache


def lookup_city(city_name: str) -> Optional[dict]:
    """查找城市经纬度和时区，支持多级 fallback

    查找策略（按优先级）：
    1. 精确匹配（如"北京市东城区"）
    2. 尝试去除省名前缀（如"北京市东城区" → "东城区"）
    3. 去除行政后缀匹配（如"北京市" → "北京"）
    4. 区县名后缀模糊匹配（遍历 key 查找以该名称结尾的记录）

    Returns:
        {"name": "北京", "longitude": 116.4, "latitude": 39.9, "timezone_offset": 8.0}
    """
    data = _load_city_data()
    city_name = city_name.strip()
    if not city_name:
        return None

    # 1. 精确匹配
    result = data.get(city_name)
    if result:
        return result

    # 2. 去除行政后缀匹配
    suffixes = ("市", "省", "壮族自治区", "回族自治区", "维吾尔自治区", "自治区",
                "特别行政区", "地区", "自治州", "盟", "林区")
    stripped = city_name
    for s in suffixes:
        if stripped.endswith(s):
            stripped = stripped[:-len(s)]
            break
    if stripped != city_name:
        result = data.get(stripped)
        if result:
            return result

    # 3. 尾部匹配：查找 key 以 city_name 结尾的记录
    for key, val in data.items():
        if key.endswith(city_name):
            return val

    # 4. 查找坐标字典中 name 字段匹配的记录
    for key, val in data.items():
        if val.get("name") == city_name:
            return val

    return None


def search_cities(query: str, limit: int = 10) -> list:
    """模糊搜索城市/区县名称

    Returns:
        [{"key": "北京市东城区", "name": "东城区", "province": "北京市", ...}, ...]
    """
    data = _load_city_data()
    query = query.strip()
    if not query:
        return []

    results = []
    for key, val in data.items():
        if query in key or query in val.get("name", ""):
            results.append({"key": key, **val})
            if len(results) >= limit:
                break
    return results


def get_timezone_offset(longitude: float) -> float:
    """根据经度估算时区偏移（小时）"""
    return round(longitude / 15.0)
