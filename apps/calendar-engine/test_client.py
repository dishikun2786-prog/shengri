# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r"e:\Program Files\www\shengri\apps\calendar-engine")

# Direct test using TestClient
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== Test /bazi/liuyue for 2026 ===")
r = client.get("/api/v1/bazi/liuyue", params={"year": 2026, "day_master": "甲"})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Count: {len(data)}")
    for item in data:
        lunar_month = item.get("lunar_month", "")
        month = item.get("month", "")
        lunar_num = item.get("lunar_month_number", "")
        print(f"  month={month}, lunar_month={repr(lunar_month)}, lunar_month_number={lunar_num}, is_leap={item.get('is_leap_month')}")

print()
print("=== Test /bazi/liuri for 2026-5 ===")
r = client.get("/api/v1/bazi/liuri", params={"year": 2026, "month": 5, "day_master": "甲"})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Count: {len(data)}")
    for item in data:
        if "四" in item.get("lunar_date", ""):
            print(f"  day={item['day']} solar={item['solar_date']} lunar={item['lunar_date']}")