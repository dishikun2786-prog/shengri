"""身体器官五行映射模块 —— 基于八字五行偏重分析身体健康"""

from typing import TypedDict, Optional

# 五行与身体器官对应表
WUXING_ORGANS = {
    "木": {
        "脏": "肝",
        "腑": "胆",
        "五官": "目",
        "五体": "筋",
        "情志": "怒",
        "五味": "酸",
        "五色": "青",
        "五化": "生",
        "季节": "春",
        "时辰": "寅卯",
        "经络": "足厥阴肝经、足少阳胆经",
        "功能": "疏泄、藏血、主筋、开窍于目",
        "易患疾病": "肝炎、胆囊炎、胆结石、筋骨疼痛、近视眼、抑郁证",
        "养护重点": "疏肝理气、保持情绪舒畅、多食酸味食物",
        "经典论述": "《素问·灵兰秘典论》：'肝者，将军之官，谋虑出焉。'",
        "过旺调理": {
            "养生": "宜泄不宜补，疏肝解郁为主。",
            "饮食": "多食酸味食物如山楂、乌梅、醋；忌辛辣刺激。",
            "经络": "敲胆经、按太冲穴、揉期门穴、针刺肝俞穴。",
            "情志": "戒怒，遇事冷静，可习练书法、太极拳。",
            "运动": "八段锦'摇头摆尾去心火'、瑜伽、户外散步。",
            "茶饮": "玫瑰花茶、菊花茶、枸杞菊花茶、佛手茶。",
            "药膳": "柴胡疏肝散、逍遥丸（遵医嘱）、绿豆菊花粥。",
        },
        "过弱调理": {
            "养生": "宜补不宜泄，养肝血柔肝阴为主。",
            "饮食": "多食酸味及青色食物如菠菜、芹菜、枸杞；忌寒凉。",
            "经络": "艾灸肝俞穴、按摩太溪穴、揉血海穴。",
            "情志": "戒郁，保持乐观，可听角调音乐（如《姑苏行》）。",
            "运动": "散步、慢跑、太极拳、养肝疏肝操。",
            "茶饮": "枸杞红枣茶、酸枣仁茶、当归茶。",
            "药膳": "四物汤、八珍汤、枸杞蒸蛋、山药红枣粥（遵医嘱）。",
        },
    },
    "火": {
        "脏": "心",
        "腑": "小肠",
        "五官": "舌",
        "五体": "血脉",
        "情志": "喜",
        "五味": "苦",
        "五色": "赤",
        "五化": "长",
        "季节": "夏",
        "时辰": "巳午",
        "经络": "手少阴心经、手太阳小肠经",
        "功能": "主血脉、藏神、开窍于舌",
        "易患疾病": "心脏病、心悸、失眠、舌疮、血管硬化",
        "养护重点": "养心安神、午间小憩、清淡饮食、避免过度兴奋",
        "经典论述": "《素问·灵兰秘典论》：'心者，君主之官，神明出焉。'",
        "过旺调理": {
            "养生": "宜泄不宜补，清心泻火为主。",
            "饮食": "多食苦味食物如苦瓜、莲子心、苦丁茶；忌辛辣。",
            "经络": "按神门穴、内关穴，揉劳宫穴，针刺心俞穴。",
            "情志": "戒躁，安静养神，可习练静坐、冥想。",
            "运动": "慢走、站桩、太极拳、书法。",
            "茶饮": "莲子心茶、淡竹叶茶、黄连茶、灯心草茶。",
            "药膳": "天王补心丹（遵医嘱）、百合银耳羹、苦瓜炒蛋。",
        },
        "过弱调理": {
            "养生": "宜补不宜泄，益气养阴为主。",
            "饮食": "多食赤色及苦味食物如红枣、桂圆、莲子；忌过苦寒。",
            "经络": "艾灸膻中穴、神门穴，按摩内关穴。",
            "情志": "戒过喜过悲，保持平和，可听徵调音乐（如《紫竹调》）。",
            "运动": "散步、养心操、八段锦'摇头摆尾去心火'。",
            "茶饮": "红枣桂圆茶、人参麦冬茶、柏子仁茶。",
            "药膳": "生脉饮（遵医嘱）、当归红枣汤、归脾汤。",
        },
    },
    "土": {
        "脏": "脾",
        "腑": "胃",
        "五官": "口",
        "五体": "肉",
        "情志": "思",
        "五味": "甘",
        "五色": "黄",
        "五化": "化",
        "季节": "长夏",
        "时辰": "辰戌丑未",
        "经络": "足太阴脾经、足阳明胃经",
        "功能": "运化水谷、统血、主肌肉、开窍于口",
        "易患疾病": "脾胃虚弱、消化不良、胃炎、胃溃疡、腹泻、湿气重",
        "养护重点": "健脾和胃、饮食规律、少食生冷、多食甘味食物",
        "经典论述": "《素问·灵兰秘典论》：'脾胃者，仓廪之官，五味出焉。'",
        "过旺调理": {
            "养生": "宜泄不宜补，健脾祛湿为主。",
            "饮食": "多食甘味食物如山药、薏米；忌甜腻厚味。",
            "经络": "按足三里穴、阴陵泉穴，揉丰隆穴，艾灸中脘穴。",
            "情志": "戒思虑过度，思伤脾，勿过度担忧。",
            "运动": "八段锦'调理脾胃须单举'、站桩、健走。",
            "茶饮": "陈皮茶、山楂茶、茯苓茶、薏米红豆茶。",
            "药膳": "参苓白术散（遵医嘱）、山楂麦芽茶、冬瓜薏米汤。",
        },
        "过弱调理": {
            "养生": "宜补不宜泄，健脾益气为主。",
            "饮食": "多食黄色及甘味食物如小米、南瓜、红枣、山药；忌生冷。",
            "经络": "艾灸足三里穴、中脘穴、脾俞穴，按摩关元穴。",
            "情志": "戒忧思过度，可听宫调音乐（如《十面埋伏》）。",
            "运动": "散步、太极拳、健走、站桩。",
            "茶饮": "姜枣茶、人参茶、黄芪红枣茶。",
            "药膳": "四君子汤、补中益气汤（遵医嘱）、山药莲子粥。",
        },
    },
    "金": {
        "脏": "肺",
        "腑": "大肠",
        "五官": "鼻",
        "五体": "皮毛",
        "情志": "悲",
        "五味": "辛",
        "五色": "白",
        "五化": "收",
        "季节": "秋",
        "时辰": "申酉",
        "经络": "手太阴肺经、手阳明大肠经",
        "功能": "主气司呼吸、通调水道、主皮毛、开窍于鼻",
        "易患疾病": "肺炎、支气管炎、哮喘、皮肤病、便秘、鼻炎",
        "养护重点": "润肺养阴、多食白色食物、适当呼吸训练、保持乐观",
        "经典论述": "《素问·灵兰秘典论》：'肺者，相傅之官，治节出焉。'",
        "过旺调理": {
            "养生": "宜泄不宜补，清肺润燥为主。",
            "饮食": "多食白色及辛味食物如梨、银耳、百合；忌辛辣。",
            "经络": "按尺泽穴、列缺穴，敲打肺经，艾灸肺俞穴。",
            "情志": "戒悲伤，悲胜于金，宜保持积极乐观。",
            "运动": "深呼吸、游泳、慢跑、太极拳。",
            "茶饮": "蜂蜜梨水、百合银耳羹、麦冬茶、润肺茶。",
            "药膳": "清燥救肺汤（遵医嘱）、川贝雪梨汤、百合杏仁粥。",
        },
        "过弱调理": {
            "养生": "宜补不宜泄，补肺益气固表为主。",
            "饮食": "多食白色食物如白萝卜、藕、杏仁；忌寒凉。",
            "经络": "艾灸肺俞穴、太渊穴，按摩足三里穴。",
            "情志": "戒悲忧，可听商调音乐（如《阳春白雪》）。",
            "运动": "深呼吸训练、游泳、慢走、八段锦。",
            "茶饮": "黄芪麦冬茶、太子参茶、虫草茶。",
            "药膳": "补肺汤（遵医嘱）、百合粥、山药粥。",
        },
    },
    "水": {
        "脏": "肾",
        "腑": "膀胱",
        "五官": "耳",
        "五体": "骨髓",
        "情志": "恐",
        "五味": "咸",
        "五色": "黑",
        "五化": "藏",
        "季节": "冬",
        "时辰": "亥子",
        "经络": "足少阴肾经、足太阳膀胱经",
        "功能": "藏精、主水、纳气、主骨生髓、开窍于耳",
        "易患疾病": "肾炎、肾结石、泌尿系统问题、腰膝酸软、耳鸣、骨质疏松",
        "养护重点": "补肾固精、早睡晚起、保暖腰膝、多食黑色食物",
        "经典论述": "《素问·灵兰秘典论》：'肾者，作强之官，伎巧出焉。'",
        "过旺调理": {
            "养生": "宜泄不宜补，滋阴降火为主。",
            "饮食": "多食黑色及咸味食物如黑豆、海带；忌过咸。",
            "经络": "按涌泉穴、太溪穴，敲打肾经，艾灸关元穴。",
            "情志": "戒惊恐，恐则气下，宜保持镇定。",
            "运动": "固肾功、站桩、太极拳、散步。",
            "茶饮": "枸杞菊花茶、知母黄柏茶、麦冬茶。",
            "药膳": "知柏地黄丸（遵医嘱）、黑豆粥、海带汤。",
        },
        "过弱调理": {
            "养生": "宜补不宜泄，补肾填精为主。",
            "饮食": "多食黑色食物如黑芝麻、核桃、枸杞；忌寒凉。",
            "经络": "艾灸关元穴、命门穴、肾俞穴，按摩涌泉穴。",
            "情志": "戒恐惧，可听羽调音乐（如《梅花三弄》）。",
            "运动": "站桩、固肾功、太极拳、散步。",
            "茶饮": "枸杞茶、菟丝子茶、杜仲茶。",
            "药膳": "六味地黄丸、金匮肾气丸（遵医嘱）、核桃芝麻糊。",
        },
    },
}

