"""FastAPI 路由层集成测试：流月/流日等排盘子接口

覆盖「经 HTTP 的契约」与 pillar_calculator 单测形成互补。"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestBaziLiuHttp:
    @pytest.mark.parametrize("year,day_master", [(2026, "丁"), (1992, "甲")])
    def test_liuyue_ok_and_count(self, year: int, day_master: str):
        r = client.get(
            "/api/v1/bazi/liuyue",
            params={"year": year, "day_master": day_master},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) == 12
        for row in data:
            assert "gan" in row and "zhi" in row
            assert "month" in row
            assert 1 <= row["month"] <= 12
            assert "lunar_month_number" in row
            assert "is_leap_month" in row
            assert "solar_month_start" in row and "solar_month_end" in row

    @pytest.mark.parametrize(
        "year,month,expected_min_days",
        [(2024, 2, 29), (2023, 2, 28), (2026, 4, 30), (2026, 1, 31)],
    )
    def test_liuri_day_count_matches_calendar(
        self, year: int, month: int, expected_min_days: int,
    ):
        r = client.get(
            "/api/v1/bazi/liuri",
            params={"year": year, "month": month, "day_master": "丁"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) == expected_min_days
        for row in data:
            assert "gan" in row and "zhi" in row
            assert "solar_date" in row
            assert row["solar_date"].startswith(f"{year}-{month:02d}-")
            assert "lunar_day_number" in row

    def test_liuri_basis_date_contract(self):
        r = client.get(
            "/api/v1/bazi/liuri",
            params={
                "year": 2024,
                "month": 6,
                "day_master": "丁",
                "day_boundary_mode": "zi_hour",
                "reference_hour": 23,
                "reference_minute": 0,
            },
        )
        assert r.status_code == 200, r.text
        row = r.json()[0]
        assert row["basis_date"] == row["solar_date"]
        assert row["display_solar_date"] == row["solar_date"]
        assert "月" in row["lunar_date"]

    def test_liuyue_rejects_invalid_year(self):
        r = client.get(
            "/api/v1/bazi/liuyue",
            params={"year": 1800, "day_master": "甲"},
        )
        assert r.status_code == 422

    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "ok"
