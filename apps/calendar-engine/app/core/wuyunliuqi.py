"""五运六气计算模块 —— 中医运气学核心算法"""

from datetime import date, datetime
from typing import TypedDict

TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
GAN_WUXING = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火",
    "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
}

# 天干化运表
TIAN_GAN_HUA_YUN = {
    "甲": {"运": "土", "太过不及": "太过"},
    "乙": {"运": "金", "太过不及": "不及"},
    "丙": {"运": "水", "太过不及": "太过"},
    "丁": {"运": "木", "太过不及": "不及"},
    "戊": {"运": "火", "太过不及": "太过"},
    "己": {"运": "土", "太过不及": "不及"},
    "庚": {"运": "金", "太过不及": "太过"},
    "辛": {"运": "水", "太过不及": "不及"},
    "壬": {"运": "木", "太过不及": "太过"},
    "癸": {"运": "火", "太过不及": "不及"},
}

# 地支化气表（司天-在泉）
DI_ZHI_HUA_QI = {
    "子": {"司天": "少阴君火", "在泉": "阳明燥金"},
    "午": {"司天": "少阴君火", "在泉": "阳明燥金"},
    "丑": {"司天": "太阴湿土", "在泉": "太阳寒水"},
    "未": {"司天": "太阴湿土", "在泉": "太阳寒水"},
    "寅": {"司天": "少阳相火", "在泉": "厥阴风木"},
    "申": {"司天": "少阳相火", "在泉": "厥阴风木"},
    "卯": {"司天": "阳明燥金", "在泉": "少阴君火"},
    "酉": {"司天": "阳明燥金", "在泉": "少阴君火"},
    "辰": {"司天": "太阳寒水", "在泉": "太阴湿土"},
    "戌": {"司天": "太阳寒水", "在泉": "太阴湿土"},
    "巳": {"司天": "厥阴风木", "在泉": "少阳相火"},
    "亥": {"司天": "厥阴风木", "在泉": "少阳相火"},
}

# 主气（恒定六步）
ZHUQI = [
    {"节气": "初之气", "名称": "厥阴风木", "月份": "大寒-春分"},
    {"节气": "二之气", "名称": "少阴君火", "月份": "春分-小满"},
    {"节气": "三之气", "名称": "少阳相火", "月份": "小满-大暑"},
    {"节气": "四之气", "名称": "太阴湿土", "月份": "大暑-秋分"},
    {"节气": "五之气", "名称": "阳明燥金", "月份": "秋分-小雪"},
    {"节气": "终之气", "名称": "太阳寒水", "月份": "小雪-大寒"},
]

# 客气（按年支推算，司天为三之气）
KEQI_BY_ZHI = {
    "子": ["太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金"],
    "午": ["太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金"],
    "丑": ["厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水"],
    "未": ["厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水"],
    "寅": ["少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水", "厥阴风木"],
    "申": ["少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水", "厥阴风木"],
    "卯": ["太阴湿土", "少阳相火", "阳明燥金", "太阳寒水", "厥阴风木", "少阴君火"],
    "酉": ["太阴湿土", "少阳相火", "阳明燥金", "太阳寒水", "厥阴风木", "少阴君火"],
    "辰": ["少阳相火", "阳明燥金", "太阳寒水", "厥阴风木", "少阴君火", "太阴湿土"],
    "戌": ["少阳相火", "阳明燥金", "太阳寒水", "厥阴风木", "少阴君火", "太阴湿土"],
    "巳": ["阳明燥金", "太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火"],
    "亥": ["阳明燥金", "太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火"],
}

# 五运对应脏腑
WUYUN_ORGANS = {
    "土": {"脏": "脾", "腑": "胃", "季节": "长夏"},
    "金": {"脏": "肺", "腑": "大肠", "季节": "秋"},
    "水": {"脏": "肾", "腑": "膀胱", "季节": "冬"},
    "木": {"脏": "肝", "腑": "胆", "季节": "春"},
    "火": {"脏": "心", "腑": "小肠", "季节": "夏"},
}