# 十二经络与五行对应
MERIDIANS_WUXING = {
    "足厥阴肝经": "木",
    "足少阳胆经": "木",
    "手少阴心经": "火",
    "手太阳小肠经": "火",
    "手少阳三焦经": "火",
    "足太阴脾经": "土",
    "足阳明胃经": "土",
    "手太阴肺经": "金",
    "手阳明大肠经": "金",
    "足少阴肾经": "水",
    "足太阳膀胱经": "水",
}

# 天干地支对应身体部位
GAN_BODY_PARTS = {
    "甲": "头、胆", "乙": "肝、颈", "丙": "肩、小肠", "丁": "心、血液", "戊": "鼻、胃",
    "己": "面、脾", "庚": "肺、大肠", "辛": "肺、牙齿", "壬": "胫、膀胱", "癸": "耳、肾",
}

ZHI_BODY_PARTS = {
    "子": "耳、肾、膀胱", "丑": "腹、脾", "寅": "头、手", "卯": "指、肝",
    "辰": "肩、胸", "巳": "面、心", "午": "眼、心", "未": "胃、脾",
    "申": "肺、大肠", "酉": "肺、鼻", "戌": "腿、命门", "亥": "头、肾",
}

# 藏干对应的身体部位
CANG_GAN_BODY = {
    "甲": "胆、头", "丙": "小肠、肩", "戊": "胃、鼻", "庚": "大肠、肺", "壬": "膀胱、胫",
    "乙": "肝、颈", "丁": "心、血液", "己": "脾、面", "辛": "肺、齿", "癸": "肾、耳",
}


