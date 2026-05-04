"""农历数据抽象层（查表接口 + sxtwl 回退实现）。

当前版本先提供统一接口，默认使用 sxtwl 回退。
后续可将 1900-2100 的预制农历数据表接入这些接口。
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

try:
    import sxtwl
    HAS_SXTWL = True
except ImportError:
    HAS_SXTWL = False


def solar_to_lunar(year: int, month: int, day: int) -> dict:
    """公历转农历（统一返回结构）。"""
    if not HAS_SXTWL:
        raise RuntimeError("sxtwl 未安装，无法进行公历转农历")
    lunar = sxtwl.fromSolar(year, month, day)
    return {
        "lunar_month": lunar.getLunarMonth(),
        "lunar_day": lunar.getLunarDay(),
        "is_leap_month": lunar.isLunarLeap(),
    }


def lunar_to_solar(lunar_year: int, lunar_month: int, lunar_day: int, is_leap_month: bool = False) -> dict:
    """农历转公历。

    当前通过 sxtwl 的逐日搜索方式实现（可读性优先，性能对本场景足够）。
    """
    if not HAS_SXTWL:
        raise RuntimeError("sxtwl 未安装，无法进行农历转公历")

    # 搜索范围覆盖目标农历年前后一年，避免跨年边界漏检
    start = datetime(lunar_year - 1, 1, 1)
    end = datetime(lunar_year + 1, 12, 31)
    cursor = start
    while cursor <= end:
        lunar = sxtwl.fromSolar(cursor.year, cursor.month, cursor.day)
        if (
            lunar.getLunarMonth() == lunar_month
            and lunar.getLunarDay() == lunar_day
            and lunar.isLunarLeap() == is_leap_month
        ):
            return {"year": cursor.year, "month": cursor.month, "day": cursor.day}
        cursor += timedelta(days=1)

    raise ValueError("未在可搜索范围内找到对应农历日期")


def get_lunar_month_range(year: int, month: int, day: int) -> tuple[datetime, datetime, int, bool]:
    """根据公历参考日，获取其所在阴历月对应的公历起止区间。"""
    if not HAS_SXTWL:
        raise RuntimeError("sxtwl 未安装，无法解析阴历月边界")

    ref = datetime(year, month, day)
    lunar_ref = sxtwl.fromSolar(ref.year, ref.month, ref.day)
    target_lunar_month = lunar_ref.getLunarMonth()
    target_is_leap = lunar_ref.isLunarLeap()

    start = ref
    while True:
        prev = start - timedelta(days=1)
        prev_lunar = sxtwl.fromSolar(prev.year, prev.month, prev.day)
        prev_lunar_month = prev_lunar.getLunarMonth()
        prev_is_leap = prev_lunar.isLunarLeap()
        if prev_lunar_month != target_lunar_month:
            # crossed to a different lunar month — stop here
            break
        if prev_is_leap != target_is_leap:
            # crossed leap/non-leap boundary for same lunar month number
            # e.g. from 闰四月 to 四月 — continue past this boundary
            # so that we find the true start of the target (non-leap or leap) month
            start = prev
            continue
        start = prev

    end = ref
    while True:
        nxt = end + timedelta(days=1)
        next_lunar = sxtwl.fromSolar(nxt.year, nxt.month, nxt.day)
        if next_lunar.getLunarMonth() == target_lunar_month and next_lunar.isLunarLeap() == target_is_leap:
            end = nxt
        else:
            break

    return start, end, target_lunar_month, target_is_leap
