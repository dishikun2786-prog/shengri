"""四柱计算核心引擎

使用 sxtwl（寿星万年历）进行精准天干地支计算。
sxtwl 不可用时回退到纯算法实现。
"""
from __future__ import annotations

import math
import calendar
import logging
from datetime import datetime, date, timedelta
from typing import Optional

from ..models.bazi_chart import (
    Pillar, TenGodEntry, DaYun, LiuNian, LiuYue, LiuRi,
    ShenshaEntry, GanZhiRelation, BaziChartResponse,
)
from .constants import (
    TIAN_GAN, DI_ZHI, GAN_WUXING, ZHI_WUXING,
    ZHI_CANG_GAN, NAYIN_TABLE, get_ten_god,
    SHENSHA_MAP, TIAN_LUO_DI_WANG,
    KUIGANG_PILLARS, YINYANG_CUOCUO_PILLARS, SHIE_DABAI_PILLARS,
    JINSHENG_PILLARS, SHILING_PILLARS, TIANSHE_MAP, SHENSHA_CATEGORY,
    WUXING_SHENG, WUXING_KE, WUXING_SHENG_WO, WUXING_KE_WO,
    GAN_HE, GAN_HE_RESULT, GAN_CHONG,
    ZHI_LIU_HE, ZHI_LIU_HE_RESULT, ZHI_LIU_CHONG,
    ZHI_SAN_HE, ZHI_SAN_HUI, ZHI_XIANG_HAI, ZHI_XIANG_XING, ZHI_XIANG_PO,
    get_kong_wang, get_chang_sheng, get_tai_sui_relation,
    TIAOHUO_TABLE, ZHENG_GE_MAP, ZHI_MONTH_MAP,
)
from .solar_time import calculate_true_solar_time
from .lunar_table import get_lunar_month_range, solar_to_lunar

try:
    import sxtwl
    HAS_SXTWL = True
except ImportError:
    HAS_SXTWL = False

logger = logging.getLogger(__name__)


# ============================================================
#  sxtwl 方式
# ============================================================

def _calc_with_sxtwl(
    year: int, month: int, day: int, hour: int, minute: int,
) -> tuple[str, str, str, str, str, str, str, str, dict]:
    """使用sxtwl精准计算四柱"""
    lunar = sxtwl.fromSolar(year, month, day)

    year_gz = lunar.getYearGZ()
    month_gz = lunar.getMonthGZ()
    day_gz = lunar.getDayGZ()
    hour_gz = lunar.getHourGZ(hour)

    y_gan = TIAN_GAN[year_gz.tg]
    y_zhi = DI_ZHI[year_gz.dz]
    m_gan = TIAN_GAN[month_gz.tg]
    m_zhi = DI_ZHI[month_gz.dz]
    d_gan = TIAN_GAN[day_gz.tg]
    d_zhi = DI_ZHI[day_gz.dz]
    h_gan = TIAN_GAN[hour_gz.tg]
    h_zhi = DI_ZHI[hour_gz.dz]

    lunar_info = {
        "lunar_month": lunar.getLunarMonth(),
        "lunar_day": lunar.getLunarDay(),
        "is_leap": lunar.isLunarLeap(),
    }

    return y_gan, y_zhi, m_gan, m_zhi, d_gan, d_zhi, h_gan, h_zhi, lunar_info


# ============================================================
#  纯算法回退
# ============================================================

def _jd_from_date(year: int, month: int, day: int, hour: float = 0.0) -> float:
    """儒略日计算"""
    if month <= 2:
        year -= 1
        month += 12
    A = int(year / 100)
    B = 2 - A + int(A / 4)
    return int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + hour / 24.0 + B - 1524.5


def _day_gan_zhi_index(year: int, month: int, day: int) -> int:
    """日柱干支索引(0-59)"""
    jd = _jd_from_date(year, month, day, 12)
    return int(jd + 0.5) % 60


def _year_gan_zhi(year: int, month: int, day: int) -> tuple[int, int]:
    """年柱干支索引（以立春为界）"""
    stem = (year - 4) % 10
    branch = (year - 4) % 12
    return stem, branch


def _month_gan_zhi(year_gan_idx: int, month: int) -> tuple[int, int]:
    """月柱干支索引（简化版，以节气为界需要sxtwl）"""
    month_zhi_idx = (month + 1) % 12
    base = (year_gan_idx % 5) * 2
    month_gan_idx = (base + month + 1) % 10
    return month_gan_idx, month_zhi_idx