class OrganWuxingResult(TypedDict, total=False):
    五行分析: dict
    脏腑状态: list[dict]
    经络能量: dict
    健康预警: list[dict]
    养生建议: dict
    身体器官图: dict


class OrganStatus(TypedDict):
    器官: str
    五行: str
    状态: str  # 过旺/中和/过弱
    能量值: int  # 1-10
    对应经络: str
    易患问题: str
    养护建议: str


def map_organs_by_bazi(
    bazi_pillars: dict,
    wuxing_counts: dict,
    day_master: str,
) -> list[OrganStatus]:
    """根据八字五行偏重映射身体器官状态

    Args:
        bazi_pillars: 八字四柱 {year_gan, year_zhi, month_gan, month_zhi, day_gan, day_zhi, hour_gan, hour_zhi}
        wuxing_counts: 五行计数 {木: count, 火: count, 土: count, 金: count, 水: count}
        day_master: 日主天干

    Returns:
        各器官状态列表
    """
    total = sum(wuxing_counts.values()) if wuxing_counts else 25
    expected = total / 5

    results = []
    for wx, organ_info in WUXING_ORGANS.items():
        count = wuxing_counts.get(wx, 0)
        ratio = count / expected if expected > 0 else 1.0

        if ratio >= 1.4:
            state = "过旺"
            energy = min(10, int(8 + (ratio - 1.4) * 5))
        elif ratio <= 0.6:
            state = "过弱"
            energy = max(1, int(3 + (ratio - 0.6) * 10))
        else:
            state = "中和"
            energy = min(10, max(1, int(5 + (ratio - 1.0) * 5)))

        warnings = _get_organ_warnings(wx, state, count)

        results.append(OrganStatus(
            器官=organ_info["脏"],
            五行=wx,
            状态=state,
            能量值=energy,
            对应经络=organ_info["经络"],
            易患问题=organ_info["易患疾病"],
            养护建议=organ_info["养护重点"],
        ))

    results.sort(key=lambda x: x["能量值"], reverse=True)
    return results


