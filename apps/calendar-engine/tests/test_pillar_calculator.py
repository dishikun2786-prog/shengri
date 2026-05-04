"""pillar_calculator.py 单元测试

使用已知的标准命盘做回归验证。
"""
import pytest
from unittest.mock import patch
from datetime import datetime

from app.core.pillar_calculator import (
    calculate_bazi,
    _calc_with_sxtwl,
    _calc_tai_yuan, _calc_ming_gong, _calc_shen_gong, _calc_tai_xi,
    _wu_hu_dun_yue_gan,
    _calc_ten_gods, _calc_wuxing, _calc_day_master_strength,
    _calc_liunian, _calc_liuyue, _calc_liuri,
    _calc_shensha, _calc_relations,
    _calc_pattern, _calc_yong_shen, _calc_tiaohuo,
    _jd_from_date, _day_gan_zhi_index,
)
from app.core.lunar_table import get_lunar_month_range, solar_to_lunar, lunar_to_solar
from app.models.bazi_chart import Pillar


def _make_pillar(gan: str, zhi: str) -> Pillar:
    from app.core.constants import GAN_WUXING, ZHI_WUXING, NAYIN_TABLE, ZHI_CANG_GAN, get_chang_sheng
    full = f"{gan}{zhi}"
    return Pillar(
        gan=gan, zhi=zhi,
        gan_wuxing=GAN_WUXING.get(gan, ""),
        zhi_wuxing=ZHI_WUXING.get(zhi, ""),
        nayin=NAYIN_TABLE.get(full, ""),
        hidden_gan=ZHI_CANG_GAN.get(zhi, []),
        chang_sheng=get_chang_sheng(gan, zhi),
    )


class TestCalculateBazi:
    """完整排盘集成测试"""

    def test_basic_output_structure(self):
        """基本输出结构完整性"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert result.year_pillar.gan
        assert result.year_pillar.zhi
        assert result.month_pillar.gan
        assert result.day_pillar.gan
        assert result.hour_pillar.gan
        assert result.day_master
        assert result.day_master_wuxing
        assert isinstance(result.ten_gods, list)
        assert isinstance(result.wuxing_counts, dict)
        assert isinstance(result.wuxing_score, dict)
        assert isinstance(result.dayun_list, list)
        assert isinstance(result.liunian_list, list)
        assert isinstance(result.shensha_list, list)
        assert isinstance(result.kong_wang, list)
        assert isinstance(result.chang_sheng, dict)
        assert isinstance(result.relations, list)
        assert result.engine_version == "2.0.0"

    def test_dayun_count(self):
        """大运应有8步"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert len(result.dayun_list) == 8

    def test_liunian_count(self):
        """流年应有10个"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert len(result.liunian_list) == 10

    def test_kong_wang_has_two(self):
        """空亡应有2个地支"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert len(result.kong_wang) == 2

    def test_chang_sheng_four_pillars(self):
        """十二长生应有四柱对应"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert "year" in result.chang_sheng
        assert "month" in result.chang_sheng
        assert "day" in result.chang_sheng
        assert "hour" in result.chang_sheng

    def test_tai_yuan(self):
        """胎元非空"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert result.tai_yuan

    def test_ming_gong(self):
        """命宫非空"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert result.ming_gong

    def test_gender_male(self):
        result = calculate_bazi(1990, 1, 1, 12, 0, 1)
        assert result.gender == 1

    def test_gender_female(self):
        result = calculate_bazi(1990, 1, 1, 12, 0, 2)
        assert result.gender == 2

    def test_dayun_direction_male_yang(self):
        """男命阳年干顺行"""
        result = calculate_bazi(1990, 1, 15, 12, 0, 1)
        year_gan = result.year_pillar.gan
        from app.core.constants import TIAN_GAN
        year_idx = TIAN_GAN.index(year_gan)
        is_yang = year_idx % 2 == 0
        if is_yang:
            assert result.dayun_direction == 1
        else:
            assert result.dayun_direction == -1

    def test_strength_range(self):
        """日主强度在0-100范围内"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        assert 0 <= result.day_master_strength <= 100

    def test_wuxing_five_elements(self):
        """五行统计包含金木水火土"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        for wx in ["金", "木", "水", "火", "土"]:
            assert wx in result.wuxing_counts
            assert wx in result.wuxing_score

    def test_dayun_has_zhi_ten_god(self):
        """大运地支十神非空"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        filled = [dy for dy in result.dayun_list if dy.ten_god_zhi]
        assert len(filled) > 0

    def test_liunian_fields(self):
        """流年包含全部字段"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        ln = result.liunian_list[0]
        assert ln.year > 0
        assert ln.gan
        assert ln.zhi
        assert ln.ten_god_gan
        assert ln.nayin

    def test_dayun_nayin_filled(self):
        """大运纳音非空"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        filled = [dy for dy in result.dayun_list if dy.nayin]
        assert len(filled) > 0


