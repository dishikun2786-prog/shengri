"""健康养生 API 路由 —— 五运六气与身体五行分析"""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Path

from ..core.wuyunliuqi import (
    calc_yunqi,
    get_daily_wuyun_detail,
    calc_liuyue_wuyun,
    get_yunqi_for_liunianday,
)
from ..core.organ_wuxing import (
    map_organs_by_bazi,
    calc_wuxing_imbalance,
    get_health_warning,
    get_body_map_data,
    generate_health_suggestions,
    WUXING_ORGANS,
)

router = APIRouter(prefix="/health", tags=["健康养生"])
logger = logging.getLogger(__name__)


@router.get("/wuyun", summary="获取指定日期的五运六气")
async def get_wuyun(
    target_date: str = Query(..., description="目标日期 YYYY-MM-DD"),
):
    """获取指定日期的五运六气详情

    Args:
        target_date: 目标日期，格式 YYYY-MM-DD

    Returns:
        五运六气详细信息
    """
    try:
        date_obj = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")

    try:
        result = calc_yunqi(date_obj)
        return result
    except Exception as e:
        logger.exception(f"五运六气计算错误: {target_date}")
        raise HTTPException(status_code=400, detail=f"五运六气计算错误: {str(e)}")


@router.get("/wuyun/daily", summary="获取当日五运六气详解")
async def get_daily_wuyun(
    target_date: str = Query(..., description="目标日期 YYYY-MM-DD"),
    bazi_wuxing_json: Optional[str] = Query(None, description="八字五行统计 JSON（可选）"),
):
    """获取当日五运六气详解（含养生重点）

    Args:
        target_date: 目标日期
        bazi_wuxing_json: 八字五行统计（可选），格式: {"木":5,"火":4,"土":3,"金":4,"水":6}

    Returns:
        当日五运六气详解与养生建议
    """
    try:
        date_obj = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")

    bazi_wuxing = None
    if bazi_wuxing_json:
        import json
        try:
            bazi_wuxing = json.loads(bazi_wuxing_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="bazi_wuxing_json 格式错误")

    try:
        result = get_daily_wuyun_detail(date_obj, bazi_wuxing)
        return result
    except Exception as e:
        logger.exception(f"当日五运六气详情计算错误: {target_date}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wuyun/liuyue/{year}", summary="获取全年流月五运六气")
async def get_liuyue_wuyun(year: int = Path(..., ge=1900, le=2100)):
    """获取指定年份各月的五运六气

    Args:
        year: 公历年

    Returns:
        全年12个月的五运六气月令
    """
    try:
        result = calc_liuyue_wuyun(year, 1)
        return {"year": year, "months": result}
    except Exception as e:
        logger.exception(f"流月五运计算错误: {year}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wuyun/liunian", summary="流年月日五运六气解读")
async def get_liunian_yunqi(
    target_date: str = Query(..., description="流年月日 YYYY-MM-DD"),
    liunian_gan: Optional[str] = Query(None, description="流年天干"),
    liunian_zhi: Optional[str] = Query(None, description="流年地支"),
):
    """获取流年月日的五运六气解读

    Args:
        target_date: 流年月日
        liunian_gan: 流年天干（可选，不传则用自然日期计算）
        liunian_zhi: 流年地支（可选）

    Returns:
        流年五运六气解读与养生建议
    """
    try:
        date_obj = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误")

    try:
        # 如果传入了流年干支，使用流年干支计算
        if liunian_gan and liunian_zhi:
            result = get_yunqi_for_liunianday(date_obj, liunian_gan, liunian_zhi)
        else:
            # 否则使用自然日期的干支
            result = get_yunqi_for_liunianday(date_obj, None, None)
        return result
    except Exception as e:
        logger.exception("流年五运六气解读错误")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/organs", summary="身体器官五行分析")
async def get_organ_analysis(
    bazi_json: str = Query(..., description="八字四柱 JSON"),
    wuxing_counts_json: str = Query(..., description="五行计数 JSON"),
):
    """根据八字五行偏重分析身体器官状态

    Args:
        bazi_json: 八字四柱，格式: {"day_gan":"甲","day_zhi":"子","year_zhi":"子",...}
        wuxing_counts_json: 五行计数，格式: {"木":5,"火":4,"土":3,"金":4,"水":6}

    Returns:
        身体器官五行分析结果
    """
    import json

    try:
        bazi = json.loads(bazi_json)
        wuxing = json.loads(wuxing_counts_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON 格式错误")

    day_master = bazi.get("day_gan", "甲")

    try:
        organ_status = map_organs_by_bazi(bazi, wuxing, day_master)
        imbalances = calc_wuxing_imbalance(wuxing)
        body_map = get_body_map_data(wuxing, organ_status)

        return {
            "器官状态": organ_status,
            "五行失衡": imbalances,
            "身体器官图": body_map,
        }
    except Exception as e:
        logger.exception("器官分析错误")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/warnings", summary="健康预警")
async def get_health_warnings(
    bazi_json: str = Query(..., description="八字四柱 JSON"),
    wuxing_counts_json: str = Query(..., description="五行计数 JSON"),
    wuyun_json: Optional[str] = Query(None, description="五运六气 JSON（可选）"),
):
    """生成综合健康预警

    Args:
        bazi_json: 八字四柱
        wuxing_counts_json: 五行计数
        wuyun_json: 五运六气信息（可选）

    Returns:
        健康预警列表
    """
    import json

    try:
        bazi = json.loads(bazi_json)
        wuxing = json.loads(wuxing_counts_json)
        wuyun = json.loads(wuyun_json) if wuyun_json else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON 格式错误")

    try:
        warnings = get_health_warning(bazi, wuxing, wuyun)
        return {"预警": warnings, "总数": len(warnings)}
    except Exception as e:
        logger.exception("健康预警生成错误")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/suggestions", summary="综合养生建议")
async def get_health_suggestions(
    bazi_json: str = Query(..., description="八字四柱 JSON"),
    wuxing_counts_json: str = Query(..., description="五行计数 JSON"),
    target_year: Optional[int] = Query(None, description="目标流年"),
    target_month: Optional[int] = Query(None, description="目标流月"),
    wuyun_json: Optional[str] = Query(None, description="五运六气 JSON（可选）"),
):
    """生成综合健康养生建议

    Args:
        bazi_json: 八字四柱
        wuxing_counts_json: 五行计数
        target_year: 目标流年
        target_month: 目标流月
        wuyun_json: 五运六气信息（可选）

    Returns:
        综合养生建议（含饮食、起居、情志、运动、节气）
    """
    import json

    try:
        bazi = json.loads(bazi_json)
        wuxing = json.loads(wuxing_counts_json)
        wuyun = json.loads(wuyun_json) if wuyun_json else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON 格式错误")

    try:
        suggestions = generate_health_suggestions(bazi, wuxing, wuyun, target_year, target_month)
        return suggestions
    except Exception as e:
        logger.exception("养生建议生成错误")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wuxing-descriptions", summary="五行身体详解")
async def get_wuxing_body_descriptions():
    """获取五行对应的身体器官详解

    Returns:
        五行身体完整对应表
    """
    return {
        wx: {
            "器官": info["脏"],
            "腑": info["腑"],
            "五官": info["五官"],
            "五体": info["五体"],
            "情志": info["情志"],
            "五味": info["五味"],
            "五色": info["五色"],
            "季节": info["季节"],
            "时辰": info["时辰"],
            "经络": info["经络"],
            "功能": info["功能"],
            "易患疾病": info["易患疾病"],
            "养护重点": info["养护重点"],
        }
        for wx, info in WUXING_ORGANS.items()
    }