def _get_organ_warnings(wx: str, state: str, count: int) -> list[str]:
    """获取器官预警信息"""
    warnings = []
    if state == "过旺":
        if wx == "木":
            warnings.append("肝气过旺，易怒易躁，需要疏泄")
        elif wx == "火":
            warnings.append("心火旺盛，失眠多梦，需要静心")
        elif wx == "土":
            warnings.append("湿气较重，脾胃负担大，需要祛湿")
        elif wx == "金":
            warnings.append("肺气过盛，燥气盛，需要润燥")
        elif wx == "水":
            warnings.append("寒气较重，肾水过旺，需要驱寒")
    elif state == "过弱":
        if wx == "木":
            warnings.append("肝气不足，疏泄无力，需要补肝")
        elif wx == "火":
            warnings.append("心气不足，神失所养，需要养心")
        elif wx == "土":
            warnings.append("脾气虚弱，运化失常，需要健脾")
        elif wx == "金":
            warnings.append("肺气不足，卫外失固，需要补肺")
        elif wx == "水":
            warnings.append("肾精不足，藏纳失职，需要补肾")
    return warnings


def calc_wuxing_imbalance(wuxing_counts: dict) -> dict:
    """计算五行失衡程度

    Args:
        wuxing_counts: 五行计数

    Returns:
        失衡分析结果
    """
    total = sum(wuxing_counts.values()) if wuxing_counts else 25
    expected = total / 5

    imbalances = {}
    for wx in ["木", "火", "土", "金", "水"]:
        count = wuxing_counts.get(wx, 0)
        diff = count - expected
        ratio = count / expected if expected > 0 else 1.0
        imbalances[wx] = {
            "计数": count,
            "占比": round(count / total * 100, 1) if total > 0 else 0,
            "期望值": round(expected, 1),
            "偏差": round(diff, 1),
            "失衡度": round(ratio, 2),
            "状态": "过旺" if ratio >= 1.4 else ("过弱" if ratio <= 0.6 else "中和"),
        }

    max_organ = max(wuxing_counts, key=wuxing_counts.get) if wuxing_counts else "土"
    min_organ = min(wuxing_counts, key=wuxing_counts.get) if wuxing_counts else "火"

    return {
        "总能量": total,
        "各五行状态": imbalances,
        "最强": max_organ,
        "最弱": min_organ,
        "整体评估": _evaluate_overall(wuxing_counts, expected),
    }


def _evaluate_overall(wuxing_counts: dict, expected: float) -> str:
    """评估整体五行平衡状态"""
    if not wuxing_counts:
        return "数据不足，无法评估"

    ratios = {wx: wuxing_counts.get(wx, 0) / expected if expected > 0 else 1.0
              for wx in ["木", "火", "土", "金", "水"]}

    max_ratio = max(ratios.values())
    min_ratio = min(ratios.values())

    if max_ratio <= 1.3 and min_ratio >= 0.7:
        return "五行相对平衡，整体健康状态良好"
    elif max_ratio >= 1.6 or min_ratio <= 0.4:
        return "五行严重失衡，需要重点调养"
    else:
        return "五行轻度失衡，建议针对性调养"


def get_health_warning(
    bazi_pillars: dict,
    wuxing_counts: dict,
    wuyun_info: dict | None = None
) -> list[dict]:
    """生成综合健康预警

    Args:
        bazi_pillars: 八字四柱
        wuxing_counts: 五行计数
        wuyun_info: 五运六气信息（可选）

    Returns:
        健康预警列表
    """
    warnings = []

    day_gan = bazi_pillars.get("day_gan", "甲")
    day_zhi = bazi_pillars.get("day_zhi", "子")
    year_zhi = bazi_pillars.get("year_zhi", "子")

    day_gan_body = GAN_BODY_PARTS.get(day_gan, "")
    day_zhi_body = ZHI_BODY_PARTS.get(day_zhi, "")

    organ_status = map_organs_by_bazi(bazi_pillars, wuxing_counts, day_gan)

    weak_organs = [o for o in organ_status if o["状态"] == "过弱"]
    strong_organs = [o for o in organ_status if o["状态"] == "过旺"]

    for org in weak_organs:
        warnings.append({
            "类型": "虚弱预警",
            "器官": org["器官"],
            "五行": org["五行"],
            "严重程度": "高" if org["能量值"] <= 2 else "中",
            "描述": f"{org['器官']}气偏弱，{org['易患问题']}",
            "建议": org["养护建议"],
        })

    for org in strong_organs:
        warnings.append({
            "类型": "过旺预警",
            "器官": org["器官"],
            "五行": org["五行"],
            "严重程度": "高" if org["能量值"] >= 9 else "中",
            "描述": f"{org['器官']}气过旺，{org['易患问题']}",
            "建议": org["养护建议"],
        })

    if wuyun_info:
        yun = wuyun_info.get("天干化运", "土")
        sitian = wuyun_info.get("地支化气_司天", "太阴湿土")
        organ_map = {"木": "肝", "火": "心", "土": "脾", "金": "肺", "水": "肾"}
        yun_organ = organ_map.get(yun, "脾")

        warnings.append({
            "类型": "五运六气预警",
            "器官": yun_organ,
            "五行": yun,
            "严重程度": "中",
            "描述": f"流年{yun}运当令，{sitian}司天，注意{sitian}相关问题",
            "建议": f"重点调养{yun_organ}脏，顺应{sitian}气候变化",
        })

    if day_zhi in ["子", "午"]:
        warnings.append({
            "类型": "特殊组合预警",
            "器官": "心/肾",
            "五行": "水火",
            "严重程度": "低",
            "描述": "子午相冲，心肾水火不济，注意失眠多梦",
            "建议": "交通心肾，睡前泡脚揉涌泉",
        })

    if day_zhi in ["寅", "申"]:
        warnings.append({
            "类型": "特殊组合预警",
            "器官": "肝/胆",
            "五行": "木",
            "严重程度": "低",
            "描述": "寅申相冲，肝胆气机不畅",
            "建议": "疏肝利胆，多做伸展运动",
        })

    return warnings