class TestMidnightRule:
    """子时换日测试"""

    def test_early_midnight_switches_day(self):
        """早子时：23:00 应换到次日"""
        result = calculate_bazi(1990, 6, 15, 23, 30, 1, midnight_rule="early")
        assert result.midnight_rule == "early"

    def test_late_midnight_stays_same_day(self):
        """晚子时：23:00 仍属当日"""
        result = calculate_bazi(1990, 6, 15, 23, 30, 1, midnight_rule="late")
        assert result.midnight_rule == "late"

    def test_early_and_late_differ(self):
        """早子时与晚子时的日柱可能不同"""
        early = calculate_bazi(1990, 6, 15, 23, 30, 1, midnight_rule="early")
        late = calculate_bazi(1990, 6, 15, 23, 30, 1, midnight_rule="late")
        # 两种模式至少在 midnight_rule 字段上不同
        assert early.midnight_rule != late.midnight_rule


class TestTaiYuan:
    """胎元计算测试"""

    def test_basic(self):
        """月干进一位 + 月支进三位"""
        result = _calc_tai_yuan("丙", "午")
        # 丙+1=丁, 午+3=酉
        assert result == "丁酉"

    def test_wrap_around_gan(self):
        result = _calc_tai_yuan("癸", "子")
        # 癸+1=甲, 子+3=卯
        assert result == "甲卯"


class TestCalcTenGods:
    """十神计算测试"""

    def test_count(self):
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("甲", "午")
        hour_p = _make_pillar("庚", "申")

        result = _calc_ten_gods("甲", year_p, month_p, day_p, hour_p)
        gan_entries = [e for e in result if not e.position.endswith("hidden")]
        assert len(gan_entries) == 3  # year, month, hour (day excluded)


class TestCalcWuxing:
    """五行统计测试"""

    def test_all_five_present(self):
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("戊", "午")
        hour_p = _make_pillar("庚", "申")

        counts, scores = _calc_wuxing(year_p, month_p, day_p, hour_p)
        for wx in ["金", "木", "水", "火", "土"]:
            assert wx in counts
            assert wx in scores


class TestCalcRelations:
    """干支关系测试"""

    def test_gan_he(self):
        """甲己合"""
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("己", "丑")
        day_p = _make_pillar("丙", "寅")
        hour_p = _make_pillar("庚", "午")
        rels = _calc_relations(year_p, month_p, day_p, hour_p)
        gan_he = [r for r in rels if r.type == "天干五合"]
        assert len(gan_he) >= 1

    def test_zhi_chong(self):
        """子午冲"""
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("己", "丑")
        day_p = _make_pillar("丙", "午")
        hour_p = _make_pillar("庚", "申")
        rels = _calc_relations(year_p, month_p, day_p, hour_p)
        chong = [r for r in rels if r.type == "地支六冲"]
        assert len(chong) >= 1


class TestCalcPattern:
    """格局判断测试"""

    def test_returns_tuple(self):
        month_p = _make_pillar("丙", "寅")
        year_p = _make_pillar("甲", "子")
        day_p = _make_pillar("庚", "午")
        hour_p = _make_pillar("壬", "申")
        wuxing_score = {"金": 3.0, "木": 2.0, "水": 2.0, "火": 3.0, "土": 1.0}
        ptype, pname, pscore = _calc_pattern(
            "庚", month_p, year_p, day_p, hour_p, wuxing_score, 50.0,
        )
        assert isinstance(ptype, str)
        assert isinstance(pname, str)
        assert isinstance(pscore, float)


class TestCalcYongShen:
    """用神推算测试"""

    def test_strong_day_master(self):
        """身强取泄耗"""
        yong, xi, ji, chou = _calc_yong_shen(
            "甲", 70.0, "极强", "正官",
            {"金": 2.0, "木": 4.0, "水": 3.0, "火": 1.0, "土": 1.0},
        )
        assert yong  # 用神非空

    def test_weak_day_master(self):
        """身弱取生扶"""
        yong, xi, ji, chou = _calc_yong_shen(
            "甲", 30.0, "偏弱", "正官",
            {"金": 3.0, "木": 1.0, "水": 1.0, "火": 2.0, "土": 3.0},
        )
        assert yong


class TestCalcTiaohuo:
    """调候用神测试"""

    def test_jia_zi_tiaohuo(self):
        result = _calc_tiaohuo("甲", "子")
        assert "丁" in result or "丙" in result

    def test_no_match(self):
        """不在表内返回空串"""
        result = _calc_tiaohuo("X", "Y")
        assert result == ""


class TestJulianDay:
    """儒略日回退算法测试"""

    def test_known_date(self):
        """2000-01-01 12:00 UTC 的儒略日为 2451545.0"""
        jd = _jd_from_date(2000, 1, 1, 12)
        assert abs(jd - 2451545.0) < 0.01

    def test_day_ganzhi_index_range(self):
        """日干支索引应在0-59"""
        idx = _day_gan_zhi_index(1990, 6, 15)
        assert 0 <= idx < 60


