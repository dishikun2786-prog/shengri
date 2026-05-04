# -*- coding: utf-8 -*-
# 验证前端显示的逻辑是否正确

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

# Simulate the exact frontend flow
print("=== 模拟前端流程 ===\n")

# Step 1: Get liuyue for 2026
r = client.get("/api/v1/bazi/liuyue", params={"year": 2026, "day_master": "丁"})
liuyue_data = r.json()
print(f"1. loadLiuyue(2026) 返回 {len(liuyue_data)} 条")

# Step 2: Find month=4
month4 = next((x for x in liuyue_data if x["month"] == 4), None)
if month4:
    print(f"2. 选择的 month=4: start={month4['solar_month_start']}, end={month4['solar_month_end']}")
    print(f"   lunar_month={repr(month4['lunar_month'])}, lunar_month_number={month4['lunar_month_number']}")
else:
    print("2. 未找到 month=4!")
    exit()

# Step 3: Calculate months to query
from datetime import datetime
start_date = datetime.strptime(month4["solar_month_start"], "%Y-%m-%d")
end_date = datetime.strptime(month4["solar_month_end"], "%Y-%m-%d")

months_to_query = []
cursor = start_date
while cursor <= end_date:
    months_to_query.append(f"{cursor.year}-{cursor.month}")
    if cursor.month == 12:
        cursor = cursor.replace(year=cursor.year + 1, month=1)
    else:
        cursor = cursor.replace(month=cursor.month + 1)

print(f"3. 需要查询的月份: {months_to_query}")

# Step 4: Query liuri for each month
responses = []
for ym in months_to_query:
    y, m = map(int, ym.split("-"))
    r = client.get("/api/v1/bazi/liuri", params={"year": y, "month": m, "day_master": "丁"})
    responses.append(r.json())

print(f"4. 各月份返回的流日数量: {[len(r) for r in responses]}")

# Step 5: Merge and filter
merged = []
for r in responses:
    merged.extend(r)

print(f"5. 合并后共 {len(merged)} 条")

filtered = []
for d in merged:
    date_str = d.get("basis_date") or d.get("solar_date", "")
    if date_str:
        t = datetime.strptime(date_str, "%Y-%m-%d")
        if start_date <= t <= end_date:
            filtered.append(d)

print(f"6. 日期范围内过滤后 {len(filtered)} 条")

# Step 7: Sort by date
filtered.sort(key=lambda x: x.get("basis_date") or x.get("solar_date", ""))

print(f"\n=== 过滤后的流日数据 ===")
for item in filtered[:5]:
    print(f"  day={item['day']} solar={item['solar_date']} lunar_date={item['lunar_date']}")
print("  ...")
for item in filtered[-5:]:
    print(f"  day={item['day']} solar={item['solar_date']} lunar_date={item['lunar_date']}")

# Step 8: Check lunar_month for liuyue
print(f"\n=== 检查流月 lunar_month 显示 ===")
for item in liuyue_data:
    if item["month"] == 4:
        print(f"流月 lunar_month = {repr(item['lunar_month'])}, lunar_month_number = {item['lunar_month_number']}")

# Step 9: Check what the frontend would display
print(f"\n=== 前端会显示什么 ===")
# For the selected month in liuyue panel
print(f"LiuyuePanel 显示: {month4['lunar_month']}{month4['lunar_month_number']}月")
# For liuri calendar
print(f"LiuriCalendar lunar_date 示例: {filtered[0]['lunar_date']}")