# 六气对应脏腑
LIUQI_ORGANS = {
    "风木": {"脏": "肝", "腑": "胆"},
    "君火": {"脏": "心", "腑": "小肠"},
    "相火": {"脏": "心包", "腑": "三焦"},
    "湿土": {"脏": "脾", "腑": "胃"},
    "燥金": {"脏": "肺", "腑": "大肠"},
    "寒水": {"脏": "肾", "腑": "膀胱"},
}


class WuYunResult(TypedDict, total=False):
    年干: str
    年支: str
    天干化运: str
    运之太过不及: str
    地支化气_司天: str
    地支化气_在泉: str
    主气: list[dict]
    客气: list[dict]
    当年五运: list[dict]
    当年六气: list[dict]
    综合分析: str


def get_year_ganzhi(year: int) -> tuple[str, str]:
    """计算公历年的年干支（以立春为界）"""
    base_year = 1984
    base_gan = "甲"
    base_zhi = "子"
    gan_list = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    zhi_list = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    offset = year - base_year
    gan_idx = (gan_list.index(base_gan) + offset) % 10
    zhi_idx = (zhi_list.index(base_zhi) + offset) % 12
    return gan_list[gan_idx], zhi_list[zhi_idx]


def get_lunisolar_date(target_date: date) -> tuple[int, int]:
    """获取指定公历日期的农历年月"""
    try:
        import sxtwl
        day = sxtwl.fromSolar(target_date.year, target_date.month, target_date.day)
        lunar_month = day.getLunarMonth()
        lunar_day = day.getLunarDay()
        return target_date.year, lunar_month
    except ImportError:
        return target_date.year, target_date.month


def calc_yunqi(target_date: date) -> WuYunResult:
    """计算指定日期的五运六气"""
    year = target_date.year
    month = target_date.month

    year_gan, year_zhi = get_year_ganzhi(year)
    hua_yun = TIAN_GAN_HUA_YUN.get(year_gan, {"运": "土", "太过不及": "不及"})
    hua_qi = DI_ZHI_HUA_QI.get(year_zhi, {"司天": "太阴湿土", "在泉": "太阳寒水"})

    keqi_list = KEQI_BY_ZHI.get(year_zhi, KEQI_BY_ZHI["子"])

    year_yun = hua_yun["运"]
    year_yun_type = hua_yun["太过不及"]

    sitian = hua_qi["司天"]
    zaiquan = hua_qi["在泉"]

    main_qi_list = [
        {**z, "类型": "主气"} for z in ZHUQI
    ]
    ke_qi_list = [
        {"节气": ZHUQI[i]["节气"], "名称": keqi_list[i], "月份": ZHUQI[i]["月份"], "类型": "客气"}
        for i in range(6)
    ]

    wuyun_5 = _calc_5yun(year_gan, year)
    liuqi_6 = _calc_6qi(year_zhi, year)

    overall = _generate_overall_analysis(year_yun, year_yun_type, sitian, zaiquan)

    return WuYunResult(
        年干=year_gan,
        年支=year_zhi,
        天干化运=year_yun,
        运之太过不及=year_yun_type,
        地支化气_司天=sitian,
        地支化气_在泉=zaiquan,
        主气=main_qi_list,
        客气=ke_qi_list,
        当年五运=wuyun_5,
        当年六气=liuqi_6,
        综合分析=overall,
    )


def _calc_5yun(year_gan: str, year: int) -> list[dict]:
    """计算一年五运（初运到终运）"""
    yun_map = {
        "木": "角",
        "火": "徵",
        "土": "宫",
        "金": "商",
        "水": "羽",
    }
    base_yun = {"木": "角", "火": "徵", "土": "宫", "金": "商", "水": "羽"}

    gan_wx = GAN_WUXING.get(year_gan, "土")
    wx_order = ["木", "火", "土", "金", "水"]

    start_wx = gan_wx
    if year_gan in ["甲", "庚", "壬"]:
        start_yun_type = "太过"
    else:
        start_yun_type = "不及"

    result = []
    for i in range(5):
        wx_idx = wx_order.index(start_wx)
        wx = wx_order[(wx_idx + i) % 5]
        ry = year + i
        result.append({
            "运次": f"{['初', '二', '三', '四', '终'][i]}运",
            "五行": wx,
            "音律": yun_map.get(wx, "角"),
            "节气": ["大寒-春分", "春分-小满", "小满-大暑", "大暑-秋分", "秋分-小雪"][i],
            "主运": wx,
            "太过不及": start_yun_type if i == 0 else ("太过" if (i % 2 == 0) else "不及"),
            "影响脏腑": WUYUN_ORGANS.get(wx, {}).get("脏", ""),
        })

    return result