def get_body_map_data(wuxing_counts: dict, organ_status: list) -> dict:
    """生成身体器官五行图数据

    Returns:
        身体器官SVG展示所需的数据
    """
    positions = {
        "木": {"x": 120, "y": 180, "label": "肝胆", "side": "left"},
        "火": {"x": 200, "y": 120, "label": "心", "side": "top"},
        "土": {"x": 200, "y": 240, "label": "脾胃", "side": "center"},
        "金": {"x": 280, "y": 180, "label": "肺大肠", "side": "right"},
        "水": {"x": 200, "y": 320, "label": "肾膀胱", "side": "bottom"},
    }

    organ_data = {}
    for org in organ_status:
        wx = org["五行"]
        pos = positions.get(wx, {"x": 200, "y": 200, "label": org["器官"], "side": "center"})
        organ_data[wx] = {
            "器官名": org["器官"],
            "位置": pos,
            "状态": org["状态"],
            "能量": org["能量值"],
            "经络": org["对应经络"],
            "养护": org["养护建议"],
            "颜色": _get_wuxing_color(wx),
        }

    return {
        "五行器官": organ_data,
        "positions": positions,
        "svg_viewbox": "0 0 400 400",
    }


def _get_wuxing_color(wx: str) -> dict:
    """获取五行对应颜色"""
    colors = {
        "木": {"fill": "#4CAF50", "stroke": "#2E7D32", "glow": "#81C784"},
        "火": {"fill": "#F44336", "stroke": "#C62828", "glow": "#E57373"},
        "土": {"fill": "#FF9800", "stroke": "#EF6C00", "glow": "#FFB74D"},
        "金": {"fill": "#9E9E9E", "stroke": "#616161", "glow": "#E0E0E0"},
        "水": {"fill": "#2196F3", "stroke": "#1565C0", "glow": "#64B5F6"},
    }
    return colors.get(wx, {"fill": "#9E9E9E", "stroke": "#616161", "glow": "#E0E0E0"})


def generate_health_suggestions(
    bazi_pillars: dict,
    wuxing_counts: dict,
    wuyun_info: dict | None = None,
    target_year: int | None = None,
    target_month: int | None = None,
) -> dict:
    """生成综合健康养生建议

    Args:
        bazi_pillars: 八字四柱
        wuxing_counts: 五行计数
        wuyun_info: 五运六气信息
        target_year: 目标流年
        target_month: 目标流月

    Returns:
        综合养生建议
    """
    organ_status = map_organs_by_bazi(bazi_pillars, wuxing_counts, bazi_pillars.get("day_gan", "甲"))
    imbalances = calc_wuxing_imbalance(wuxing_counts)

    diet = _generate_diet_suggestions(organ_status, imbalances)
    lifestyle = _generate_lifestyle_suggestions(organ_status, target_year, target_month)
    emotions = _generate_emotion_suggestions(organ_status)
    exercises = _generate_exercise_suggestions(organ_status)
    seasonal = _generate_seasonal_suggestions(wuyun_info) if wuyun_info else {}

    weak_organs = [o["器官"] for o in organ_status if o["状态"] == "过弱"]
    strong_organs = [o["器官"] for o in organ_status if o["状态"] == "过旺"]

    return {
        "饮食调理": diet,
        "起居调养": lifestyle,
        "情志调摄": emotions,
        "运动建议": exercises,
        "节气养生": seasonal,
        "重点关注": {
            "虚弱器官": weak_organs,
            "过旺器官": strong_organs,
            "调理原则": f"泄{'/'.join(strong_organs) if strong_organs else '中'} 补{'/'.join(weak_organs) if weak_organs else '中'}",
        },
    }


