# -*- coding: utf-8 -*-
# 诊断问题：2026年排盘详情中流月流日缺少农历四月信息
# 通过直接调用API来测试完整的数据流

import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== 1. 测试流月 API (2026年) ===")
r = client.get("/api/v1/bazi/liuyue", params={"year": 2026, "day_master": "甲"})
assert r.status_code == 200
data = r.json()
print(f"流月返回 {len(data)} 条")

# 找到农历四月
for item in data:
    if item["month"] == 4:
        print(f"农历四月: month={item['month']}, lunar_month={repr(item['lunar_month'])}, "
              f"lunar_month_number={item['lunar_month_number']}, "
              f"solar_range={item['solar_month_start']}~{item['solar_month_end']}")
        break

print()
print("=== 2. 测试流日 API (2026年5月) ===")
r = client.get("/api/v1/bazi/liuri", params={"year": 2026, "month": 5, "day_master": "甲"})
assert r.status_code == 200
may_data = r.json()
print(f"5月流日返回 {len(may_data)} 条")

# 找四月的日期
for item in may_data:
    if "四" in item.get("lunar_date", "") or "闰" in item.get("lunar_date", ""):
        print(f"  day={item['day']} solar={item['solar_date']} lunar={item['lunar_date']}")
        if item['day'] == 17:
            break

print()
print("=== 3. 测试流日 API (2026年6月) ===")
r = client.get("/api/v1/bazi/liuri", params={"year": 2026, "month": 6, "day_master": "甲"})
assert r.status_code == 200
jun_data = r.json()
print(f"6月流日返回 {len(jun_data)} 条")

# 找四月的日期
count = 0
for item in jun_data:
    if "四" in item.get("lunar_date", "") or "闰" in item.get("lunar_date", ""):
        print(f"  day={item['day']} solar={item['solar_date']} lunar={item['lunar_date']}")
        count += 1
print(f"6月共有 {count} 天显示农历四月")

print()
print("=== 4. 前端 loadLiuri 逻辑模拟 ===")
# 模拟前端 loadLiuri 的逻辑
liuyue_month4 = next((item for item in data if item["month"] == 4), None)
if liuyue_month4:
    start = liuyue_month4["solar_month_start"]  # "2026-05-17"
    end = liuyue_month4["solar_month_end"]    # "2026-06-14"
    print(f"选择的流月: month=4, start={start}, end={end}")

    # 计算需要查询的月份
    from datetime import datetime
    start_date = datetime.strptime(start, "%Y-%m-%d")
    end_date = datetime.strptime(end, "%Y-%m-%d")
    months_to_query = set()
    cursor = start_date
    while cursor <= end_date:
        months_to_query.add(f"{cursor.year}-{cursor.month}")
        # Move to next month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)
    print(f"需要查询的月份: {sorted(months_to_query)}")

    # 合并数据并过滤
    all_data = may_data + jun_data
    filtered = []
    for item in all_data:
        date_str = item.get("basis_date") or item.get("solar_date", "")
        if date_str:
            t = datetime.strptime(date_str, "%Y-%m-%d")
            if start_date <= t <= end_date:
                filtered.append(item)

    print(f"合并后过滤得到 {len(filtered)} 条流日")
    print(f"前5条: {[(d['day'], d['solar_date'], d['lunar_date']) for d in filtered[:5]]}")
    print(f"后5条: {[(d['day'], d['solar_date'], d['lunar_date']) for d in filtered[-5:]]}")

print()
print("=== 5. 检查 lunar_month 字段 ===")
print(f"lunar_month 值示例: {repr(data[5]['lunar_month'])}")
print(f"lunar_month_number 值示例: {data[5]['lunar_month_number']}")