def _calc_6qi(year_zhi: str, year: int) -> list[dict]:
    """计算一年六气（初之气到终之气）"""
    keqi_list = KEQI_BY_ZHI.get(year_zhi, KEQI_BY_ZHI["子"])
    sitian = DI_ZHI_HUA_QI.get(year_zhi, {}).get("司天", "太阴湿土")

    result = []
    for i in range(6):
        name = keqi_list[i]
        organs = LIUQI_ORGANS.get(name, {})
        result.append({
            "节气序号": i + 1,
            "节气": ZHUQI[i]["节气"],
            "客气名称": name,
            "节气范围": ZHUQI[i]["月份"],
            "对应脏腑": organs.get("脏", ""),
            "对应腑": organs.get("腑", ""),
            "当令": "司天" if name == sitian else ("在泉" if i == 5 else ""),
        })

    return result


def _generate_overall_analysis(yun: str, yun_type: str, sitian: str, zaiquan: str) -> str:
    """生成综合分析文字"""
    yun_desc = f"{'太过' if yun_type == '太过' else '不及'}之{yun}运"
    sitian_desc = f"司天{sitian}"
    zaiquan_desc = f"在泉{zaiquan}"

    analysis = f"年干{yun_desc}，{sitian_desc}，{zaiquan_desc}。"
    analysis += f"客气当令于{sitian}，需注意{sitian}相关脏腑保健。"
    analysis += f"若{yun_type}，则{yun}气偏盛，"
    if yun == "木":
        analysis += "注意肝胆调养，避免怒气。"
    elif yun == "火":
        analysis += "注意心血管保养，避免过度兴奋。"
    elif yun == "土":
        analysis += "注意脾胃养护，避免湿邪。"
    elif yun == "金":
        analysis += "注意肺大肠养护，避免悲伤忧郁。"
    elif yun == "水":
        analysis += "注意肾膀胱养护，避免恐惧焦虑。"

    return analysis


def calc_liuyue_wuyun(year: int, month: int) -> list[dict]:
    """计算某年某月的五运六气月令"""
    day = date(year, month, 15)
    base = calc_yunqi(day)

    wx_order = ["木", "火", "土", "金", "水"]
    yun_wx = base["天干化运"]
    yun_idx = wx_order.index(yun_wx) if yun_wx in wx_order else 2

    month_keqi = KEQI_BY_ZHI.get(base["年支"], KEQI_BY_ZHI["子"])

    month_info = []
    for m in range(1, 13):
        mid_day = date(year, m, 15) if m <= 12 else date(year, 12, 31)
        lunar_month = get_lunisolar_date(mid_day)[1]

        yun_i = (m - 1) % 5
        wx = wx_order[(yun_idx + yun_i) % 5]

        ke_i = (m - 1) % 6
        keqi_name = month_keqi[ke_i]

        month_info.append({
            "农历月": m,
            "公历月": m,
            "主运": wx,
            "客运": wx,
            "客气": keqi_name,
            "节气": _get_jieqi_name(m),
            "当令脏腑": LIUQI_ORGANS.get(keqi_name, {}).get("脏", ""),
        })

    return month_info


def _get_jieqi_name(month: int) -> str:
    """获取月份对应的节气名"""
    jieqi = {
        1: "小寒-大寒", 2: "立春-雨水", 3: "惊蛰-春分",
        4: "清明-谷雨", 5: "立夏-小满", 6: "芒种-夏至",
        7: "小暑-大暑", 8: "立秋-处暑", 9: "白露-秋分",
        10: "寒露-霜降", 11: "立冬-小雪", 12: "大雪-冬至",
    }
    return jieqi.get(month, "")


