"""八字排盘 API 路由"""
import json
import os
import logging

from fastapi import APIRouter, HTTPException, Query

from ..models.bazi_chart import BaziChartRequest, BaziChartResponse, LiuYue, LiuRi, LiuNian
from ..core.pillar_calculator import calculate_bazi, _calc_liuyue, _calc_liuri, _calc_liunian
from ..core.geocoder import lookup_city, search_cities

router = APIRouter(prefix="/bazi", tags=["八字排盘"])
logger = logging.getLogger(__name__)

CITY_TREE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "city_tree.json"
)
_tree_cache = None


def _load_city_tree():
    global _tree_cache
    if _tree_cache is not None:
        return _tree_cache
    try:
        with open(CITY_TREE_PATH, "r", encoding="utf-8") as f:
            _tree_cache = json.load(f)
    except FileNotFoundError:
        _tree_cache = []
    return _tree_cache


@router.post("/chart", response_model=BaziChartResponse, summary="八字排盘")
async def create_chart(req: BaziChartRequest):
    """根据出生信息计算八字命盘

    支持: 真太阳时校正、全球城市、子时换日配置
    """
    longitude = req.longitude if req.longitude is not None else 120.0
    latitude = req.latitude if req.latitude is not None else 35.0
    tz_offset = 8.0
    has_location = req.longitude is not None or req.latitude is not None

    if req.city:
        city_info = lookup_city(req.city)
        if city_info:
            longitude = city_info["longitude"]
            latitude = city_info["latitude"]
            tz_offset = city_info.get("timezone_offset", 8.0)
            has_location = True

    if req.timezone:
        try:
            tz_offset = float(req.timezone)
        except ValueError:
            pass

    precomputed = None
    precomputed_lunar = None
    if req.pillars:
        precomputed = {
            "year_gan": req.pillars.year_gan,
            "year_zhi": req.pillars.year_zhi,
            "month_gan": req.pillars.month_gan,
            "month_zhi": req.pillars.month_zhi,
            "day_gan": req.pillars.day_gan,
            "day_zhi": req.pillars.day_zhi,
            "hour_gan": req.pillars.hour_gan,
            "hour_zhi": req.pillars.hour_zhi,
        }
    if req.lunar_info:
        precomputed_lunar = {
            "lunar_month": req.lunar_info.lunar_month,
            "lunar_day": req.lunar_info.lunar_day,
            "is_leap": req.lunar_info.is_leap,
        }

    try:
        result = calculate_bazi(
            year=req.year,
            month=req.month,
            day=req.day,
            hour=req.hour,
            minute=req.minute,
            gender=req.gender,
            longitude=longitude,
            latitude=latitude,
            timezone_offset=tz_offset,
            midnight_rule=req.midnight_rule,
            apply_tst=has_location,
            precomputed_pillars=precomputed,
            precomputed_lunar=precomputed_lunar,
        )
        if req.city:
            result.birth_city = req.city
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"排盘计算错误: {str(e)}")


@router.get("/cities", summary="获取支持的城市列表")
async def list_cities():
    """返回所有支持的城市（含层级树和扁平列表）"""
    from ..core.geocoder import _load_city_data
    data = _load_city_data()
    tree = _load_city_tree()
    return {
        "cities": list(data.keys()),
        "total": len(data),
        "tree": tree,
    }


@router.get("/cities/search", summary="搜索城市/区县")
async def search_cities_api(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(10, ge=1, le=50, description="返回数量上限"),
):
    """模糊搜索城市/区县名称，返回匹配结果列表"""
    results = search_cities(q, limit=limit)
    return {"results": results, "total": len(results)}


@router.get("/liuyue", response_model=list[LiuYue], summary="流月干支")
async def get_liuyue(
    year: int = Query(..., ge=1900, le=2100, description="公历年"),
    day_master: str | None = Query(None, min_length=1, max_length=1, description="日主天干（可选，兼容旧版）"),
):
    """返回指定年份流月（按阴历月边界计算公历起止）"""
    try:
        return _calc_liuyue(year, day_master)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"流月计算错误: {str(e)}")


@router.get("/liuri", response_model=list[LiuRi], summary="流日干支")
async def get_liuri(
    year: int = Query(..., ge=1900, le=2100, description="公历年"),
    month: int = Query(..., ge=1, le=12, description="公历月"),
    day_master: str | None = Query(None, min_length=1, max_length=1, description="日主天干（可选，兼容旧版）"),
    day_boundary_mode: str = Query("zi_hour", pattern="^(gregorian_midnight|zi_hour)$", description="换日口径"),
    use_true_solar_time: bool = Query(False, description="是否使用真太阳时判断换日"),
    reference_hour: int = Query(0, ge=0, le=23, description="参考小时"),
    reference_minute: int = Query(0, ge=0, le=59, description="参考分钟"),
    longitude: float = Query(120.0, ge=-180.0, le=180.0, description="经度"),
    timezone_offset: float = Query(8.0, ge=-12.0, le=14.0, description="时区偏移"),
):
    """返回指定年月每日的干支（统一基准日口径的万年历直出）"""
    try:
        result = _calc_liuri(
            year,
            month,
            day_master,
            day_boundary_mode=day_boundary_mode,
            use_true_solar_time=use_true_solar_time,
            reference_hour=reference_hour,
            reference_minute=reference_minute,
            longitude=longitude,
            timezone_offset=timezone_offset,
        )
        logger.info(
            "liuri request y=%s m=%s mode=%s tst=%s h=%s mi=%s lon=%s tz=%s count=%s first=%s last=%s",
            year,
            month,
            day_boundary_mode,
            use_true_solar_time,
            reference_hour,
            reference_minute,
            longitude,
            timezone_offset,
            len(result),
            result[0].basis_date if result else "",
            result[-1].basis_date if result else "",
        )
        return result
    except Exception as e:
        logger.exception("liuri request failed y=%s m=%s", year, month)
        raise HTTPException(status_code=400, detail=f"流日计算错误: {str(e)}")


@router.get("/liunian", response_model=list[LiuNian], summary="流年干支")
async def get_liunian(
    day_master: str = Query(..., min_length=1, max_length=1, description="日主天干"),
    year_zhi: str = Query(..., min_length=1, max_length=1, description="年柱地支"),
    start_year: int = Query(..., ge=1900, le=2100, description="起始公历年"),
    count: int = Query(10, ge=1, le=120, description="返回年数"),
):
    """返回指定起止年份范围的流年干支（含十神、纳音、十二长生、太岁关系）"""
    try:
        return _calc_liunian(day_master, year_zhi, start_year, count)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"流年计算错误: {str(e)}")
