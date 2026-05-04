# -*- coding: utf-8 -*-
# 关键发现：
# - _calc_liuyue(2026, "丁") 直接调用返回正确数据（month=4存在）
# - 但通过 HTTP API 调用时返回错误数据（month=4丢失）
# 这说明问题在 API 路由层或服务层

# 让我检查 bazi.service.ts 的 getLiuyue 方法

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

# 直接测试 API 返回的完整数据
print("=== 通过 FastAPI TestClient 测试 /api/v1/bazi/liuyue ===")
r = client.get("/api/v1/bazi/liuyue", params={"year": 2026, "day_master": "丁"})
print(f"status: {r.status_code}")
data = r.json()
print(f"返回 {len(data)} 条")

# 检查 month 值
from collections import Counter
months = Counter(x['month'] for x in data)
print(f"\nmonth 值统计: {dict(months)}")

# 找到 month=4
month4 = next((x for x in data if x['month'] == 4), None)
if month4:
    print(f"\n找到 month=4: solar_idx={month4['solar_month_index']}, lunar_month={repr(month4['lunar_month'])}")
else:
    print("\n没有找到 month=4!")
    # 找哪些 month 缺失了
    all_months = set(range(1, 13))
    present_months = set(x['month'] for x in data)
    missing = all_months - present_months
    print(f"缺失的 month: {missing}")

# 检查排序后的数据
print("\n=== 排序后的流月（按 solar_month_index）===")
for item in sorted(data, key=lambda x: x.get('solar_month_index') or 999):
    print(f"  solar_idx={item.get('solar_month_index'):2d} month={item['month']:2d} lunar={repr(item['lunar_month'])}")

# 显示完整 JSON
print("\n=== 完整 JSON ===")
print(json.dumps(data, indent=2, ensure_ascii=False))