def _generate_diet_suggestions(organ_status: list, imbalances: dict) -> dict:
    """生成饮食调理建议

    结合《黄帝内经》《本草纲目》等中医典籍的药膳智慧
    """
    suggestions = []
    for org in organ_status:
        wx = org["五行"]
        state = org["状态"]
        organ = org["器官"]
        wuxing_info = WUXING_ORGANS.get(wx, {})

        if state == "过旺":
            state_desc = "过旺"
            adjust_desc = "宜泄不宜补"
            food_desc = f"多食{wuxing_info.get('五味', '甘')}味食物如{wuxing_info.get('五色', '黄')}色蔬果"
            taboo = f"少食{_get_opposite_taste(wx)}味食物"
            detail_info = wuxing_info.get("过旺调理", {})

            # 增强建议：加入药膳茶饮
            yaoshan = detail_info.get("药膳", "") if detail_info else ""
            chayin = detail_info.get("茶饮", "") if detail_info else ""

            suggestion = {
                "器官": organ,
                "状态": state_desc,
                "调理": adjust_desc,
                "建议": f"{food_desc}。{detail_info.get('养生', '') if detail_info else ''}",
                "禁忌": taboo,
            }
            if yaoshan:
                suggestion["药膳"] = yaoshan
            if chayin:
                suggestion["茶饮"] = chayin

            suggestions.append(suggestion)

        elif state == "过弱":
            state_desc = "过弱"
            adjust_desc = "宜补不宜泄"
            food_desc = f"多食{wuxing_info.get('五味', '甘')}味食物如{wuxing_info.get('五色', '黄')}色食物"
            taboo = f"避免过度使用{_get_opposite_taste(wx)}味食物"
            detail_info = wuxing_info.get("过弱调理", {})

            yaoshan = detail_info.get("药膳", "") if detail_info else ""
            chayin = detail_info.get("茶饮", "") if detail_info else ""

            suggestion = {
                "器官": organ,
                "状态": state_desc,
                "调理": adjust_desc,
                "建议": f"{food_desc}。{detail_info.get('养生', '') if detail_info else ''}",
                "禁忌": taboo,
            }
            if yaoshan:
                suggestion["药膳"] = yaoshan
            if chayin:
                suggestion["茶饮"] = chayin

            suggestions.append(suggestion)

    return {
        "items": suggestions,
        "总体原则": "五味调和，顺时调养。《素问·脏气法时论》：'五谷为养，五果为助，五畜为益，五菜为充。'",
        "经典引用": "《本草纲目》云：'药补不如食补'，饮食调养为养生之首务。",
    }


def _get_opposite_taste(wx: str) -> str:
    """获取五行对应相克之味"""
    opposite = {"木": "辛", "火": "咸", "土": "酸", "金": "苦", "水": "甘"}
    return opposite.get(wx, "甘")


def _generate_lifestyle_suggestions(
    organ_status: list,
    target_year: int | None = None,
    target_month: int | None = None
) -> dict:
    """生成起居调养建议

    结合《黄帝内经》四气调神大论的起居智慧
    """
    suggestions = []
    for org in organ_status:
        wx = org["五行"]
        state = org["状态"]
        organ = org["器官"]
        wuxing_info = WUXING_ORGANS.get(wx, {})
        detail_info = wuxing_info.get(f"{'过旺' if state == '过旺' else '过弱'}调理", {})

        if state == "过旺":
            jingluo = wuxing_info.get("经络", "相关经络")
            season = wuxing_info.get("季节", "四季")
            shichen = wuxing_info.get("时辰", "早晚")

            # 加入详细经络穴位建议
            jingluo_detail = detail_info.get("经络", "") if detail_info else ""
            yundong = detail_info.get("运动", "") if detail_info else ""

            suggestion = {
                "器官": organ,
                "建议": f"{season}宜{shichen}舒展，经络宜{jingluo}按摩宣泄。{detail_info.get('养生', '') if detail_info else '泄法调理为主。'}",
            }
            if jingluo_detail:
                suggestion["经络穴位"] = jingluo_detail
            if yundong:
                suggestion["推荐运动"] = yundong
            suggestions.append(suggestion)

        elif state == "过弱":
            jingluo = wuxing_info.get("经络", "相关经络")
            season = wuxing_info.get("季节", "四季")
            shichen = wuxing_info.get("时辰", "早晚")

            jingluo_detail = detail_info.get("经络", "") if detail_info else ""
            yundong = detail_info.get("运动", "") if detail_info else ""

            suggestion = {
                "器官": organ,
                "建议": f"{season}宜{shichen}静养，艾灸{jingluo}补益。{detail_info.get('养生', '') if detail_info else '补法调理为主。'}",
            }
            if jingluo_detail:
                suggestion["经络穴位"] = jingluo_detail
            if yundong:
                suggestion["推荐运动"] = yundong
            suggestions.append(suggestion)

    # 《黄帝内经》四气调神大论的经典起居指导
    season_tips = {
        "春": "春季宜早睡早起，广步于庭，披发缓行，以使志生（《素问·四气调神大论》）",
        "夏": "夏季宜晚睡早起，无厌于日，使气得泄，所爱在外（《素问·四气调神大论》）",
        "秋": "秋季宜早睡早起，与鸡俱兴，使志安宁，收敛神气（《素问·四气调神大论》）",
        "冬": "冬季宜早睡晚起，必待日光，去寒就温，无扰乎阳（《素问·四气调神大论》）",
        "长夏": "长夏宜早起晚睡，健脾祛湿，勿滥用苦寒（《脾胃论》）",
    }

    return {
        "items": suggestions,
        "季节提示": season_tips,
        "总体原则": "起居有常，不妄作劳。《素问·上古天真论》：'法于阴阳，和于术数，食欲有节，起居有常，不妄作劳，故能形与神俱。'",
        "时辰养生": "子时（23-1点）胆经当令，宜入睡；丑时（1-3点）肝经当令，宜深睡；寅时（3-5点）肺经当令，宜缓起。",
    }