def get_daily_wuyun_detail(target_date: date, bazi_wuxing: dict | None = None) -> dict:
    """获取当日五运六气详情

    Args:
        target_date: 日期
        bazi_wuxing: 八字五行统计（可选），用于结合分析

    Returns:
        当日五运六气详情
    """
    base = calc_yunqi(target_date)

    month = target_date.month
    day = target_date.day

    wx_order = ["木", "火", "土", "金", "水"]
    yun_wx = base["天干化运"]
    yun_idx = wx_order.index(yun_wx) if yun_wx in wx_order else 2

    day_yun_idx = (target_date.timetuple().tm_yday - 1) % 5
    day_yun = wx_order[(yun_idx + day_yun_idx) % 5]

    keqi_list = KEQI_BY_ZHI.get(base["年支"], KEQI_BY_ZHI["子"])
    day_ke_idx = (target_date.timetuple().tm_yday - 1) % 6
    day_keqi = keqi_list[day_ke_idx]

    result = {
        "日期": target_date.isoformat(),
        "当日主运": day_yun,
        "当日客气": day_keqi,
        "司天": base["地支化气_司天"],
        "在泉": base["地支化气_在泉"],
        "运之太过不及": base["运之太过不及"],
        "主气": base["主气"][day_ke_idx]["名称"],
        "客气名称": day_keqi,
        "养生重点": _get_daily_health_tip(day_yun, day_keqi, bazi_wuxing),
        "月份五运": calc_liuyue_wuyun(target_date.year, month),
    }

    return result


