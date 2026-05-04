# -*- coding: utf-8 -*-
# Run actual API calls and check the raw JSON response
import requests
import json

# Start the server first (assume it's running on port 8000)
# Check if we can call the API

base_url = "http://localhost:8000/api/v1"

# Test liuyue for 2026
try:
    r = requests.get(f"{base_url}/bazi/liuyue", params={"year": 2026, "day_master": "甲"}, timeout=5)
    print(f"liuyue status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"liuyue count: {len(data)}")
        for item in data:
            print(json.dumps(item, ensure_ascii=False))
except Exception as e:
    print(f"liuyue error: {e}")

print()

# Test liuri for 2026-5
try:
    r = requests.get(f"{base_url}/bazi/liuri", params={"year": 2026, "month": 5, "day_master": "甲"}, timeout=5)
    print(f"liuri status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"liuri count: {len(data)}")
        # Show days that have 四月
        for item in data:
            if "月" in item.get("lunar_date", "") and ("四" in item.get("lunar_date", "") or "闰" in item.get("lunar_date", "")):
                print(json.dumps(item, ensure_ascii=False))
except Exception as e:
    print(f"liuri error: {e}")