def _generate_emotion_suggestions(organ_status: list) -> dict:
    """生成情志调摄建议

    结合《黄帝内经》五志与五脏关系的论述
    """
    suggestions = []
    for org in organ_status:
        wx = org["五行"]
        state = org["状态"]
        organ = org["器官"]
        emotion = WUXING_ORGANS.get(wx, {}).get("情志", "思")
        detail_info = WUXING_ORGANS.get(wx, {}).get(f"{'过旺' if state == '过旺' else '过弱'}调理", {})

        if state == "过旺":
            emotion_tips = detail_info.get("情志", "") if detail_info else ""
            music = _get_wuxing_music(wx, "旺")
            suggestion = {
                "器官": organ,
                "情志": f"{emotion}（过旺）",
                "建议": f"{emotion_tips}情志过极，《素问·举痛论》云：'怒则气上，喜则气缓，悲则气消，恐则气下。'需调节情志。",
                "调理原则": f"以情胜情，{_get_emotion_regulation(wx)}",
                "推荐音乐": music,
            }
            suggestions.append(suggestion)

        elif state == "过弱":
            emotion_tips = detail_info.get("情志", "") if detail_info else ""
            music = _get_wuxing_music(wx, "弱")
            suggestion = {
                "器官": organ,
                "情志": f"{emotion}（过弱）",
                "建议": f"{emotion_tips}情志不足，《灵枢·本神》云：'肝气虚则恐，脾气虚则四肢不用。'需补益情志。",
                "调理原则": f"补益脏气，{_get_emotion_regulation(wx)}",
                "推荐音乐": music,
            }
            suggestions.append(suggestion)

    return {
        "items": suggestions,
        "总体原则": "情志调和，内无思想之患。《素问·上古天真论》：'恬淡虚无，真气从之，精神内守，病安从来。'",
        "经典引用": "《素问·阴阳应象大论》：'怒伤肝，喜伤心，思伤脾，忧伤肺，恐伤肾。'",
        "情志相胜": "怒胜思，思胜恐，恐胜喜，喜胜悲，悲胜怒（按五行相克规律）。",
    }


def _get_wuxing_music(wx: str, state: str) -> str:
    """获取五行对应的音乐调式"""
    music_map = {
        "木": {"旺": "角调式，如《姑苏行》《鹧鸪飞》，疏肝解郁", "弱": "角调式，如《春江花月夜》，养肝柔肝"},
        "火": {"旺": "徵调式，如《紫竹调》《洞庭新歌》，清心降火", "弱": "徵调式，如《十样锦》，养心安神"},
        "土": {"旺": "宫调式，如《月儿高》，健脾祛湿", "弱": "宫调式，如《十面埋伏》，健脾和胃"},
        "金": {"旺": "商调式，如《阳春白雪》，润肺清燥", "弱": "商调式，如《高山流水》，补肺益气"},
        "水": {"旺": "羽调式，如《梅花三弄》，滋阴降火", "弱": "羽调式，如《平沙落雁》，补肾固精"},
    }
    return music_map.get(wx, {}).get(state, "宫商角徵羽五音调和")


def _get_emotion_regulation(wx: str) -> str:
    """获取情志调节方法"""
    regulation_map = {
        "木": "疏肝解郁，移情易性，多参与户外活动",
        "火": "清心泻火，静心养神，练习冥想书法",
        "土": "健脾和胃，移思易性，调节饮食起居",
        "金": "润肺补气，乐观开朗，多做深呼吸",
        "水": "补肾固精，安神定志，避免惊恐焦虑",
    }
    return regulation_map.get(wx, "调节情志，平衡五脏")


