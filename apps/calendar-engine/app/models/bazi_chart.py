"""八字命盘数据模型"""
from __future__ import annotations

from datetime import date, time, datetime
from typing import Optional
from pydantic import BaseModel, Field


class Pillar(BaseModel):
    """天干地支柱"""
    gan: str = Field(..., description="天干")
    zhi: str = Field(..., description="地支")
    gan_wuxing: str = Field("", description="天干五行")
    zhi_wuxing: str = Field("", description="地支五行")
    nayin: str = Field("", description="纳音")
    hidden_gan: list[str] = Field(default_factory=list, description="地支藏干")
    chang_sheng: str = Field("", description="十二长生")

    @property
    def full(self) -> str:
        return f"{self.gan}{self.zhi}"


class TenGodEntry(BaseModel):
    """十神条目"""
    gan: str
    ten_god: str
    position: str  # year_gan / month_gan / day_gan / hour_gan / hidden


class DaYun(BaseModel):
    """大运"""
    index: int = Field(..., description="第几步大运(从1开始)")
    start_age: float
    end_age: float
    gan: str
    zhi: str
    ten_god_gan: str = ""
    ten_god_zhi: str = ""
    nayin: str = ""
    chang_sheng: str = ""
    start_year: int = 0
    end_year: int = 0


class LiuNian(BaseModel):
    """流年"""
    year: int
    gan: str
    zhi: str
    ten_god_gan: str = ""
    ten_god_zhi: str = ""
    nayin: str = ""
    chang_sheng: str = ""
    tai_sui: str = ""


class ShenshaEntry(BaseModel):
    """神煞条目（结构化）"""
    name: str = Field(..., description="神煞名称")
    pillar: str = Field("", description="落柱: year/month/day/hour/multiple")
    category: str = Field("中", description="吉凶: 吉/凶/中")


class LiuYue(BaseModel):
    """流月"""
    month: int = Field(..., description="农历月序号（1=正月，12=腊月，闰月与同号农历月共享此序号）")
    solar_month_index: int = Field(0, description="本流月在公历月序中的位置（1-12），用于排序展示")
    gan: str = ""
    zhi: str = ""
    ten_god_gan: str = ""
    ten_god_zhi: str = ""
    nayin: str = ""
    jieqi_name: str = Field("", description="该月节气名")
    solar_month_start: str = Field("", description="阳历起始日期 YYYY-MM-DD")
    solar_month_end: str = Field("", description="阳历结束日期 YYYY-MM-DD")
    lunar_month: str = Field("", description="阴历月文本")
    lunar_month_number: int = Field(0, description="农历月数字（与 month 同值）")
    is_leap_month: bool = Field(False, description="是否闰月")




class LiuRi(BaseModel):
    """流日"""
    day: int = Field(..., description="日期 1-31")
    solar_date: str = Field("", description="公历日期 YYYY-MM-DD")
    display_solar_date: str = Field("", description="展示公历日期 YYYY-MM-DD")
    basis_date: str = Field("", description="干支与阴历计算基准日 YYYY-MM-DD")
    gan: str = ""
    zhi: str = ""
    ten_god_gan: str = ""
    ten_god_zhi: str = ""
    nayin: str = ""
    lunar_day_number: int = Field(0, description="阴历日数字")
    lunar_day: str = Field("", description="阴历日文本")
    lunar_date: str = Field("", description="阴历日期文本")


class GanZhiRelation(BaseModel):
    """干支合冲刑害关系"""
    type: str = Field(..., description="关系类型: 天干五合/地支六合/六冲/三合/三会/相刑/相害")
    positions: list[str] = Field(default_factory=list, description="涉及的柱位")
    elements: list[str] = Field(default_factory=list, description="涉及的干支")
    result: str = Field("", description="合化结果等补充信息")


class PrecomputedPillars(BaseModel):
    """由 lunisolar.js 预计算的四柱"""
    year_gan: str
    year_zhi: str
    month_gan: str
    month_zhi: str
    day_gan: str
    day_zhi: str
    hour_gan: str
    hour_zhi: str


