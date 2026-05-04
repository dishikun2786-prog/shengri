# -*- coding: utf-8 -*-
# 在 Python 中检查实际运行时的确切行为
# 模拟 HTTP API 的完整调用链

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

# 导入并模拟 API 路由的完整行为
from app.api.bazi import get_liuyue
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 调用 API
print("=== TestClient 调用 /api/v1/bazi/liuyue ===")
r = client.get("/api/v1/bazi/liuyue", params={"year": 2026, "day_master": "丁"})
print(f"status: {r.status_code}")
data = r.json()
print(f"返回: {len(data)} 条")

# 检查排序
from collections import Counter
months = [x['month'] for x in data]
print(f"month 统计: {dict(Counter(months))}")

# 找缺失的 month
all_months = set(range(1, 13))
missing = all_months - set(months)
if missing:
    print(f"缺失: {missing}")

# 显示所有
print("\n按 solar_month_index 排序:")
for item in sorted(data, key=lambda x: x.get('solar_month_index') or 999):
    print(f"  solar_idx={item['solar_month_index']:2d} month={item['month']:2d} lunar={repr(item['lunar_month'])}")

# 检查 month=4
m4 = next((x for x in data if x['month'] == 4), None)
if m4:
    print(f"\n找到 month=4: solar_idx={m4['solar_month_index']}")
else:
    print("\n没有 month=4!")

# 检查 month=11
m11 = [x for x in data if x['month'] == 11]
print(f"month=11 出现 {len(m11)} 次:")
for x in m11:
    print(f"  solar_idx={x['solar_month_index']}, start={x['solar_month_start']}, end={x['solar_month_end']}")