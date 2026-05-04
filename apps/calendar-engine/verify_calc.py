# -*- coding: utf-8 -*-
# 检查是否是 Redis 缓存导致的问题

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

from app.core.pillar_calculator import _calc_liuyue

# 直接调用函数看返回
print("=== 直接调用 _calc_liuyue(2026, '丁') ===")
result = _calc_liuyue(2026, "丁")
print(f"返回 {len(result)} 条")

months = [x.month for x in result]
from collections import Counter
print(f"month 值: {dict(Counter(months))}")

# 找 month=4
m4 = next((x for x in result if x.month == 4), None)
if m4:
    print(f"month=4 存在: solar_idx={m4.solar_month_index}, lunar_month={repr(m4.lunar_month)}")
else:
    print("month=4 不存在!")

# 找 month=11
m11 = [x for x in result if x.month == 11]
print(f"month=11 出现 {len(m11)} 次")
for m in m11:
    print(f"  solar_idx={m.solar_month_index}, lunar_month={repr(m.lunar_month)}")

# 打印所有 month
print("\n所有 month (按 solar_month_index 排序):")
for x in sorted(result, key=lambda x: x.solar_month_index):
    print(f"  solar_idx={x.solar_month_index} month={x.month} lunar_month={repr(x.lunar_month)}")