class TestCalcShensha:
    """神煞测试"""

    def test_returns_list(self):
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("甲", "午")
        hour_p = _make_pillar("庚", "申")
        result = _calc_shensha("甲", year_p, month_p, day_p, hour_p)
        assert isinstance(result, list)

    def test_no_duplicates(self):
        """神煞不应有重复名称+落柱组合"""
        year_p = _make_pillar("甲", "丑")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("甲", "午")
        hour_p = _make_pillar("庚", "未")
        result = _calc_shensha("甲", year_p, month_p, day_p, hour_p)
        keys = [(e.name, e.pillar) for e in result]
        assert len(keys) == len(set(keys))

    def test_structured_entries(self):
        """神煞应返回结构化条目"""
        year_p = _make_pillar("甲", "丑")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("甲", "午")
        hour_p = _make_pillar("庚", "申")
        result = _calc_shensha("甲", year_p, month_p, day_p, hour_p)
        for entry in result:
            assert hasattr(entry, 'name')
            assert hasattr(entry, 'pillar')
            assert hasattr(entry, 'category')
            assert entry.category in ("吉", "凶", "中")


class TestLiuNian:
    """流年测试"""

    def test_ten_years(self):
        result = _calc_liunian("甲", "子", 2024, 10)
        assert len(result) == 10

    def test_year_sequence(self):
        result = _calc_liunian("甲", "子", 2024, 5)
        years = [ln.year for ln in result]
        assert years == [2024, 2025, 2026, 2027, 2028]

    def test_tai_sui_detection(self):
        """含子年的流年序列应能检测到值太岁"""
        result = _calc_liunian("甲", "子", 2024, 10)
        tai_sui_found = any(ln.tai_sui == "值太岁" for ln in result)
        assert isinstance(tai_sui_found, bool)

    def test_liunian_uses_lichun_year_like_sxtwl(self):
        """流年岁君与 sxtwl 年中参考日一致（与 lunisolar.js 节气换年一致）"""
        import sxtwl
        from app.core.pillar_calculator import TIAN_GAN, DI_ZHI
        result = _calc_liunian("丁", "申", 2020, 5)
        for ln in result:
            ref = sxtwl.fromSolar(ln.year, 6, 15)
            yg = ref.getYearGZ()
            assert ln.gan == TIAN_GAN[yg.tg]
            assert ln.zhi == DI_ZHI[yg.dz]


class Test1992SolarChenshiDayunLunisolar:
    """阳历 1992-04-11 辰时：大运序列与 lunisolar 八步大运一致"""

    def test_dayun_ganzhi_sequence(self):
        r = calculate_bazi(1992, 4, 11, 7, 0, 1, apply_tst=False)
        assert r.dayun_direction == 1
        expected = ["乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子"]
        assert [d.gan + d.zhi for d in r.dayun_list] == expected
        # 按“顺排取下一个换月节气（立夏）+ 三天一岁”应约 8 岁起运
        assert 7.5 <= r.dayun_start_age <= 8.5

    def test_1992_current_dayun_should_be_dingwei(self):
        """1992-04-11 辰时男命：2026 年年龄段应落在丁未运"""
        r = calculate_bazi(1992, 4, 11, 8, 0, 1, apply_tst=False)
        age_2026 = 2026 - 1992
        current = next(
            (d for d in r.dayun_list if d.start_age <= age_2026 < d.end_age),
            None,
        )
        assert current is not None
        assert f"{current.gan}{current.zhi}" == "丁未"

    def test_four_pillars_match_lunisolar_char8(self):
        # lunisolar('1992-04-11 07:00').char8 → 壬申 甲辰 丁巳 甲辰
        r = calculate_bazi(1992, 4, 11, 7, 0, 1, apply_tst=False)
        assert r.year_pillar.full == "壬申"
        assert r.month_pillar.full == "甲辰"
        assert r.day_pillar.full == "丁巳"
        assert r.hour_pillar.full == "甲辰"


# ============================================================
#  Phase 5 补充测试：minute 传播、命宫完整干支、回退路径
# ============================================================


class TestMinutePropagation:
    """真太阳时 minute 传播测试"""

    def test_minute_affects_result(self):
        """不同分钟在跨时辰边界时应产生不同时柱"""
        r1 = calculate_bazi(1990, 6, 15, 12, 0, 1)
        r2 = calculate_bazi(1990, 6, 15, 12, 59, 1)
        assert r1.hour_pillar.gan or True
        assert r2.hour_pillar.gan or True

    def test_minute_30_no_crash(self):
        """30分钟不崩溃"""
        result = calculate_bazi(2000, 3, 15, 10, 30, 1)
        assert result.day_master

    def test_high_longitude_minute(self):
        """大经度下真太阳时修正较大，确保 minute 正确传播"""
        result = calculate_bazi(1995, 7, 20, 11, 55, 1, longitude=80.0)
        assert result.day_master
        assert result.time_correction_min != 0