def _generate_exercise_suggestions(organ_status: list) -> dict:
    """生成运动建议

    结合《素问·宣明五气论》'久视伤血，久卧伤气，久坐伤肉，久立伤骨，久行伤筋'的理论
    """
    suggestions = []
    for org in organ_status:
        wx = org["五行"]
        state = org["状态"]
        organ = org["器官"]

        exercise_map = {
            "木": ("疏肝利胆", "瑜伽、太极、户外舒展", "八段锦'摇头摆尾去心火'、五禽戏之虎戏"),
            "火": ("养心安神", "慢跑、散步、柔和运动", "八段锦'摇头摆尾去心火'、太极拳、站桩"),
            "土": ("健脾和胃", "八段锦、站桩、健走", "八段锦'调理脾胃须单举'、易筋经"),
            "金": ("润肺补气", "深呼吸、游泳、有氧", "六字诀之'嘶'字诀、腹式呼吸训练"),
            "水": ("补肾固精", "太极、站桩、固肾功", "八段锦'背后七颠百病消'、五禽戏之鹿戏"),
        }

        name, tips, recommended = exercise_map.get(wx, ("综合调理", "均衡运动", "八段锦、太极拳"))
        if state == "过旺":
            suggestion = {
                "器官": organ,
                "运动方式": name,
                "建议": f"宜柔和宣泄类：{tips}",
                "推荐功法": recommended,
                "运动原则": "动则生阳，但过动伤气，宜循序渐进，微微汗出为佳。",
                "禁忌": f"忌剧烈运动、大汗淋漓，以免耗伤{wx}气。",
            }
            suggestions.append(suggestion)
        elif state == "过弱":
            suggestion = {
                "器官": organ,
                "运动方式": name,
                "建议": f"宜固本培元类：{tips}",
                "推荐功法": recommended,
                "运动原则": "形劳而不倦，气以形用，形以气养。",
                "时辰建议": _get_exercise_time(wx),
            }
            suggestions.append(suggestion)

    return {
        "items": suggestions,
        "总体原则": "形劳而不倦，循序渐进。《素问·上古天真论》：'上古之人，其知道者，法于阴阳，和于术数。'",
        "经典引用": "《素问·宣明五气论》：'久视伤血，久卧伤气，久坐伤肉，久立伤骨，久行伤筋。'运动需适度。",
        "运动时辰": "卯时（5-7点）大肠经当令，宜起床活动；酉时（17-19点）肾经当令，宜安静休息。",
    }


def _get_exercise_time(wx: str) -> str:
    """获取五行对应的最佳运动时辰"""
    time_map = {
        "木": "寅时（3-5点）肝经当令，宜户外舒展；卯时（5-7点）大肠经当令，宜排便后散步",
        "火": "巳时（9-11点）脾经当令，宜轻松运动；午时（11-13点）心经当令，宜静养",
        "土": "辰时（7-9点）胃经当令，宜早餐后散步；巳时（9-11点）脾经当令，宜健走",
        "金": "寅时（3-5点）肺经当令，宜深呼吸；申时（15-17点）膀胱经当令，宜游泳",
        "水": "酉时（17-19点）肾经当令，宜太极站桩；戌时（19-21点）心包经当令，宜静养",
    }
    return time_map.get(wx, "顺应天时，适度运动")


def _generate_seasonal_suggestions(wuyun_info: dict) -> dict:
    """生成节气养生建议"""
    if not wuyun_info:
        return {}

    sitian = wuyun_info.get("地支化气_司天", "")
    zaiquan = wuyun_info.get("地支化气_在泉", "")
    yun = wuyun_info.get("天干化运", "土")

    organ_map = {"木": "肝", "火": "心", "土": "脾", "金": "肺", "水": "肾"}
    yun_organ = organ_map.get(yun, "脾")

    return {
        "司天养生": f"上半年{sitian}当令，重点调养{organ_map.get(_get_wuxing_from_qi(sitian), yun_organ)}脏",
        "在泉养生": f"下半年{zaiquan}在泉，注意{zaiquan}相关问题",
        "主运养生": f"年干{yun}运{'太过' if wuyun_info.get('运之太过不及') == '太过' else '不及'}，{yun_organ}气{'偏盛' if wuyun_info.get('运之太过不及') == '太过' else '偏虚'}",
        "时节提醒": "顺应节气，春夏养阳，秋冬养阴",
    }


def _get_wuxing_from_qi(qi_name: str) -> str:
    """从六气名称获取五行"""
    mapping = {
        "厥阴风木": "木",
        "少阴君火": "火",
        "少阳相火": "火",
        "太阴湿土": "土",
        "阳明燥金": "金",
        "太阳寒水": "水",
    }
    return mapping.get(qi_name, "土")