def _hour_gan_zhi(day_gan_idx: int, hour: int) -> tuple[int, int]:
    """时柱干支索引"""
    hour_zhi_idx = ((hour + 1) // 2) % 12
    base = (day_gan_idx % 5) * 2
    hour_gan_idx = (base + hour_zhi_idx) % 10
    return hour_gan_idx, hour_zhi_idx


def _calc_fallback(
    year: int, month: int, day: int, hour: int,
) -> tuple[str, str, str, str, str, str, str, str, dict]:
    """纯算法回退计算 — 已废弃，sxtwl 未安装时直接报错"""
    raise RuntimeError(
        "sxtwl 模块未安装，无法进行精确八字排盘。"
        "请安装 sxtwl: pip install sxtwl"
    )


# ============================================================
#  节气信息（sxtwl）
# ============================================================

_JIEQI_NAMES = [
    "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
    "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
    "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
    "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
]

# 月令交接使用“节”而非“气”
_MONTH_BOUNDARY_JIEQI = {
    "立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
    "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
}


_BOUNDARY_TERMS_MMDD = [
    (1, 6),   # 小寒
    (2, 4),   # 立春
    (3, 6),   # 惊蛰
    (4, 5),   # 清明
    (5, 5),   # 立夏
    (6, 6),   # 芒种
    (7, 7),   # 小暑
    (8, 8),   # 立秋
    (9, 8),   # 白露
    (10, 8),  # 寒露
    (11, 7),  # 立冬
    (12, 7),  # 大雪
]


def _nearest_month_boundary(
    birth_dt: datetime,
    direction: int,
) -> datetime:
    """按换月节气表取最近边界时刻（00:00）。"""
    candidates: list[datetime] = []
    for y in (birth_dt.year - 1, birth_dt.year, birth_dt.year + 1):
        for mm, dd in _BOUNDARY_TERMS_MMDD:
            candidates.append(datetime(y, mm, dd, 0, 0, 0))
    candidates.sort()

    if direction == 1:
        for c in candidates:
            if c > birth_dt:
                return c
    else:
        for c in reversed(candidates):
            if c < birth_dt:
                return c

    return birth_dt

def _get_jieqi_info(year: int, month: int, day: int) -> str:
    """获取出生日前后节气信息"""
    if not HAS_SXTWL:
        return ""
    try:
        lunar = sxtwl.fromSolar(year, month, day)
        jieqi_idx = lunar.getJieQi()
        if jieqi_idx >= 0 and jieqi_idx < len(_JIEQI_NAMES):
            return f"当日节气：{_JIEQI_NAMES[jieqi_idx]}"

        prev_jq = ""
        next_jq = ""
        for delta in range(1, 20):
            if not prev_jq:
                d = sxtwl.fromSolar(year, month, day) if delta == 0 else None
                try:
                    prev_date = datetime(year, month, day) - timedelta(days=delta)
                    prev_l = sxtwl.fromSolar(prev_date.year, prev_date.month, prev_date.day)
                    jq = prev_l.getJieQi()
                    if jq >= 0 and jq < len(_JIEQI_NAMES):
                        prev_jq = f"{_JIEQI_NAMES[jq]}({prev_date.month}/{prev_date.day})"
                except Exception:
                    pass
            if not next_jq:
                try:
                    next_date = datetime(year, month, day) + timedelta(days=delta)
                    next_l = sxtwl.fromSolar(next_date.year, next_date.month, next_date.day)
                    jq = next_l.getJieQi()
                    if jq >= 0 and jq < len(_JIEQI_NAMES):
                        next_jq = f"{_JIEQI_NAMES[jq]}({next_date.month}/{next_date.day})"
                except Exception:
                    pass
            if prev_jq and next_jq:
                break

        parts = []
        if prev_jq:
            parts.append(f"前节：{prev_jq}")
        if next_jq:
            parts.append(f"后节：{next_jq}")
        return "，".join(parts)
    except Exception:
        return ""


# ============================================================
#  起运年龄精确计算
# ============================================================

def _calc_start_age_sxtwl(
    birth_year: int, birth_month: int, birth_day: int,
    birth_hour: int, birth_minute: int,
    direction: int,
) -> float:
    """使用 sxtwl 计算起运年龄（按传统折算规则）。

    规则：
    - 顺排：出生时刻 -> 下一个“节”(换月节气)
    - 逆排：出生时刻 -> 上一个“节”(换月节气)
    - 三天一岁；一天四个月；一个时辰（2小时）折十天
    """
    try:
        birth_dt = datetime(birth_year, birth_month, birth_day, birth_hour, birth_minute)
        target_jq_date = _nearest_month_boundary(birth_dt, direction)

        # 传统折算：
        # - 三天一岁（1天=4个月）
        # - 一时辰折十天（换算到“月份尺”即 1时辰=1/3个月）
        total_seconds = abs((target_jq_date - birth_dt).total_seconds())
        whole_days = int(total_seconds // 86400)
        remain_seconds = total_seconds - whole_days * 86400

        # 一个时辰 = 2小时 = 10天
        shichen_count = int(round(remain_seconds / 7200.0))
        start_age = (whole_days / 3.0) + (shichen_count / 36.0)
        return round(start_age, 2)
    except Exception:
        return 3.0


# ============================================================
#  核心排盘函数
# ============================================================

def calculate_bazi(
    year: int, month: int, day: int,
    hour: int, minute: int,
    gender: int,
    longitude: float = 120.0,
    latitude: float = 35.0,
    timezone_offset: float = 8.0,
    midnight_rule: str = "early",
    apply_tst: bool = True,
    precomputed_pillars: Optional[dict] = None,
    precomputed_lunar: Optional[dict] = None,
) -> BaziChartResponse:
    """核心排盘函数

    当 precomputed_pillars 传入时，直接使用 lunisolar.js 预计算的四柱，
    不再通过 sxtwl 自行计算，仅进行后续的高级分析（十神、神煞、大运等）。
    """

    local_dt = datetime(year, month, day, hour, minute)
    if apply_tst:
        true_solar_dt, correction_min = calculate_true_solar_time(
            local_dt, longitude, timezone_offset
        )
    else:
        true_solar_dt = local_dt
        correction_min = 0.0

    calc_year = true_solar_dt.year
    calc_month = true_solar_dt.month
    calc_day = true_solar_dt.day
    calc_hour = true_solar_dt.hour

    if calc_hour >= 23:
        if midnight_rule == "early":
            next_day = true_solar_dt + timedelta(days=1)
            calc_year = next_day.year
            calc_month = next_day.month
            calc_day = next_day.day
            calc_hour = 0

    calc_minute = true_solar_dt.minute

    if precomputed_pillars:
        y_gan = precomputed_pillars["year_gan"]
        y_zhi = precomputed_pillars["year_zhi"]
        m_gan = precomputed_pillars["month_gan"]
        m_zhi = precomputed_pillars["month_zhi"]
        d_gan = precomputed_pillars["day_gan"]
        d_zhi = precomputed_pillars["day_zhi"]
        h_gan = precomputed_pillars["hour_gan"]
        h_zhi = precomputed_pillars["hour_zhi"]
        lunar_info = precomputed_lunar or {}
    elif HAS_SXTWL:
        y_gan, y_zhi, m_gan, m_zhi, d_gan, d_zhi, h_gan, h_zhi, lunar_info = \
            _calc_with_sxtwl(calc_year, calc_month, calc_day, calc_hour, calc_minute)
    else:
        y_gan, y_zhi, m_gan, m_zhi, d_gan, d_zhi, h_gan, h_zhi, lunar_info = \
            _calc_fallback(calc_year, calc_month, calc_day, calc_hour)

    day_master = d_gan

    # 构建四柱
    def make_pillar(gan: str, zhi: str) -> Pillar:
        full = f"{gan}{zhi}"
        return Pillar(
            gan=gan, zhi=zhi,
            gan_wuxing=GAN_WUXING.get(gan, ""),
            zhi_wuxing=ZHI_WUXING.get(zhi, ""),
            nayin=NAYIN_TABLE.get(full, ""),
            hidden_gan=ZHI_CANG_GAN.get(zhi, []),
            chang_sheng=get_chang_sheng(day_master, zhi),
        )

    year_pillar = make_pillar(y_gan, y_zhi)
    month_pillar = make_pillar(m_gan, m_zhi)
    day_pillar = make_pillar(d_gan, d_zhi)
    hour_pillar = make_pillar(h_gan, h_zhi)

    day_master_wuxing = GAN_WUXING[day_master]

    # 十神
    ten_gods = _calc_ten_gods(day_master, year_pillar, month_pillar, day_pillar, hour_pillar)

    # 五行统计
    wuxing_counts, wuxing_score = _calc_wuxing(
        year_pillar, month_pillar, day_pillar, hour_pillar
    )

    # 日主强弱
    strength, strength_level = _calc_day_master_strength(
        day_master, wuxing_score, month_pillar.zhi
    )

    # 空亡
    kong_wang = get_kong_wang(d_gan, d_zhi)

    # 十二长生
    chang_sheng = {
        "year": year_pillar.chang_sheng,
        "month": month_pillar.chang_sheng,
        "day": day_pillar.chang_sheng,
        "hour": hour_pillar.chang_sheng,
    }

    # 胎元/命宫/身宫/胎息
    tai_yuan = _calc_tai_yuan(m_gan, m_zhi)
    ming_gong = _calc_ming_gong(y_gan, m_zhi, h_zhi)
    shen_gong = _calc_shen_gong(y_gan, m_zhi, h_zhi)
    tai_xi = _calc_tai_xi(d_gan, d_zhi)

    # 大运
    dayun_direction, dayun_start_age, dayun_list = _calc_dayun(
        gender, year_pillar.gan, month_pillar,
        day_master, calc_year, calc_month, calc_day, calc_hour, calc_minute,
    )

    # 流年：从命主当前年龄对应的流年开始，覆盖前后各5年共10年
    current_year = datetime.now().year
    age = current_year - year
    liunian_start = max(year, current_year - 5)
    liunian_count = 10
    liunian_list = _calc_liunian(day_master, y_zhi, liunian_start, liunian_count)

    # 神煞
    shensha_list = _calc_shensha(
        day_master, year_pillar, month_pillar, day_pillar, hour_pillar
    )

    # 干支关系
    relations = _calc_relations(year_pillar, month_pillar, day_pillar, hour_pillar)

    # 格局
    pattern_type, pattern_name, pattern_score = _calc_pattern(
        day_master, month_pillar, year_pillar, day_pillar, hour_pillar,
        wuxing_score, strength,
    )

    # 用神
    yong_shen, xi_shen, ji_shen, chou_shen = _calc_yong_shen(
        day_master, strength, strength_level, pattern_type, wuxing_score,
    )

    # 调候
    tiaohuo_need = _calc_tiaohuo(day_master, month_pillar.zhi)

    # 节气信息
    jieqi_info = _get_jieqi_info(calc_year, calc_month, calc_day)

    # 农历信息
    lunar_str = ""
    if lunar_info:
        prefix = "闰" if lunar_info.get("is_leap") else ""
        lunar_str = f"{y_gan}{y_zhi}年{prefix}{_lunar_month_cn(lunar_info.get('lunar_month', 0))}月{_lunar_day_cn(lunar_info.get('lunar_day', 0))}"

    return BaziChartResponse(
        year_pillar=year_pillar,
        month_pillar=month_pillar,
        day_pillar=day_pillar,
        hour_pillar=hour_pillar,
        ten_gods=ten_gods,
        wuxing_counts=wuxing_counts,
        wuxing_score=wuxing_score,
        day_master=day_master,
        day_master_wuxing=day_master_wuxing,
        day_master_strength=strength,
        strength_level=strength_level,
        dayun_direction=dayun_direction,
        dayun_start_age=dayun_start_age,
        dayun_list=dayun_list,
        liunian_list=liunian_list,
        shensha_list=shensha_list,
        kong_wang=kong_wang,
        chang_sheng=chang_sheng,
        tai_yuan=tai_yuan,
        ming_gong=ming_gong,
        shen_gong=shen_gong,
        tai_xi=tai_xi,
        relations=relations,
        pattern_type=pattern_type,
        pattern_name=pattern_name,
        pattern_score=pattern_score,
        yong_shen=yong_shen,
        xi_shen=xi_shen,
        ji_shen=ji_shen,
        chou_shen=chou_shen,
        tiaohuo_need=tiaohuo_need,
        solar_datetime=local_dt.isoformat(),
        lunar_date=lunar_str,
        true_solar_time=true_solar_dt.isoformat(),
        time_correction_min=round(correction_min, 2),
        jieqi_info=jieqi_info,
        midnight_rule=midnight_rule,
        gender=gender,
        longitude=longitude,
        latitude=latitude,
        engine_version="2.0.0",
        algorithm_version="sxtwl" if HAS_SXTWL else "fallback",
    )


# ============================================================
#  十神计算
# ============================================================

def _calc_ten_gods(
    day_master: str,
    year_p: Pillar, month_p: Pillar, day_p: Pillar, hour_p: Pillar,
) -> list[TenGodEntry]:
    """计算十神"""
    entries = []
    for pos, pillar in [
        ("year_gan", year_p), ("month_gan", month_p),
        ("hour_gan", hour_p),
    ]:
        tg = get_ten_god(day_master, pillar.gan)
        entries.append(TenGodEntry(gan=pillar.gan, ten_god=tg, position=pos))

    for pos_name, pillar in [
        ("year_hidden", year_p), ("month_hidden", month_p),
        ("day_hidden", day_p), ("hour_hidden", hour_p),
    ]:
        for hg in pillar.hidden_gan:
            tg = get_ten_god(day_master, hg)
            entries.append(TenGodEntry(gan=hg, ten_god=tg, position=pos_name))

    return entries


# ============================================================
#  五行统计
# ============================================================

def _calc_wuxing(
    year_p: Pillar, month_p: Pillar, day_p: Pillar, hour_p: Pillar,
) -> tuple[dict[str, int], dict[str, float]]:
    """统计五行（天干+地支藏干）"""
    counts: dict[str, int] = {"金": 0, "木": 0, "水": 0, "火": 0, "土": 0}

    all_gan = [year_p.gan, month_p.gan, day_p.gan, hour_p.gan]
    for g in all_gan:
        wx = GAN_WUXING.get(g)
        if wx:
            counts[wx] += 1

    weights = [1.0, 0.6, 0.3]
    score: dict[str, float] = {"金": 0, "木": 0, "水": 0, "火": 0, "土": 0}

    for g in all_gan:
        wx = GAN_WUXING.get(g)
        if wx:
            score[wx] += 1.0

    for pillar in [year_p, month_p, day_p, hour_p]:
        for i, hg in enumerate(pillar.hidden_gan):
            w = weights[i] if i < len(weights) else 0.2
            wx = GAN_WUXING.get(hg)
            if wx:
                score[wx] += w
                counts[wx] += 1

    return counts, {k: round(v, 2) for k, v in score.items()}


# ============================================================
#  日主强弱
# ============================================================

def _calc_day_master_strength(
    day_master: str,
    wuxing_score: dict[str, float],
    month_zhi: str,
) -> tuple[float, str]:
    """日主强弱评估"""
    dm_wx = GAN_WUXING[day_master]

    sheng_wo_wx = WUXING_SHENG_WO.get(dm_wx, "")

    help_score = wuxing_score.get(dm_wx, 0) + wuxing_score.get(sheng_wo_wx, 0) * 0.7
    total = sum(wuxing_score.values()) or 1
    strength = round((help_score / total) * 100, 1)

    month_wx = ZHI_WUXING.get(month_zhi, "")
    if month_wx == dm_wx or month_wx == sheng_wo_wx:
        strength = min(100, strength * 1.2)

    if strength >= 70:
        level = "极强"
    elif strength >= 55:
        level = "偏强"
    elif strength >= 45:
        level = "中和"
    elif strength >= 30:
        level = "偏弱"
    else:
        level = "极弱"

    return round(strength, 1), level


# ============================================================
#  大运计算
# ============================================================

def _calc_dayun(
    gender: int, year_gan: str, month_pillar: Pillar,
    day_master: str,
    birth_year: int, birth_month: int, birth_day: int,
    birth_hour: int, birth_minute: int,
) -> tuple[int, float, list[DaYun]]:
    """大运计算（精确起运年龄）"""
    year_gan_idx = TIAN_GAN.index(year_gan)
    is_yang = year_gan_idx % 2 == 0

    if (gender == 1 and is_yang) or (gender == 2 and not is_yang):
        direction = 1
    else:
        direction = -1

    start_age = _calc_start_age_sxtwl(
        birth_year, birth_month, birth_day, birth_hour, birth_minute, direction,
    )

    month_gan_idx = TIAN_GAN.index(month_pillar.gan)
    month_zhi_idx = DI_ZHI.index(month_pillar.zhi)

    dayun_list: list[DaYun] = []
    for i in range(1, 9):
        offset = i * direction
        g_idx = (month_gan_idx + offset) % 10
        z_idx = (month_zhi_idx + offset) % 12
        gan = TIAN_GAN[g_idx]
        zhi = DI_ZHI[z_idx]
        s_age = round(start_age + (i - 1) * 10, 2)
        e_age = round(s_age + 10.0, 2)
        s_year = int(birth_year + s_age)
        e_year = int(birth_year + e_age)

        # 地支十神：取地支本气藏干计算
        zhi_ben_qi = ZHI_CANG_GAN.get(zhi, [""])[0]
        ten_god_zhi = get_ten_god(day_master, zhi_ben_qi) if zhi_ben_qi else ""

        full = f"{gan}{zhi}"
        dayun_list.append(DaYun(
            index=i,
            start_age=s_age,
            end_age=e_age,
            gan=gan,
            zhi=zhi,
            ten_god_gan=get_ten_god(day_master, gan),
            ten_god_zhi=ten_god_zhi,
            nayin=NAYIN_TABLE.get(full, ""),
            chang_sheng=get_chang_sheng(day_master, zhi),
            start_year=s_year,
            end_year=e_year,
        ))

    return direction, start_age, dayun_list


# ============================================================
#  流年计算
# ============================================================

def _calc_liunian(
    day_master: str, year_zhi: str, start_year: int, count: int,
) -> list[LiuNian]:
    """流年计算（含地支十神、太岁关系）

    流年岁君干支以「节气换年」（立春为界），与 lunisolar.js Char8.computeSBYear / sxtwl 一致。
    对公历年份 y 的年柱取该年公历 6 月 15 日（稳定处于立春之后），避免用 (y-4)%10/12
    公历近似在年初、立春前与节气年不一致的问题。
    """
    result: list[LiuNian] = []
    for i in range(count):
        y = start_year + i
        if HAS_SXTWL:
            ref = sxtwl.fromSolar(y, 6, 15)
            yg = ref.getYearGZ()
            g_idx = yg.tg
            z_idx = yg.dz
        else:
            g_idx = (y - 4) % 10
            z_idx = (y - 4) % 12
        gan = TIAN_GAN[g_idx]
        zhi = DI_ZHI[z_idx]
        full = f"{gan}{zhi}"

        zhi_ben_qi = ZHI_CANG_GAN.get(zhi, [""])[0]
        ten_god_zhi = get_ten_god(day_master, zhi_ben_qi) if zhi_ben_qi else ""

        tai_sui = get_tai_sui_relation(year_zhi, zhi)

        result.append(LiuNian(
            year=y,
            gan=gan,
            zhi=zhi,
            ten_god_gan=get_ten_god(day_master, gan),
            ten_god_zhi=ten_god_zhi,
            nayin=NAYIN_TABLE.get(full, ""),
            chang_sheng=get_chang_sheng(day_master, zhi),
            tai_sui=tai_sui,
        ))
    return result


# ============================================================
#  流月计算
# ============================================================

_JIEQI_MONTH_NAMES = [
    "小寒", "立春", "惊蛰", "清明", "立夏", "芒种",
    "小暑", "立秋", "白露", "寒露", "立冬", "大雪",
]

def _calc_liuyue(
    year: int, day_master: Optional[str] = None,
) -> list[LiuYue]:
    """流月计算：给定公历年，返回该年所有农历月的万年历直出月信息。

    算法：扫描全年所有日期，收集所有不同的(lunar_month, is_leap)组合，
    按各月首日所在的公历月序号(solar_month_index)升序排列，返回固定条目标签。
    """
    if not HAS_SXTWL:
        raise RuntimeError("sxtwl 未安装，无法计算流月")

    # Step 1: Scan the entire year to collect all unique lunar months
    # Maps (lunar_month, is_leap) -> (first_solar_month, first_day, entries_count, start_dt, end_dt)
    lunar_months_map: dict[tuple[int, bool], dict] = {}
    for m in range(1, 13):
        days = calendar.monthrange(year, m)[1]
        for d in range(1, days + 1):
            lunar = sxtwl.fromSolar(year, m, d)
            key = (lunar.getLunarMonth(), lunar.isLunarLeap())
            dt = datetime(year, m, d)
            if key not in lunar_months_map:
                lunar_months_map[key] = {
                    'start_dt': dt,
                    'end_dt': dt,
                    'count': 0,
                }
            entry = lunar_months_map[key]
            entry['count'] += 1
            if dt < entry['start_dt']:
                entry['start_dt'] = dt
            if dt > entry['end_dt']:
                entry['end_dt'] = dt

    # Step 2: Sort by first occurrence (solar_month_index)
    sorted_keys = sorted(
        lunar_months_map.keys(),
        key=lambda k: lunar_months_map[k]['start_dt'],
    )

    # Step 3: Assign solar_month_index (1-based order of first occurrence)
    result_map: dict[tuple[int, bool], dict] = {}
    for idx, key in enumerate(sorted_keys, start=1):
        entry = lunar_months_map[key]
        entry['solar_month_index'] = idx

    # Step 4: Build LiuYue entries
    result: list[LiuYue] = []
    for key, entry in lunar_months_map.items():
        lunar_month_no, is_leap = key
        solar_idx = entry['solar_month_index']
        start_dt = entry['start_dt']
        end_dt = entry['end_dt']

        # Get month ganzhi using the first day of this lunar month
        first_gz = sxtwl.fromSolar(start_dt.year, start_dt.month, start_dt.day).getMonthGZ()
        gan = TIAN_GAN[first_gz.tg] if first_gz else ""
        zhi = DI_ZHI[first_gz.dz] if first_gz else ""
        full = f"{gan}{zhi}"

        zhi_ben_qi = ZHI_CANG_GAN.get(zhi, [""])[0] if zhi else ""
        ten_god_zhi_val = get_ten_god(day_master, zhi_ben_qi) if (day_master and zhi_ben_qi) else ""

        jq_name = _JIEQI_MONTH_NAMES[solar_idx - 1] if solar_idx - 1 < len(_JIEQI_MONTH_NAMES) else ""

        result.append(LiuYue(
            month=lunar_month_no,
            solar_month_index=solar_idx,
            gan=gan, zhi=zhi,
            ten_god_gan=get_ten_god(day_master, gan) if day_master else "",
            ten_god_zhi=ten_god_zhi_val,
            nayin=NAYIN_TABLE.get(full, ""),
            jieqi_name=jq_name,
            solar_month_start=f"{start_dt.year}-{start_dt.month:02d}-{start_dt.day:02d}",
            solar_month_end=f"{end_dt.year}-{end_dt.month:02d}-{end_dt.day:02d}",
            lunar_month=_lunar_month_cn(lunar_month_no),
            lunar_month_number=lunar_month_no,
            is_leap_month=is_leap,
        ))

    result.sort(key=lambda x: x.solar_month_index)
    return result


# ============================================================
#  流日计算
# ============================================================

def _calc_liuri(
    year: int, month: int, day_master: Optional[str] = None,
    day_boundary_mode: str = "zi_hour",
    use_true_solar_time: bool = False,
    reference_hour: int = 0,
    reference_minute: int = 0,
    longitude: float = 120.0,
    timezone_offset: float = 8.0,
) -> list[LiuRi]:
    """流日计算：给定公历年月，返回统一基准日口径的流日数据"""
    if not HAS_SXTWL:
        raise RuntimeError("sxtwl 未安装，无法计算流日")

    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    result: list[LiuRi] = []
    skipped_count = 0
    skipped_samples: list[str] = []
    for d in range(1, days_in_month + 1):
        try:
            observed_dt = datetime(year, month, d, reference_hour, reference_minute)
            if use_true_solar_time:
                observed_dt, _ = calculate_true_solar_time(observed_dt, longitude, timezone_offset)

            basis_dt = observed_dt
            if day_boundary_mode == "zi_hour" and observed_dt.hour >= 23:
                basis_dt = observed_dt + timedelta(days=1)

            lunar = sxtwl.fromSolar(basis_dt.year, basis_dt.month, basis_dt.day)
            lunar_info = solar_to_lunar(basis_dt.year, basis_dt.month, basis_dt.day) if HAS_SXTWL else None
            d_gan_idx = lunar.getDayGZ().tg
            d_zhi_idx = lunar.getDayGZ().dz
            gan = TIAN_GAN[d_gan_idx]
            zhi = DI_ZHI[d_zhi_idx]
            full = f"{gan}{zhi}"

            zhi_ben_qi = ZHI_CANG_GAN.get(zhi, [""])[0]
            ten_god_zhi = get_ten_god(day_master, zhi_ben_qi) if (day_master and zhi_ben_qi) else ""

            result.append(LiuRi(
                day=d,
                solar_date=f"{basis_dt.year}-{basis_dt.month:02d}-{basis_dt.day:02d}",
                display_solar_date=f"{basis_dt.year}-{basis_dt.month:02d}-{basis_dt.day:02d}",
                basis_date=f"{basis_dt.year}-{basis_dt.month:02d}-{basis_dt.day:02d}",
                gan=gan, zhi=zhi,
                ten_god_gan=get_ten_god(day_master, gan) if day_master else "",
                ten_god_zhi=ten_god_zhi,
                nayin=NAYIN_TABLE.get(full, ""),
                lunar_day_number=lunar_info["lunar_day"] if lunar_info else lunar.getLunarDay(),
                lunar_day=_lunar_day_cn(lunar_info["lunar_day"] if lunar_info else lunar.getLunarDay()),
                lunar_date=f"{_lunar_month_cn(lunar_info['lunar_month'] if lunar_info else lunar.getLunarMonth())}月{_lunar_day_cn(lunar_info['lunar_day'] if lunar_info else lunar.getLunarDay())}",
            ))
        except Exception as exc:
            skipped_count += 1
            if len(skipped_samples) < 3:
                skipped_samples.append(f"d={d}, err={exc!r}")
    logger.info(
        "calc_liuri summary y=%s m=%s days=%s generated=%s skipped=%s samples=%s",
        year,
        month,
        days_in_month,
        len(result),
        skipped_count,
        "; ".join(skipped_samples),
    )
    return result


# ============================================================
#  神煞计算（扩展版）
# ============================================================

def _calc_shensha(
    day_master: str,
    year_p: Pillar, month_p: Pillar, day_p: Pillar, hour_p: Pillar,
) -> list[ShenshaEntry]:
    """神煞计算（扩展版，40+种），返回结构化条目含落柱与吉凶"""
    result: list[ShenshaEntry] = []
    seen: set[str] = set()

    pillars = {"year": year_p, "month": month_p, "day": day_p, "hour": hour_p}
    all_zhi = [year_p.zhi, month_p.zhi, day_p.zhi, hour_p.zhi]
    all_gan = [year_p.gan, month_p.gan, day_p.gan, hour_p.gan]
    pillar_names = ["year", "month", "day", "hour"]

    def _add(name: str, pillar: str = "multiple"):
        key = f"{name}:{pillar}"
        if key not in seen:
            seen.add(key)
            result.append(ShenshaEntry(
                name=name, pillar=pillar,
                category=SHENSHA_CATEGORY.get(name, "中"),
            ))

    def _find_pillar_of_zhi(target: str) -> str:
        for pn, p in pillars.items():
            if p.zhi == target:
                return pn
        return "multiple"

    # === 日干查地支类 ===
    for sname in ["天乙贵人", "文昌贵人", "国印贵人", "太极贵人",
                   "福星贵人", "天厨贵人", "天官贵人"]:
        targets = SHENSHA_MAP.get(sname, {}).get(day_master, [])
        if isinstance(targets, str):
            targets = [targets]
        for i, z in enumerate(all_zhi):
            if z in targets:
                _add(sname, pillar_names[i])

    # 日干查单支类
    for sname in ["禄神", "羊刃", "金舆", "学堂", "词馆", "飞刃", "流霞"]:
        target = SHENSHA_MAP.get(sname, {}).get(day_master, "")
        if target:
            for i, z in enumerate(all_zhi):
                if z == target:
                    _add(sname, pillar_names[i])

    # === 年支/日支查三合局类 ===
    for sname in ["驿马", "桃花", "华盖", "将星", "亡神", "劫煞", "灾煞"]:
        data = SHENSHA_MAP.get(sname, {})
        for key_group, target_zhi in data.items():
            if year_p.zhi in key_group or day_p.zhi in key_group:
                for i, z in enumerate(all_zhi):
                    if z == target_zhi:
                        _add(sname, pillar_names[i])
                break

    # === 年支查类 ===
    for sname in ["红鸾", "天喜", "元辰"]:
        target = SHENSHA_MAP.get(sname, {}).get(year_p.zhi, "")
        if target:
            for i, z in enumerate(all_zhi):
                if z == target:
                    _add(sname, pillar_names[i])

    # 孤辰/寡宿
    for sname in ["孤辰", "寡宿"]:
        data = SHENSHA_MAP.get(sname, {})
        for key_group, target_zhi in data.items():
            if year_p.zhi in key_group:
                for i, z in enumerate(all_zhi):
                    if z == target_zhi:
                        _add(sname, pillar_names[i])
                break

    # === 月令查类 ===
    month_num = ZHI_MONTH_MAP.get(month_p.zhi, 0)
    if month_num:
        td_target = SHENSHA_MAP.get("天德贵人", {}).get(month_num, "")
        if td_target and (td_target in all_gan or td_target in all_zhi):
            _add("天德贵人", "month")

        yd_target = SHENSHA_MAP.get("月德贵人", {}).get(month_num, "")
        if yd_target and (yd_target in all_gan or yd_target in all_zhi):
            _add("月德贵人", "month")

        ty_target = SHENSHA_MAP.get("天医", {}).get(month_num, "")
        if ty_target and ty_target in all_zhi:
            _add("天医", _find_pillar_of_zhi(ty_target))

    # === 日柱组合定 ===
    day_full = f"{day_p.gan}{day_p.zhi}"
    if day_full in KUIGANG_PILLARS:
        _add("魁罡", "day")
    if day_full in YINYANG_CUOCUO_PILLARS:
        _add("阴阳差错", "day")
    if day_full in SHIE_DABAI_PILLARS:
        _add("十恶大败", "day")
    if day_full in JINSHENG_PILLARS:
        _add("金神", "day")
    if day_full in SHILING_PILLARS:
        _add("十灵日", "day")

    # 天赦日
    if month_num:
        tianshe_pillar = TIANSHE_MAP.get(month_num, "")
        if tianshe_pillar and day_full == tianshe_pillar:
            _add("天赦日", "day")

    # === 天罗地网 ===
    dm_wx = GAN_WUXING[day_master]
    tldi_set = TIAN_LUO_DI_WANG.get(dm_wx, set())
    if tldi_set:
        for i, z in enumerate(all_zhi):
            if z in tldi_set:
                _add("天罗地网", pillar_names[i])

    return result


# ============================================================
#  干支合冲刑害关系
# ============================================================

def _calc_relations(
    year_p: Pillar, month_p: Pillar, day_p: Pillar, hour_p: Pillar,
) -> list[GanZhiRelation]:
    """检测四柱之间的合冲刑害关系"""
    relations: list[GanZhiRelation] = []
    pillar_names = ["年", "月", "日", "时"]
    pillars = [year_p, month_p, day_p, hour_p]

    # 天干五合
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            g1, g2 = pillars[i].gan, pillars[j].gan
            if GAN_HE.get(g1) == g2:
                pair = tuple(sorted([g1, g2]))
                result = GAN_HE_RESULT.get(pair, GAN_HE_RESULT.get((g1, g2), ""))
                relations.append(GanZhiRelation(
                    type="天干五合",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[g1, g2],
                    result=f"合化{result}" if result else "合",
                ))

    # 天干相冲
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            g1, g2 = pillars[i].gan, pillars[j].gan
            if GAN_CHONG.get(g1) == g2:
                relations.append(GanZhiRelation(
                    type="天干相冲",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[g1, g2],
                ))

    # 地支六合
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            z1, z2 = pillars[i].zhi, pillars[j].zhi
            if ZHI_LIU_HE.get(z1) == z2:
                pair = tuple(sorted([z1, z2]))
                result = ZHI_LIU_HE_RESULT.get(pair, ZHI_LIU_HE_RESULT.get((z1, z2), ""))
                relations.append(GanZhiRelation(
                    type="地支六合",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[z1, z2],
                    result=f"合化{result}" if result else "合",
                ))

    # 地支六冲
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            z1, z2 = pillars[i].zhi, pillars[j].zhi
            if ZHI_LIU_CHONG.get(z1) == z2:
                relations.append(GanZhiRelation(
                    type="地支六冲",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[z1, z2],
                ))

    # 地支相刑
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            z1, z2 = pillars[i].zhi, pillars[j].zhi
            if ZHI_XIANG_XING.get(z1) == z2:
                relations.append(GanZhiRelation(
                    type="地支相刑",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[z1, z2],
                ))

    # 地支相害
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            z1, z2 = pillars[i].zhi, pillars[j].zhi
            if ZHI_XIANG_HAI.get(z1) == z2:
                relations.append(GanZhiRelation(
                    type="地支相害",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[z1, z2],
                ))

    # 地支相破
    for i in range(len(pillars)):
        for j in range(i + 1, len(pillars)):
            z1, z2 = pillars[i].zhi, pillars[j].zhi
            if ZHI_XIANG_PO.get(z1) == z2:
                relations.append(GanZhiRelation(
                    type="地支相破",
                    positions=[pillar_names[i], pillar_names[j]],
                    elements=[z1, z2],
                ))

    # 地支三合
    all_zhi = [p.zhi for p in pillars]
    for group_str, result_wx in ZHI_SAN_HE.items():
        group = list(group_str)
        matched = [z for z in group if z in all_zhi]
        if len(matched) >= 3:
            pos = [pillar_names[i] for i, p in enumerate(pillars) if p.zhi in group]
            relations.append(GanZhiRelation(
                type="地支三合",
                positions=pos,
                elements=matched,
                result=f"合化{result_wx}",
            ))
        elif len(matched) == 2:
            pos = [pillar_names[i] for i, p in enumerate(pillars) if p.zhi in group]
            relations.append(GanZhiRelation(
                type="地支三合(半合)",
                positions=pos,
                elements=matched,
                result=f"半合{result_wx}",
            ))

    # 地支三会
    for group_str, result_wx in ZHI_SAN_HUI.items():
        group = list(group_str)
        matched = [z for z in group if z in all_zhi]
        if len(matched) >= 3:
            pos = [pillar_names[i] for i, p in enumerate(pillars) if p.zhi in group]
            relations.append(GanZhiRelation(
                type="地支三会",
                positions=pos,
                elements=matched,
                result=f"会{result_wx}",
            ))

    return relations


# ============================================================
#  胎元 / 命宫 / 身宫 / 胎息
# ============================================================

def _calc_tai_yuan(month_gan: str, month_zhi: str) -> str:
    """胎元：月干进一位 + 月支进三位"""
    g_idx = (TIAN_GAN.index(month_gan) + 1) % 10
    z_idx = (DI_ZHI.index(month_zhi) + 3) % 12
    return f"{TIAN_GAN[g_idx]}{DI_ZHI[z_idx]}"


def _wu_hu_dun_yue_gan(year_gan: str, month_zhi: str) -> str:
    """五虎遁月法：由年干推算某月支对应的天干"""
    y_idx = TIAN_GAN.index(year_gan)
    # 年干 % 5 得到寅月起始天干索引: 甲己→丙(2), 乙庚→戊(4), 丙辛→庚(6), 丁壬→壬(8), 戊癸→甲(0)
    yin_gan_idx = ((y_idx % 5) * 2 + 2) % 10
    # 月支距寅的偏移
    zhi_idx = DI_ZHI.index(month_zhi)
    offset = (zhi_idx - 2) % 12  # 寅=2
    gan_idx = (yin_gan_idx + offset) % 10
    return TIAN_GAN[gan_idx]


def _calc_ming_gong(year_gan: str, month_zhi: str, hour_zhi: str) -> str:
    """命宫：月支+时支逆推，天干用五虎遁月法"""
    m_idx = DI_ZHI.index(month_zhi)
    h_idx = DI_ZHI.index(hour_zhi)

    gong_zhi_idx = (14 - m_idx - h_idx) % 12
    gong_zhi = DI_ZHI[gong_zhi_idx]
    gong_gan = _wu_hu_dun_yue_gan(year_gan, gong_zhi)

    return f"{gong_gan}{gong_zhi}"


def _calc_shen_gong(year_gan: str, month_zhi: str, hour_zhi: str) -> str:
    """身宫：月支+时支顺推，天干用五虎遁月法"""
    m_idx = DI_ZHI.index(month_zhi)
    h_idx = DI_ZHI.index(hour_zhi)

    gong_zhi_idx = (m_idx + h_idx + 2) % 12
    gong_zhi = DI_ZHI[gong_zhi_idx]
    gong_gan = _wu_hu_dun_yue_gan(year_gan, gong_zhi)

    return f"{gong_gan}{gong_zhi}"


def _calc_tai_xi(day_gan: str, day_zhi: str) -> str:
    """胎息：日干配合推算"""
    g_idx = TIAN_GAN.index(day_gan)
    z_idx = DI_ZHI.index(day_zhi)
    # 胎息天干 = 日干的天干合（五合）
    tai_gan_idx = (g_idx + 5) % 10
    # 胎息地支 = 日支的六合
    tai_zhi = ZHI_LIU_HE.get(day_zhi, day_zhi)
    return f"{TIAN_GAN[tai_gan_idx]}{tai_zhi}"


# ============================================================
#  格局判断
# ============================================================

def _calc_pattern(
    day_master: str,
    month_p: Pillar, year_p: Pillar, day_p: Pillar, hour_p: Pillar,
    wuxing_score: dict[str, float],
    strength: float,
) -> tuple[str, str, float]:
    """格局判断（正格八格）"""

    # 月令藏干的十神
    month_hidden = month_p.hidden_gan
    if not month_hidden:
        return "", "", 0.0

    # 取月令本气
    month_ben_qi = month_hidden[0]
    ben_qi_ten_god = get_ten_god(day_master, month_ben_qi)

    # 比肩/劫财不成格，需看中余气或其他透出
    if ben_qi_ten_god in ("比肩", "劫财"):
        for hg in month_hidden[1:]:
            tg = get_ten_god(day_master, hg)
            if tg not in ("比肩", "劫财"):
                # 检查是否透出天干
                all_gan = [year_p.gan, month_p.gan, hour_p.gan]
                for ag in all_gan:
                    if GAN_WUXING.get(ag) == GAN_WUXING.get(hg):
                        ben_qi_ten_god = tg
                        break
                if ben_qi_ten_god not in ("比肩", "劫财"):
                    break
        if ben_qi_ten_god in ("比肩", "劫财"):
            return "", "建禄格" if ben_qi_ten_god == "比肩" else "羊刃格", 50.0

    pattern_name = ZHENG_GE_MAP.get(ben_qi_ten_god, "")
    if not pattern_name:
        return "", "", 0.0

    # 评分：基于格局的纯粹度
    pattern_score = 60.0

    # 月令本气透出天干加分
    all_gan_set = {year_p.gan, month_p.gan, hour_p.gan}
    for g in all_gan_set:
        if get_ten_god(day_master, g) == ben_qi_ten_god:
            pattern_score += 15.0
            break

    # 日主强弱与格局匹配度
    is_wealth_officer = ben_qi_ten_god in ("正财", "偏财", "正官", "七杀")
    if is_wealth_officer and strength < 50:
        pattern_score -= 10.0  # 身弱不担财官
    elif not is_wealth_officer and strength > 60:
        pattern_score -= 5.0

    pattern_score = max(0, min(100, pattern_score))

    return ben_qi_ten_god, pattern_name, round(pattern_score, 1)


# ============================================================
#  用神推算
# ============================================================

def _calc_yong_shen(
    day_master: str,
    strength: float,
    strength_level: str,
    pattern_type: str,
    wuxing_score: dict[str, float],
) -> tuple[str, str, str, str]:
    """用神推算（抑强扶弱）"""
    dm_wx = GAN_WUXING[day_master]
    wx_order = ["木", "火", "土", "金", "水"]

    sheng_wo = WUXING_SHENG_WO.get(dm_wx, "")  # 印
    wo_sheng = WUXING_SHENG.get(dm_wx, "")      # 食伤
    wo_ke = WUXING_KE.get(dm_wx, "")             # 财
    ke_wo = WUXING_KE_WO.get(dm_wx, "")          # 官杀

    if strength >= 55:
        # 身强：泄耗（食伤、财、官杀）
        yong = wo_sheng  # 食伤泄秀
        xi = wo_ke       # 财星耗身
        ji = sheng_wo    # 印星忌
        chou = dm_wx     # 比劫仇
    elif strength <= 45:
        # 身弱：生扶（印、比劫）
        yong = sheng_wo  # 印星生扶
        xi = dm_wx       # 比劫帮身
        ji = wo_ke       # 财星忌
        chou = ke_wo     # 官杀仇
    else:
        # 中和：取平衡
        sorted_wx = sorted(wuxing_score.items(), key=lambda x: x[1])
        yong = sorted_wx[0][0] if sorted_wx else ""
        xi = sorted_wx[1][0] if len(sorted_wx) > 1 else ""
        ji = sorted_wx[-1][0] if sorted_wx else ""
        chou = sorted_wx[-2][0] if len(sorted_wx) > 1 else ""

    return yong, xi, ji, chou


# ============================================================
#  调候用神
# ============================================================

def _calc_tiaohuo(day_master: str, month_zhi: str) -> str:
    """调候用神"""
    result = TIAOHUO_TABLE.get((day_master, month_zhi), "")
    return result


# ============================================================
#  农历月日中文
# ============================================================

_LUNAR_MONTHS = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
_LUNAR_DAYS_1 = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十"]
_LUNAR_DAYS_2 = ["十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"]
_LUNAR_DAYS_3 = ["廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]

def _lunar_month_cn(m: int) -> str:
    return _LUNAR_MONTHS[m] if 0 < m < len(_LUNAR_MONTHS) else str(m)

def _lunar_day_cn(d: int) -> str:
    if 1 <= d <= 10:
        return _LUNAR_DAYS_1[d]
    elif 11 <= d <= 20:
        return _LUNAR_DAYS_2[d - 11]
    elif 21 <= d <= 30:
        return _LUNAR_DAYS_3[d - 21]
    return str(d)