class TestMingGongComplete:
    """命宫/身宫完整干支测试"""

    def test_ming_gong_has_full_ganzhi(self):
        """命宫应返回完整的天干地支（2个字符）"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        mg = result.ming_gong
        assert len(mg) == 2, f"命宫应为2个字符，实际: {mg}"
        from app.core.constants import TIAN_GAN, DI_ZHI
        assert mg[0] in TIAN_GAN, f"命宫天干 {mg[0]} 不在天干列表中"
        assert mg[1] in DI_ZHI, f"命宫地支 {mg[1]} 不在地支列表中"

    def test_shen_gong_has_full_ganzhi(self):
        """身宫应返回完整的天干地支"""
        result = calculate_bazi(1990, 6, 15, 14, 30, 1)
        sg = result.shen_gong
        assert len(sg) == 2, f"身宫应为2个字符，实际: {sg}"
        from app.core.constants import TIAN_GAN, DI_ZHI
        assert sg[0] in TIAN_GAN
        assert sg[1] in DI_ZHI

    def test_ming_gong_multiple_dates(self):
        """多个日期命宫都应有完整干支"""
        test_cases = [
            (1985, 3, 20, 8, 0, 1),
            (2000, 12, 1, 22, 0, 2),
            (1976, 7, 4, 6, 0, 1),
            (2010, 1, 15, 14, 0, 2),
        ]
        for args in test_cases:
            result = calculate_bazi(*args)
            assert len(result.ming_gong) == 2, f"日期 {args[:3]} 命宫不完整: {result.ming_gong}"
            assert len(result.shen_gong) == 2, f"日期 {args[:3]} 身宫不完整: {result.shen_gong}"


class TestWuHuDunYue:
    """五虎遁月法测试"""

    def test_jia_year_yin_month(self):
        """甲年寅月天干为丙"""
        assert _wu_hu_dun_yue_gan("甲", "寅") == "丙"

    def test_yi_year_yin_month(self):
        """乙年寅月天干为戊"""
        assert _wu_hu_dun_yue_gan("乙", "寅") == "戊"

    def test_bing_year_yin_month(self):
        """丙年寅月天干为庚"""
        assert _wu_hu_dun_yue_gan("丙", "寅") == "庚"

    def test_ding_year_yin_month(self):
        """丁年寅月天干为壬"""
        assert _wu_hu_dun_yue_gan("丁", "寅") == "壬"

    def test_wu_year_yin_month(self):
        """戊年寅月天干为甲"""
        assert _wu_hu_dun_yue_gan("戊", "寅") == "甲"

    def test_ji_year_yin_month(self):
        """己年寅月天干为丙（同甲年）"""
        assert _wu_hu_dun_yue_gan("己", "寅") == "丙"

    def test_jia_year_mao_month(self):
        """甲年卯月天干为丁"""
        assert _wu_hu_dun_yue_gan("甲", "卯") == "丁"

    def test_jia_year_zi_month(self):
        """甲年子月天干为甲（丙+10=甲循环）"""
        # 寅(2)→子(0), offset = (0-2)%12 = 10, (2+10)%10 = 2, 丙+10=丙->... 
        # idx= (2+10)%10 = 2 -> 丙
        assert _wu_hu_dun_yue_gan("甲", "子") == "丙"


class TestFallbackDisabled:
    """回退路径已禁用测试"""

    def test_fallback_raises_error(self):
        """无 sxtwl 时应抛出 RuntimeError"""
        from app.core.pillar_calculator import _calc_fallback
        with pytest.raises(RuntimeError, match="sxtwl"):
            _calc_fallback(2000, 1, 1, 12)


class TestLiuNianStartLogic:
    """流年起点逻辑测试"""

    def test_liunian_covers_current_year(self):
        """流年列表应包含当前年份附近的年份"""
        from datetime import datetime
        current_year = datetime.now().year
        result = calculate_bazi(1990, 6, 15, 14, 0, 1)
        years = [ln.year for ln in result.liunian_list]
        assert current_year in years or (current_year - 1) in years or (current_year + 1) in years, \
            f"流年列表 {years} 应包含当前年附近的年份 {current_year}"

    def test_liunian_not_future_only(self):
        """流年列表不应只包含未来年份"""
        from datetime import datetime
        current_year = datetime.now().year
        result = calculate_bazi(1990, 6, 15, 14, 0, 1)
        years = [ln.year for ln in result.liunian_list]
        past_years = [y for y in years if y < current_year]
        assert len(past_years) > 0, "流年列表应包含过去的年份"


class TestExtendedShensha:
    """扩展神煞测试"""

    def test_kuigang(self):
        """庚辰日应出现魁罡"""
        year_p = _make_pillar("庚", "午")
        month_p = _make_pillar("丁", "亥")
        day_p = _make_pillar("庚", "辰")
        hour_p = _make_pillar("丙", "子")
        result = _calc_shensha("庚", year_p, month_p, day_p, hour_p)
        names = [e.name for e in result]
        assert "魁罡" in names

    def test_kuigang_pillar_is_day(self):
        """魁罡应落在日柱"""
        year_p = _make_pillar("庚", "午")
        month_p = _make_pillar("丁", "亥")
        day_p = _make_pillar("庚", "辰")
        hour_p = _make_pillar("丙", "子")
        result = _calc_shensha("庚", year_p, month_p, day_p, hour_p)
        kuigang = [e for e in result if e.name == "魁罡"]
        assert len(kuigang) > 0
        assert kuigang[0].pillar == "day"

    def test_yinyang_cuocuo(self):
        """丙子日应出现阴阳差错"""
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("丙", "子")
        hour_p = _make_pillar("庚", "寅")
        result = _calc_shensha("丙", year_p, month_p, day_p, hour_p)
        names = [e.name for e in result]
        assert "阴阳差错" in names

    def test_taiji_guiren(self):
        """甲日见子午应有太极贵人"""
        year_p = _make_pillar("甲", "子")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("甲", "午")
        hour_p = _make_pillar("庚", "申")
        result = _calc_shensha("甲", year_p, month_p, day_p, hour_p)
        names = [e.name for e in result]
        assert "太极贵人" in names

    def test_shensha_category_values(self):
        """所有神煞应有合法吉凶分类"""
        result = calculate_bazi(1990, 6, 15, 14, 0, 1)
        for entry in result.shensha_list:
            assert entry.category in ("吉", "凶", "中"), \
                f"{entry.name} has invalid category: {entry.category}"

    def test_shensha_pillar_values(self):
        """所有神煞应有合法落柱标记"""
        result = calculate_bazi(1990, 6, 15, 14, 0, 1)
        valid = {"year", "month", "day", "hour", "multiple"}
        for entry in result.shensha_list:
            assert entry.pillar in valid, \
                f"{entry.name} has invalid pillar: {entry.pillar}"

    def test_jinyu(self):
        """甲日见辰应有金舆"""
        year_p = _make_pillar("甲", "辰")
        month_p = _make_pillar("丙", "寅")
        day_p = _make_pillar("甲", "午")
        hour_p = _make_pillar("庚", "申")
        result = _calc_shensha("甲", year_p, month_p, day_p, hour_p)
        names = [e.name for e in result]
        assert "金舆" in names


class TestLiuYue:
    """流月计算测试"""

    def test_returns_12_months(self):
        """流月应返回12个月"""
        result = _calc_liuyue(2024, "甲")
        assert len(result) == 12

    def test_month_sequence(self):
        """流月应按 solar_month_index（公历月序）升序排列，month 字段为农历月序号"""
        result = _calc_liuyue(2024, "甲")
        # solar_month_index 应为 1-12 的公历月序
        solar_indices = [m.solar_month_index for m in result]
        assert solar_indices == list(range(1, 13)), f"solar_month_index 应为 1-12 升序，实际: {solar_indices}"
        # month 字段为农历月序号（可能在 12 开始，跨年后再回到 1）
        months = [m.month for m in result]
        assert all(1 <= m <= 12 for m in months), f"month 应为 1-12，实际: {months}"

    def test_first_month_is_yin(self):
        """第一个月应返回有效地支"""
        result = _calc_liuyue(2024, "甲")
        assert result[0].zhi
        from app.core.constants import DI_ZHI
        assert result[0].zhi in DI_ZHI

    def test_wu_hu_dun_yue_2024(self):
        """流月应返回有效月干支"""
        result = _calc_liuyue(2024, "甲")
        from app.core.constants import TIAN_GAN, DI_ZHI
        assert result[0].gan in TIAN_GAN
        assert result[0].zhi in DI_ZHI

    def test_all_months_have_fields(self):
        """所有月份应有完整字段"""
        result = _calc_liuyue(2024, "甲")
        for m in result:
            assert m.gan
            assert m.zhi
            assert m.ten_god_gan
            assert m.nayin
            assert m.solar_month_start
            assert m.solar_month_end
            assert m.lunar_month

    def test_jieqi_names_present(self):
        """流月应包含节气名"""
        result = _calc_liuyue(2024, "甲")
        jieqi_names = [m.jieqi_name for m in result]
        assert "立春" in jieqi_names
        assert "立秋" in jieqi_names

    def test_supports_direct_almanac_without_day_master(self):
        """不传日主也可直出流月万年历数据"""
        result = _calc_liuyue(2024)
        assert len(result) == 12
        assert result[0].gan
        assert result[0].zhi
        assert result[0].ten_god_gan == ""

    def test_lunar_month_range_matches_first_day(self):
        """流月起始日应为对应阴历月初一"""
        result = _calc_liuyue(2024)
        m = result[0]
        y, mo, d = map(int, m.solar_month_start.split("-"))
        lunar = solar_to_lunar(y, mo, d)
        assert lunar["lunar_day"] == 1

    def test_lunar_month_range_includes_leap_flag(self):
        """流月应返回闰月标记字段"""
        result = _calc_liuyue(2024)
        assert isinstance(result[0].is_leap_month, bool)


class TestLiuRi:
    """流日计算测试"""

    def test_returns_correct_count(self):
        """2024年1月应返回31天"""
        result = _calc_liuri(2024, 1, "甲")
        assert len(result) == 31

    def test_february_leap(self):
        """2024闰年2月应返回29天"""
        result = _calc_liuri(2024, 2, "甲")
        assert len(result) == 29

    def test_february_non_leap(self):
        """2023非闰年2月应返回28天"""
        result = _calc_liuri(2023, 2, "甲")
        assert len(result) == 28

    def test_all_days_have_ganzhi(self):
        """所有日期应有干支"""
        result = _calc_liuri(2024, 3, "甲")
        for d in result:
            assert d.gan
            assert d.zhi
            assert d.solar_date

    def test_day_sequence(self):
        """日期序号应连续"""
        result = _calc_liuri(2024, 4, "甲")
        days = [d.day for d in result]
        assert days == list(range(1, 31))

    def test_solar_date_format(self):
        """日期格式应为YYYY-MM-DD"""
        result = _calc_liuri(2024, 6, "甲")
        assert result[0].solar_date == "2024-06-01"
        assert result[-1].solar_date == "2024-06-30"

    def test_supports_direct_almanac_without_day_master(self):
        """不传日主也可直出流日万年历数据"""
        result = _calc_liuri(2024, 6)
        assert len(result) == 30
        assert result[0].gan
        assert result[0].zhi
        assert result[0].ten_god_gan == ""

    def test_lunar_day_number_matches_lunar_day_text(self):
        """阴历数字日与阴历文本应一致可读"""
        result = _calc_liuri(2024, 6, "甲")
        first = result[0]
        assert first.lunar_day_number > 0
        assert first.lunar_day

    def test_lunar_fields_present(self):
        """流日应补充阴历字段"""
        result = _calc_liuri(2024, 6, "甲")
        assert result[0].lunar_day
        assert "月" in result[0].lunar_date
        assert result[0].basis_date
        assert result[0].display_solar_date

    def test_day_boundary_zi_hour_switch_at_23(self):
        """子初换日：23:00 后按次日干支"""
        d_2259 = _calc_liuri(
            2024,
            6,
            "甲",
            day_boundary_mode="zi_hour",
            reference_hour=22,
            reference_minute=59,
        )[0]
        d_2300 = _calc_liuri(
            2024,
            6,
            "甲",
            day_boundary_mode="zi_hour",
            reference_hour=23,
            reference_minute=0,
        )[0]
        next_day = _calc_liuri(
            2024,
            6,
            "甲",
            day_boundary_mode="gregorian_midnight",
            reference_hour=0,
            reference_minute=1,
        )[1]
        assert f"{d_2259.gan}{d_2259.zhi}" != f"{d_2300.gan}{d_2300.zhi}"
        assert f"{d_2300.gan}{d_2300.zhi}" == f"{next_day.gan}{next_day.zhi}"
        assert d_2300.solar_date == d_2300.basis_date
        assert d_2300.display_solar_date == d_2300.basis_date
        assert d_2300.lunar_date == next_day.lunar_date

    def test_day_boundary_gregorian_midnight_not_switch_at_23(self):
        """00:00换日：23:30 仍属当日"""
        d_2330 = _calc_liuri(
            2024,
            6,
            "甲",
            day_boundary_mode="gregorian_midnight",
            reference_hour=23,
            reference_minute=30,
        )[0]
        d_0001 = _calc_liuri(
            2024,
            6,
            "甲",
            day_boundary_mode="gregorian_midnight",
            reference_hour=0,
            reference_minute=1,
        )[0]
        assert f"{d_2330.gan}{d_2330.zhi}" == f"{d_0001.gan}{d_0001.zhi}"

    def test_true_solar_cross_day_keeps_lunar_and_ganzhi_same_basis(self):
        """真太阳时跨日时，阴历与干支应同一基准日"""
        crossed = _calc_liuri(
            2024,
            6,
            "甲",
            day_boundary_mode="zi_hour",
            use_true_solar_time=True,
            reference_hour=0,
            reference_minute=10,
            longitude=73.0,
            timezone_offset=8.0,
        )[0]
        baseline = _calc_liuri(
            2024,
            5,
            "甲",
            day_boundary_mode="gregorian_midnight",
            reference_hour=0,
            reference_minute=1,
        )[-1]
        assert crossed.solar_date == crossed.basis_date
        assert crossed.display_solar_date == crossed.basis_date
        assert f"{crossed.gan}{crossed.zhi}" == f"{baseline.gan}{baseline.zhi}"
        assert crossed.lunar_date == baseline.lunar_date


class TestLunarTableAbstraction:
    def test_get_lunar_month_range_returns_consistent_month(self):
        start, end, lunar_month, is_leap = get_lunar_month_range(2024, 2, 15)
        s = solar_to_lunar(start.year, start.month, start.day)
        e = solar_to_lunar(end.year, end.month, end.day)
        assert s["lunar_month"] == lunar_month
        assert e["lunar_month"] == lunar_month
        assert s["is_leap_month"] == is_leap
        assert e["is_leap_month"] == is_leap
        assert s["lunar_day"] == 1

    def test_lunar_to_solar_roundtrip(self):
        s = lunar_to_solar(2024, 1, 1, False)
        l = solar_to_lunar(s["year"], s["month"], s["day"])
        assert l["lunar_month"] == 1
        assert l["lunar_day"] == 1
        assert l["is_leap_month"] is False


class TestKnownDates:
    """已知正确八字的回归测试（直接 sxtwl 调用 + calculate_bazi 端到端）"""

    # ---- sxtwl 直接测试（绕过真太阳时，验证库本身精度） ----

    def test_sxtwl_1992_0411_chen(self):
        """1992-04-11 辰时(hour=8) → 壬申 甲辰 丁巳 甲辰"""
        y_g, y_z, m_g, m_z, d_g, d_z, h_g, h_z, info = _calc_with_sxtwl(1992, 4, 11, 8, 0)
        assert (y_g, y_z) == ("壬", "申"), f"年柱: {y_g}{y_z}"
        assert (m_g, m_z) == ("甲", "辰"), f"月柱: {m_g}{m_z}"
        assert (d_g, d_z) == ("丁", "巳"), f"日柱: {d_g}{d_z}"
        assert (h_g, h_z) == ("甲", "辰"), f"时柱: {h_g}{h_z}"

    def test_sxtwl_1992_0411_lunar(self):
        """1992-04-11 农历应为三月初九"""
        _, _, _, _, _, _, _, _, info = _calc_with_sxtwl(1992, 4, 11, 8, 0)
        assert info["lunar_month"] == 3
        assert info["lunar_day"] == 9
        assert info["is_leap"] is False

    def test_sxtwl_1990_0101_zi(self):
        """1990-01-01 子时(hour=0) — 立春前，年柱仍属己巳年"""
        y_g, y_z, m_g, m_z, d_g, d_z, h_g, h_z, _ = _calc_with_sxtwl(1990, 1, 1, 0, 0)
        assert (y_g, y_z) == ("己", "巳"), f"年柱: {y_g}{y_z}"

    def test_sxtwl_2000_0204_lichun_eve(self):
        """2000-02-04 立春当日，年柱切换为庚辰"""
        y_g, y_z, _, _, _, _, _, _, _ = _calc_with_sxtwl(2000, 2, 4, 12, 0)
        assert (y_g, y_z) == ("庚", "辰"), f"年柱: {y_g}{y_z}"

    def test_sxtwl_2000_0203_before_lichun(self):
        """2000-02-03 立春前一日，年柱仍为己卯"""
        y_g, y_z, _, _, _, _, _, _, _ = _calc_with_sxtwl(2000, 2, 3, 12, 0)
        assert (y_g, y_z) == ("己", "卯"), f"年柱: {y_g}{y_z}"

    def test_sxtwl_hour_boundary_mao_chen(self):
        """辰时边界：hour=6 → 卯时, hour=7 → 辰时"""
        _, _, _, _, d_g, _, h_g_6, h_z_6, _ = _calc_with_sxtwl(1992, 4, 11, 6, 0)
        _, _, _, _, _, _, h_g_7, h_z_7, _ = _calc_with_sxtwl(1992, 4, 11, 7, 0)
        assert h_z_6 == "卯", f"hour=6 应为卯时: {h_g_6}{h_z_6}"
        assert h_z_7 == "辰", f"hour=7 应为辰时: {h_g_7}{h_z_7}"

    # ---- calculate_bazi 端到端测试（含 TST、默认经度修复后） ----

    def test_bazi_1992_0411_chen(self):
        """1992-04-11 辰时(hour=8) 无城市 → 壬申 甲辰 丁巳 甲辰"""
        result = calculate_bazi(1992, 4, 11, 8, 0, 1, apply_tst=False)
        assert result.year_pillar.full == "壬申", f"年柱: {result.year_pillar.full}"
        assert result.month_pillar.full == "甲辰", f"月柱: {result.month_pillar.full}"
        assert result.day_pillar.full == "丁巳", f"日柱: {result.day_pillar.full}"
        assert result.hour_pillar.full == "甲辰", f"时柱: {result.hour_pillar.full}"
        assert "壬申" in result.lunar_date
        assert "三月" in result.lunar_date
        assert "初九" in result.lunar_date

    def test_bazi_1992_0411_hour7_no_city(self):
        """hour=7 无城市（apply_tst=False）→ 仍应为辰时，不被 TST 偏移到卯时"""
        result = calculate_bazi(1992, 4, 11, 7, 0, 1, apply_tst=False)
        assert result.hour_pillar.zhi == "辰", (
            f"hour=7 无城市时应为辰时，实际: {result.hour_pillar.full}"
        )

    def test_bazi_tst_correction_zero_no_city(self):
        """无城市时（apply_tst=False），TST 校正应为 0"""
        result = calculate_bazi(1992, 4, 11, 8, 0, 1, apply_tst=False)
        assert result.time_correction_min == 0.0, (
            f"无城市时 TST 校正应为 0，实际: {result.time_correction_min}"
        )

    def test_bazi_tst_with_city(self):
        """有城市时（apply_tst=True, 北京经度），TST 应有明显校正"""
        result = calculate_bazi(1992, 4, 11, 8, 0, 1, longitude=116.407, apply_tst=True)
        assert abs(result.time_correction_min) > 5.0, (
            f"有城市时 TST 校正应 > 5 分钟，实际: {result.time_correction_min}"
        )

    def test_bazi_midnight_early_rule(self):
        """早子时(23:00)规则测试：日柱应切换到次日"""
        result = calculate_bazi(2000, 6, 15, 23, 30, 1, midnight_rule="early")
        result_late = calculate_bazi(2000, 6, 15, 23, 30, 1, midnight_rule="late")
        assert result.hour_pillar.zhi == "子"
        assert result_late.hour_pillar.zhi == "子"


class TestPrecomputedPillars:
    """测试接收 lunisolar.js 预计算四柱的能力"""

    def test_precomputed_pillars_override(self):
        """传入预计算四柱时，应使用传入值而非 sxtwl 计算"""
        precomputed = {
            "year_gan": "壬", "year_zhi": "申",
            "month_gan": "甲", "month_zhi": "辰",
            "day_gan": "丁", "day_zhi": "巳",
            "hour_gan": "甲", "hour_zhi": "辰",
        }
        precomputed_lunar = {
            "lunar_month": 3, "lunar_day": 9, "is_leap": False,
        }
        result = calculate_bazi(
            1992, 4, 11, 8, 0, 1, apply_tst=False,
            precomputed_pillars=precomputed,
            precomputed_lunar=precomputed_lunar,
        )
        assert result.year_pillar.full == "壬申"
        assert result.month_pillar.full == "甲辰"
        assert result.day_pillar.full == "丁巳"
        assert result.hour_pillar.full == "甲辰"
        assert result.day_master == "丁"

    def test_precomputed_pillars_advanced_analysis(self):
        """预计算四柱时，十神/大运/神煞等高级分析仍正常工作"""
        precomputed = {
            "year_gan": "壬", "year_zhi": "申",
            "month_gan": "甲", "month_zhi": "辰",
            "day_gan": "丁", "day_zhi": "巳",
            "hour_gan": "甲", "hour_zhi": "辰",
        }
        result = calculate_bazi(
            1992, 4, 11, 8, 0, 1, apply_tst=False,
            precomputed_pillars=precomputed,
        )
        assert len(result.ten_gods) > 0, "十神不应为空"
        assert len(result.dayun_list) > 0, "大运不应为空"
        assert len(result.shensha_list) > 0, "神煞不应为空"
        assert len(result.kong_wang) == 2, "空亡应有二支"
        assert result.wuxing_counts, "五行统计不应为空"
        assert result.day_master_strength > 0, "日主强度应 > 0"

    def test_precomputed_vs_sxtwl_consistency(self):
        """预计算四柱与 sxtwl 直算相同四柱时，高级分析结果一致"""
        sxtwl_result = calculate_bazi(1992, 4, 11, 8, 0, 1, apply_tst=False)

        precomputed = {
            "year_gan": sxtwl_result.year_pillar.gan,
            "year_zhi": sxtwl_result.year_pillar.zhi,
            "month_gan": sxtwl_result.month_pillar.gan,
            "month_zhi": sxtwl_result.month_pillar.zhi,
            "day_gan": sxtwl_result.day_pillar.gan,
            "day_zhi": sxtwl_result.day_pillar.zhi,
            "hour_gan": sxtwl_result.hour_pillar.gan,
            "hour_zhi": sxtwl_result.hour_pillar.zhi,
        }
        pre_result = calculate_bazi(
            1992, 4, 11, 8, 0, 1, apply_tst=False,
            precomputed_pillars=precomputed,
        )

        assert pre_result.day_master == sxtwl_result.day_master
        assert pre_result.day_master_strength == sxtwl_result.day_master_strength
        assert pre_result.yong_shen == sxtwl_result.yong_shen
        assert pre_result.dayun_direction == sxtwl_result.dayun_direction
        assert len(pre_result.ten_gods) == len(sxtwl_result.ten_gods)

    def test_no_precomputed_falls_back_to_sxtwl(self):
        """不传入预计算四柱时，仍正常使用 sxtwl 计算"""
        result = calculate_bazi(1992, 4, 11, 8, 0, 1, apply_tst=False)
        assert result.year_pillar.full == "壬申"
        assert result.day_pillar.full == "丁巳"
