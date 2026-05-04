# -*- coding: utf-8 -*-
# 深入调试：检查命盘6的完整信息，以及前端看到的实际数据

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

# 1. 检查命盘6 - 通过 chart/6 端点（需要认证）
# 但我们可以直接通过 calendar-engine 的 API 检查

# 2. 检查 2026 年流月数据中 month 的分布
print("=== 检查 2026 年流月 month 字段分布 ===")
r = client.get("/api/v1/bazi/liuyue", params={"year": 2026})
data = r.json()

months = [item['month'] for item in data]
print(f"所有 month 值: {months}")

# 检查是否有重复
from collections import Counter
dup = Counter(months)
print(f"重复检查: {dict(dup)}")

# 3. 检查 month=4 的详细信息
month4 = next((x for x in data if x['month'] == 4), None)
if month4:
    print(f"\nmonth=4 的详细信息:")
    for k, v in month4.items():
        print(f"  {k}: {repr(v)}")
else:
    print("\n没有找到 month=4!")

# 4. 列出所有 month 值和对应的 lunar_month
print("\n=== 所有流月 ===")
for item in sorted(data, key=lambda x: x.get('solar_month_index', 0)):
    print(f"  solar_idx={item['solar_month_index']} month={item['month']} lunar_month={repr(item['lunar_month'])}")

# 5. 检查前端显示逻辑需要的字段
print("\n=== 前端渲染需要的字段检查 ===")
for item in data:
    lm = item.get('lunar_month', '')
    month_num = item.get('lunar_month_number', 0)
    month = item.get('month', 0)
    if lm == '四' or month == 4:
        print(f"四月相关: month={month}, lunar_month={repr(lm)}, lunar_month_number={month_num}")
        print(f"  key would be: '{month}-{item.get('is_leap_month', False)}'")

# 6. 检查实际API返回的完整JSON
print("\n=== 完整API返回 (格式化) ===")
print(json.dumps(data, indent=2, ensure_ascii=False))