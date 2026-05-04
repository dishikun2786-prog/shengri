# -*- coding: utf-8 -*-
# 关键发现：day_master="丁" 时 API 返回错误数据！
# 需要调试为什么 day_master 会影响流月数据

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

import sxtwl

print("=== 深入调试 day_master 对流月的影响 ===")

# 当 day_master 传入时，_calc_liuyue 内部会计算十神
# 但这不应该影响 month 值...

# 检查是否有 day_master 相关的问题
# 看一下 _calc_liuyue 的实现

from app.core.pillar_calculator import _calc_liuyue

# 先用 None 调用
result_no_master = _calc_liuyue(2026, None)
# 再用 "丁" 调用
result_with_master = _calc_liuyue(2026, "丁")

print(f"不带 day_master: {len(result_no_master)} 条")
print(f"带 day_master='丁': {len(result_with_master)} 条")

print("\n=== 不带 day_master 的 month 列表 ===")
months1 = [(x.month, x.solar_month_index, x.lunar_month) for x in result_no_master]
for m in sorted(months1, key=lambda x: x[1]):
    print(f"  month={m[0]:2d} solar_idx={m[1]} lunar={m[2]}")

print("\n=== 带 day_master='丁' 的 month 列表 ===")
months2 = [(x.month, x.solar_month_index, x.lunar_month) for x in result_with_master]
for m in sorted(months2, key=lambda x: x[1]):
    print(f"  month={m[0]:2d} solar_idx={m[1]} lunar={m[2]}")

# 比较两者是否不同
if months1 == months2:
    print("\n两者数据完全相同！")
else:
    print("\n数据不同!")
    diff1 = set(months1) - set(months2)
    diff2 = set(months2) - set(months1)
    if diff1:
        print(f"  在结果1中但不在结果2中: {diff1}")
    if diff2:
        print(f"  在结果2中但不在结果1中: {diff2}")