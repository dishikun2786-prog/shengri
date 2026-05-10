"""constants.py 单元测试"""
import pytest
from app.core.constants import (
    TIAN_GAN, DI_ZHI, GAN_WUXING, ZHI_WUXING,
    ZHI_CANG_GAN, NAYIN_TABLE, get_ten_god,
    get_kong_wang, get_chang_sheng, get_tai_sui_relation,
    get_xun_head,
)


class TestTenGod:
    """十神计算测试"""

    def test_bi_jian(self):
        assert get_ten_god("甲", "甲") == "比肩"

    def test_jie_cai(self):
        assert get_ten_god("甲", "乙") == "劫财"

    def test_shi_shen(self):
        assert get_ten_god("甲", "丙") == "食神"

    def test_shang_guan(self):
        assert get_ten_god("甲", "丁") == "伤官"

    def test_pian_cai(self):
        assert get_ten_god("甲", "戊") == "偏财"

    def test_zheng_cai(self):
        assert get_ten_god("甲", "己") == "正财"

    def test_qi_sha(self):
        assert get_ten_god("甲", "庚") == "七杀"

    def test_zheng_guan(self):
        assert get_ten_god("甲", "辛") == "正官"

    def test_pian_yin(self):
        assert get_ten_god("甲", "壬") == "偏印"

    def test_zheng_yin(self):
        assert get_ten_god("甲", "癸") == "正印"

    def test_all_ten_gods_present(self):
        """确保从甲日主出发，十神全覆盖"""
        results = set()
        for g in TIAN_GAN:
            results.add(get_ten_god("甲", g))
        assert results == {"比肩", "劫财", "食神", "伤官", "偏财", "正财", "七杀", "正官", "偏印", "正印"}


class TestKongWang:
    """空亡测试"""

    def test_jia_zi_xun(self):
        assert get_kong_wang("甲", "子") == ["戌", "亥"]

    def test_jia_xu_xun(self):
        assert get_kong_wang("甲", "戌") == ["申", "酉"]

    def test_day_pillar_bing_yin(self):
        """丙寅在甲子旬，空亡应为戌亥"""
        assert get_kong_wang("丙", "寅") == ["戌", "亥"]

    def test_day_pillar_geng_wu(self):
        """庚午在甲子旬，空亡应为戌亥"""
        assert get_kong_wang("庚", "午") == ["戌", "亥"]

    def test_xun_head(self):
        assert get_xun_head("甲", "子") == "甲子"
        assert get_xun_head("丙", "寅") == "甲子"
        assert get_xun_head("甲", "戌") == "甲戌"


class TestChangSheng:
    """十二长生测试"""

    def test_jia_hai_changsheng(self):
        """甲木长生在亥"""
        assert get_chang_sheng("甲", "亥") == "长生"

    def test_jia_zi_muyu(self):
        """甲木沐浴在子"""
        assert get_chang_sheng("甲", "子") == "沐浴"

    def test_jia_mao_diwang(self):
        """甲木帝旺在卯（亥=长生,子=沐浴,丑=冠带,寅=临官,卯=帝旺）"""
        assert get_chang_sheng("甲", "卯") == "帝旺"

    def test_bing_yin_changsheng(self):
        """丙火长生在寅"""
        assert get_chang_sheng("丙", "寅") == "长生"

    def test_geng_si_changsheng(self):
        """庚金长生在巳"""
        assert get_chang_sheng("庚", "巳") == "长生"

    def test_yi_wu_changsheng(self):
        """乙木长生在午（阴干逆排）"""
        assert get_chang_sheng("乙", "午") == "长生"

    def test_yang_gan_reverse_check(self):
        """阳干长生修正验证: 旧值差3位, 新值对应标准长生"""
        # 甲: 旧长生在寅(2) → 新长生在亥(11)
        assert get_chang_sheng("甲", "亥") == "长生"
        assert get_chang_sheng("甲", "寅") == "临官"  # 甲禄在寅=临官, 不再是长生
        # 丙: 旧长生在巳(5) → 新长生在寅(2)
        assert get_chang_sheng("丙", "寅") == "长生"
        assert get_chang_sheng("丙", "巳") == "临官"  # 丙禄在巳
        # 庚: 旧长生在申(8) → 新长生在巳(5)
        assert get_chang_sheng("庚", "巳") == "长生"
        assert get_chang_sheng("庚", "申") == "临官"  # 庚禄在申
        # 壬: 旧长生在亥(11) → 新长生在申(8)
        assert get_chang_sheng("壬", "申") == "长生"
        assert get_chang_sheng("壬", "亥") == "临官"  # 壬禄在亥


class TestTaiSui:
    """太岁关系测试"""

    def test_zhi_tai_sui(self):
        assert get_tai_sui_relation("子", "子") == "值太岁"

    def test_chong_tai_sui(self):
        assert get_tai_sui_relation("子", "午") == "冲太岁"

    def test_xing_tai_sui(self):
        assert get_tai_sui_relation("子", "卯") == "刑太岁"

    def test_hai_tai_sui(self):
        assert get_tai_sui_relation("子", "未") == "害太岁"

    def test_he_tai_sui(self):
        assert get_tai_sui_relation("子", "丑") == "合太岁"

    def test_no_relation(self):
        assert get_tai_sui_relation("子", "寅") == ""


class TestNayin:
    """纳音表完整性测试"""

    def test_sixty_entries(self):
        assert len(NAYIN_TABLE) == 60

    def test_jiazi_nayin(self):
        assert NAYIN_TABLE["甲子"] == "海中金"

    def test_guihai_nayin(self):
        assert NAYIN_TABLE["癸亥"] == "大海水"


class TestCangGan:
    """藏干表测试"""

    def test_twelve_branches(self):
        assert len(ZHI_CANG_GAN) == 12

    def test_zi_cang(self):
        assert ZHI_CANG_GAN["子"] == ["癸"]

    def test_yin_cang(self):
        assert ZHI_CANG_GAN["寅"] == ["甲", "丙", "戊"]

    def test_chou_cang(self):
        assert ZHI_CANG_GAN["丑"] == ["己", "癸", "辛"]
