"""ShengRi 历法引擎 —— FastAPI 服务入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.bazi import router as bazi_router
from .api.health import router as health_router

app = FastAPI(
    title="ShengRi 历法引擎",
    description="专业级八字排盘 API —— 精准四柱计算、真太阳时校正、全球城市支持",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bazi_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    try:
        import sxtwl
        engine = "sxtwl"
    except ImportError:
        engine = "fallback"
    return {"status": "ok", "engine": engine, "version": "1.0.0"}