def _get_daily_health_tip(day_yun: str, day_keqi: str, bazi_wuxing: dict | None = None) -> dict:
    """获取当日养生重点

    结合《黄帝内经》《伤寒论》等中医典籍的养生智慧
    """
    # 主运养生建议（出自《黄帝内经·素问·四气调神大论》）
    yun_tips = {
        "木": {
            "养生": "宜疏肝利胆，《黄帝内经》云：'春三月，此谓发陈，天地俱生，万物以荣。'应广步于庭，披发缓行，使志生。适合户外舒展运动，避免抑郁情绪。",
            "饮食": "多食青绿色蔬菜、酸味食物，如菠菜、芹菜、醋、山楂。忌过度油腻。",
            "经络": "宜按摩太冲穴（足厥阴肝经）、肝俞穴，敲胆经。",
            "情志": "戒怒戒郁，可习练太极拳、八段锦'摇头摆尾去心火'。",
            "时辰": "宜在寅时（3-5点）起床活动，顺应木气升发。",
        },
        "火": {
            "养生": "宜养心护血，《黄帝内经》云：'夏三月，此谓蕃秀，天地气交，万物华实。'应夜卧早起，无厌于日。午间小憩养心，避免过度兴奋熬夜。",
            "饮食": "多食赤色食物、苦味食物，如番茄、红豆、苦瓜、莲子。忌辛辣刺激。",
            "经络": "宜按摩神门穴（手少阴心经）、内关穴，艾灸膻中穴。",
            "情志": "戒急戒躁，可习练静坐、冥想、书法以安心神。",
            "时辰": "午时（11-13点）小憩15-30分钟，养心安神。",
        },
        "土": {
            "养生": "宜健脾和胃，《黄帝内经》云：'脾者，仓廪之官，五味出焉。'饮食规律清淡，避免思虑过度。思伤脾，勿过度忧思。",
            "饮食": "多食黄色食物、甘味食物，如小米、南瓜、红枣、山药。忌生冷寒凉。",
            "经络": "宜按摩足三里穴（足阳明胃经）、中脘穴、脾俞穴。",
            "情志": "戒思戒虑，可习练八段锦'调理脾胃须单举'。",
            "时辰": "辰时（7-9点）胃经当令，宜温热早餐，养护脾胃。",
        },
        "金": {
            "养生": "宜润肺清肠，《黄帝内经》云：'肺者，相傅之官，治节出焉。'多食白色食物，勿过度悲伤。秋养肺，宜收敛神气。",
            "饮食": "多食白色食物、辛味食物，如梨、银耳、百合、白萝卜。忌过咸过辣。",
            "经络": "宜按摩尺泽穴（手太阴肺经）、列缺穴，叩打云门穴。",
            "情志": "戒悲戒忧，保持积极乐观，可习练'嘶'字诀润肺。",
            "时辰": "寅时（3-5点）肺经当令，宜深度呼吸，晨起做深呼吸训练。",
        },
        "水": {
            "养生": "宜补肾固精，《黄帝内经》云：'肾者，作强之官，伎巧出焉。'冬三月应去寒就温，早睡晚起。避免惊恐焦虑。",
            "饮食": "多食黑色食物、咸味食物，如黑豆、木耳、核桃、枸杞。忌过度苦寒。",
            "经络": "宜艾灸关元穴、命门穴、肾俞穴，按摩涌泉穴、太溪穴。",
            "情志": "戒恐戒惊，可习练'吹'字诀、固肾功、站桩。",
            "时辰": "酉时（17-19点）肾经当令，宜安静休息，避免过度劳累。",
        },
    }

    # 客气养生建议（出自《伤寒论》六经辨证）
    keqi_tips = {
        "厥阴风木": {
            "养生": "注意防风邪，肝气易郁。《伤寒论》云：'厥阴之为病，消渴，气上撞心。'肝郁可致胸胁胀满、头晕目眩。",
            "调理": "可按摩太冲穴、期门穴，饮玫瑰花茶疏肝解郁。忌直吹冷风。",
            "易患": "头痛、眩晕、胁痛、抑郁、月经不调。",
            "预防": "避风寒，早春勿过早减衣，可佩戴防风香囊。",
        },
        "少阴君火": {
            "养生": "注意防暑热，心火易旺。《伤寒论》云：'少阴之为病，脉微细，但欲寐。'心火旺可致心烦失眠、口舌生疮。",
            "调理": "可莲子心泡茶、黄连阿胶汤（养阴清火），按揉劳宫穴、少海穴。",
            "易患": "失眠、心悸、口腔溃疡、痤疮、焦虑。",
            "预防": "午时避免暴晒，可午睡15-30分钟，饮绿豆汤清热。",
        },
        "少阳相火": {
            "养生": "注意防上火，口苦咽干。《伤寒论》少阳病提纲：'少阳之为病，口苦，咽干，目眩。'胆火旺可致口苦偏头痛。",
            "调理": "可菊花茶清火、金银花露，敲胆经，按摩阳陵泉穴。",
            "易患": "偏头痛、口苦、咽干、胁痛、胆囊炎。",
            "预防": "忌熬夜，傍晚可做伸展运动疏通少阳经。",
        },
        "太阴湿土": {
            "养生": "注意防湿邪，脾胃易困。《伤寒论》云：'太阴之为病，腹满而吐，食不下。'湿困脾胃可致腹胀便溏。",
            "调理": "可薏米红豆粥健脾祛湿，按摩丰隆穴、阴陵泉穴，艾灸足三里。",
            "易患": "腹胀、腹泻、食欲不振、湿痹、湿疹。",
            "预防": "忌久居潮湿环境，晴天多晒太阳，饮食清淡。",
        },
        "阳明燥金": {
            "养生": "注意防燥邪，肺津易亏。《伤寒论》云：'阳明之为病，胃家实是也。'燥邪伤肺可致干咳、皮肤干燥。",
            "调理": "可百合银耳羹润肺，按摩曲池穴、合谷穴，饮蜂蜜梨水。",
            "易患": "干咳、便秘、皮肤瘙痒、咽干、鼻出血。",
            "预防": "多饮水，室内可用加湿器，忌辛辣刺激食物。",
        },
        "太阳寒水": {
            "养生": "注意防寒邪，肾水易寒。《伤寒论》云：'太阳之为病，脉浮，头项强痛而恶寒。'寒邪伤肾可致腰痛、畏寒。",
            "调理": "可艾灸关元穴、命门穴，热水泡脚揉涌泉，饮姜枣茶温阳。",
            "易患": "腰痛、畏寒、水肿、尿频、关节疼痛。",
            "预防": "注意腰膝保暖，忌食生冷，冬天可做艾灸保健。",
        },
    }

    tip_yun = yun_tips.get(day_yun, {
        "养生": "整体调理，顺应自然。",
        "饮食": "均衡饮食，五味调和。",
        "经络": "敲打经络，活动筋骨。",
        "情志": "心态平和，起居有常。",
        "时辰": "顺应天时作息。",
    })
    tip_keqi = keqi_tips.get(day_keqi, {
        "养生": "注意防护，调养脏腑。",
        "调理": "敲打经络，疏通气血。",
        "易患": "注意气候变化。",
        "预防": "顺应天时。",
    })

    organ_yun = WUYUN_ORGANS.get(day_yun, {}).get("脏", "")
    organ_keqi = LIUQI_ORGANS.get(day_keqi, {}).get("脏", "")

    return {
        "主运养生": tip_yun["养生"],
        "主运饮食": tip_yun["饮食"],
        "主运经络": tip_yun["经络"],
        "主运情志": tip_yun["情志"],
        "主运时辰": tip_yun["时辰"],
        "客气养生": tip_keqi["养生"],
        "客气调理": tip_keqi["调理"],
        "客气易患": tip_keqi["易患"],
        "客气预防": tip_keqi["预防"],
        "重点脏腑": list(set([organ_yun, organ_keqi])) if organ_yun or organ_keqi else [],
        "调养建议": f"{organ_yun}气与{organ_keqi}双重影响，建议综合调理。《黄帝内经》云：'法于阴阳，和于术数，食欲有节，起居有常，不妄作劳。'",
    }