class PrecomputedLunarInfo(BaseModel):
    """由 lunisolar.js 预计算的农历信息"""
    lunar_month: int
    lunar_day: int
    is_leap: bool = False


class BaziChartRequest(BaseModel):
    """排盘请求"""
    year: int = Field(..., ge=1900, le=2100, description="公历年")
    month: int = Field(..., ge=1, le=12, description="公历月")
    day: int = Field(..., ge=1, le=31, description="公历日")
    hour: int = Field(..., ge=0, le=23, description="小时")
    minute: int = Field(0, ge=0, le=59, description="分钟")
    gender: int = Field(..., description="性别: 1男 2女")
    city: Optional[str] = Field(None, description="出生城市")
    longitude: Optional[float] = Field(None, description="经度")
    latitude: Optional[float] = Field(None, description="纬度")
    timezone: Optional[str] = Field(None, description="时区")
    midnight_rule: str = Field("early", description="子时规则: early=早子时属当日, late=晚子时属次日")
    pillars: Optional[PrecomputedPillars] = Field(None, description="由 lunisolar.js 预计算的四柱")
    lunar_info: Optional[PrecomputedLunarInfo] = Field(None, description="由 lunisolar.js 预计算的农历")


class BaziChartResponse(BaseModel):
    """排盘结果"""
    # 四柱
    year_pillar: Pillar
    month_pillar: Pillar
    day_pillar: Pillar
    hour_pillar: Pillar

    # 十神
    ten_gods: list[TenGodEntry] = Field(default_factory=list)

    # 五行
    wuxing_counts: dict[str, int] = Field(default_factory=dict)
    wuxing_score: dict[str, float] = Field(default_factory=dict)

    # 日主
    day_master: str = Field("", description="日主天干")
    day_master_wuxing: str = Field("", description="日主五行")
    day_master_strength: float = Field(0.0, description="日主强度(0-100)")
    strength_level: str = Field("", description="强弱等级")

    # 大运
    dayun_direction: int = Field(1, description="大运方向: 1顺 -1逆")
    dayun_start_age: float = Field(0.0, description="起运年龄")
    dayun_list: list[DaYun] = Field(default_factory=list)

    # 流年
    liunian_list: list[LiuNian] = Field(default_factory=list)

    # 神煞
    shensha_list: list[ShenshaEntry] = Field(default_factory=list)

    # 空亡
    kong_wang: list[str] = Field(default_factory=list, description="日柱旬空二支")

    # 十二长生 (四柱)
    chang_sheng: dict[str, str] = Field(default_factory=dict, description="四柱十二长生状态")

    # 胎元/命宫/身宫
    tai_yuan: str = Field("", description="胎元干支")
    ming_gong: str = Field("", description="命宫干支")
    shen_gong: str = Field("", description="身宫干支")
    tai_xi: str = Field("", description="胎息干支")

    # 干支关系
    relations: list[GanZhiRelation] = Field(default_factory=list, description="干支合冲刑害关系")

    # 格局
    pattern_type: str = Field("", description="格局类型")
    pattern_name: str = Field("", description="格局名称")
    pattern_score: float = Field(0.0, description="格局评分")

    # 用神
    yong_shen: str = Field("", description="用神")
    xi_shen: str = Field("", description="喜神")
    ji_shen: str = Field("", description="忌神")
    chou_shen: str = Field("", description="仇神")

    # 调候
    tiaohuo_need: str = Field("", description="调候用神")

    # 元数据
    solar_datetime: str = Field("", description="公历时间")
    lunar_date: str = Field("", description="农历日期")
    true_solar_time: str = Field("", description="真太阳时")
    time_correction_min: float = Field(0.0, description="时间校正分钟数")
    jieqi_info: str = Field("", description="节气信息")
    midnight_rule: str = Field("early", description="子时规则")
    gender: int = Field(1)
    birth_city: str = Field("")
    longitude: float = Field(0.0)
    latitude: float = Field(0.0)

    engine_version: str = Field("1.0.0")
    algorithm_version: str = Field("1.0.0")
