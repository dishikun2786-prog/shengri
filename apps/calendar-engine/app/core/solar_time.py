"""真太阳时计算模块

真太阳时 = 当地时间 + 经度时差 + 均时差
经度时差 = (当地经度 - 标准时区中央经度) × 4分钟/度
均时差: 由地球公转轨道偏心率和地轴倾斜引起的时间校正
"""
import math
from datetime import datetime, timedelta


def equation_of_time(day_of_year: int) -> float:
    """均时差计算（分钟）
    使用Spencer公式的简化版，精度约±30秒
    """
    b = 2 * math.pi * (day_of_year - 81) / 365.0
    eot = (
        9.87 * math.sin(2 * b)
        - 7.53 * math.cos(b)
        - 1.5 * math.sin(b)
    )
    return eot


def longitude_correction(longitude: float, standard_meridian: float = 120.0) -> float:
    """经度时差（分钟）
    中国标准时间基于东经120度
    """
    return (longitude - standard_meridian) * 4.0


def get_standard_meridian(timezone_offset_hours: float) -> float:
    """根据时区偏移获取标准经线"""
    return timezone_offset_hours * 15.0


def calculate_true_solar_time(
    local_dt: datetime,
    longitude: float,
    timezone_offset_hours: float = 8.0,
) -> tuple[datetime, float]:
    """计算真太阳时

    Args:
        local_dt: 当地标准时间
        longitude: 出生地经度（东经为正）
        timezone_offset_hours: 时区偏移（小时），中国为+8

    Returns:
        (真太阳时datetime, 总校正分钟数)
    """
    day_of_year = local_dt.timetuple().tm_yday
    standard_meridian = get_standard_meridian(timezone_offset_hours)

    eot = equation_of_time(day_of_year)
    lng_corr = longitude_correction(longitude, standard_meridian)

    total_correction_min = eot + lng_corr
    true_solar_dt = local_dt + timedelta(minutes=total_correction_min)

    return true_solar_dt, total_correction_min