def get_yunqi_for_liunianday(
    target_date: date,
    liunian_gan: str | None,
    liunian_zhi: str | None
) -> dict:
    """获取流年月日对应的五运六气解读

    Args:
        target_date: 流年月日
        liunian_gan: 流年天干（None则用自然日期干支）
        liunian_zhi: 流年地支（None则用自然日期干支）

    Returns:
        流年五运六气解读
    """
    # 如果没有传入流年干支，使用自然日期的干支
    if liunian_gan is None or liunian_zhi is None:
        year_gan, year_zhi = get_year_ganzhi(target_date.year)
    else:
        year_gan = liunian_gan
        year_zhi = liunian_zhi

    hua_yun = TIAN_GAN_HUA_YUN.get(year_gan, {"运": "土", "太过不及": "不及"})
    hua_qi = DI_ZHI_HUA_QI.get(year_zhi, {"司天": "太阴湿土", "在泉": "太阳寒水"})

    yun = hua_yun["运"]
    yun_type = hua_yun["太过不及"]
    sitian = hua_qi["司天"]
    zaiquan = hua_qi["在泉"]

    # 计算年运基础上的五运（初运到终运）
    year_yun_5 = _calc_5yun(year_gan, target_date.year)
    # 计算年支对应的六气
    year_keqi = KEQI_BY_ZHI.get(year_zhi, KEQI_BY_ZHI["子"])

    # 根据年内位置计算当日主运和客气
    wx_order = ["木", "火", "土", "金", "水"]
    yun_idx = wx_order.index(yun) if yun in wx_order else 2

    day_yun_idx = (target_date.timetuple().tm_yday - 1) % 5
    day_yun = wx_order[(yun_idx + day_yun_idx) % 5]

    day_ke_idx = (target_date.timetuple().tm_yday - 1) % 6
    day_keqi = year_keqi[day_ke_idx]

    # 生成养生重点
    day_health_tip = _get_daily_health_tip(day_yun, day_keqi, None)

    result = {
        "流年干支": f"{year_gan}{year_zhi}",
        "流年天干化运": yun,
        "流年太过不及": yun_type,
        "流年司天": sitian,
        "流年在泉": zaiquan,
        "当年五运": year_yun_5,
        "当日主运": day_yun,
        "当日客气": day_keqi,
        "养生重点": day_health_tip,
        "流年养生建议": _generate_liunian_health_suggestion(yun, yun_type, sitian, zaiquan),
    }

    return result


def _generate_liunian_health_suggestion(
    yun: str, yun_type: str, sitian: str, zaiquan: str
) -> dict:
    """生成流年养生建议"""
    organ_map = {
        "木": "肝", "火": "心", "土": "脾", "金": "肺", "水": "肾"
    }

    organ = organ_map.get(yun, "脾")
    organ_full = WUYUN_ORGANS.get(yun, {}).get("脏", organ)

    suggestions = {
        "木": {
            "太过": "木运太过，肝气过旺，注意疏泄，少生气多舒展。",
            "不及": "木运不及，肝气郁结，宜补肝血，多户外活动。",
        },
        "火": {
            "太过": "火运太过，心火旺盛，注意静心，少熬夜多休息。",
            "不及": "火运不及，心气不足，宜补心气，适量运动。",
        },
        "土": {
            "太过": "土运太过，湿气较重，注意健脾祛湿，饮食清淡。",
            "不及": "土运不及，脾胃虚弱，宜健脾和胃，少食多餐。",
        },
        "金": {
            "太过": "金运太过，燥气盛行，注意润肺养阴，多食白色食物。",
            "不及": "金运不及，肺气不足，宜补肺益气，适当呼吸训练。",
        },
        "水": {
            "太过": "水运太过，寒气较重，注意保暖补肾，早睡晚起。",
            "不及": "水运不及，肾水不足，宜滋阴补肾，避免惊恐。",
        },
    }

    sitian_organ = LIUQI_ORGANS.get(sitian, {}).get("脏", "")
    zaiquan_organ = LIUQI_ORGANS.get(zaiquan, {}).get("腑", "")

    return {
        "流年总纲": f"{'太过' if yun_type == '太过' else '不及'}之{yun}运",
        "重点脏腑": organ_full,
        "核心建议": suggestions.get(yun, {}).get(yun_type, "综合调理，顺应自然。"),
        "司天注意事项": f"上半年{sitian}当令，注意{sitian_organ}相关问题。",
        "在泉注意事项": f"下半年{zaiquan}在泉，注意{zaiquan_organ}相关问题。",
        "饮食建议": _get_diet_suggestion(yun, yun_type),
        "起居建议": _get_lifestyle_suggestion(yun, yun_type),
        "情志建议": _get_emotion_suggestion(yun),
    }


def _get_diet_suggestion(yun: str, yun_type: str) -> str:
    """获取饮食建议"""
    diet_map = {
        "木": "多食绿色蔬菜、酸味食物，如菠菜、芹菜、醋等。",
        "火": "多食红色食物、苦味食物，如番茄、红豆、苦瓜等。",
        "土": "多食黄色食物、甘味食物，如小米、南瓜、红枣等。",
        "金": "多食白色食物、辛味食物，如梨、银耳、葱姜等。",
        "水": "多食黑色食物、咸味食物，如黑豆、木耳、海带等。",
    }
    base = diet_map.get(yun, "均衡饮食，五味调和。")
    if yun_type == "太过":
        base += "（注：运太过宜泄法，适当增加泄性食物。）"
    else:
        base += "（注：运不及宜补法，适当增加补益食物。）"
    return base


def _get_lifestyle_suggestion(yun: str, yun_type: str) -> str:
    """获取起居建议"""
    lifestyle_map = {
        "木": "春季宜早起舒展，夏季避免过度劳累。",
        "火": "夏季宜午休养心，冬季避免寒凉侵袭。",
        "土": "长夏宜祛湿健脾，四季注意饮食规律。",
        "金": "秋季宜收敛肺气，晨起深呼吸锻炼。",
        "水": "冬季宜早睡晚起，注意腰膝保暖。",
    }
    return lifestyle_map.get(yun, "起居有常，适应天时。")


def _get_emotion_suggestion(yun: str) -> str:
    """获取情志建议"""
    emotion_map = {
        "木": "木对应怒，宜制怒养肝，保持心态平和。",
        "火": "火对应喜，宜静心养神，避免过度兴奋。",
        "土": "土对应思，宜思虑有度，脾胃为后天之本。",
        "金": "金对应悲，宜乐观开朗，润肺保持积极。",
        "水": "水对应恐，宜镇定自若，补肾固精安神。",
    }
    return emotion_map.get(yun, "情志调和，五脏安定。")