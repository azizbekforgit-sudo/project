from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import os
import uvicorn

from app.database import engine, Base, AsyncSessionLocal
from app.config import settings

from app.routers import auth, products, orders, payment, bonus, admin, ai

ADMIN_PHONE = "админ123"
ADMIN_PASSWORD = "127845"


async def seed_admin():
    from sqlalchemy import select
    from app.models import User, UserRole, UserTariff
    from app.auth import get_password_hash
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.phone == ADMIN_PHONE))
        if res.scalar_one_or_none():
            return
        admin = User(
            name="Администратор",
            phone=ADMIN_PHONE,
            email="admin@agroverse.uz",
            password_hash=get_password_hash(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            tariff=UserTariff.PREMIUM,
            bonus_points=0,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"👑 Админ создан — логин: {ADMIN_PHONE}, пароль: {ADMIN_PASSWORD}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT"))
    await seed_admin()
    print("🌾 AgroVerse API запущен")
    print("✅ CORS настроен для Railway")
    yield
    await engine.dispose()


app = FastAPI(title="AgroVerse API", version="2.0", lifespan=lifespan)


# Кастомный обработчик ошибок валидации — без бинарных данных
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors():
        errors.append({
            "loc": [str(x) for x in e.get("loc", [])],
            "msg": str(e.get("msg", "Validation error")),
            "type": str(e.get("type", "")),
        })
    return JSONResponse(
        status_code=422,
        headers={"Access-Control-Allow-Origin": "*"},
        content={"detail": errors}
    )


# CORS — разрешаем всё для Railway деплоя
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)


@app.middleware("http")
async def add_cors_to_errors(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payment.router)
app.include_router(bonus.router)
app.include_router(admin.router)
app.include_router(ai.router)


@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    """Handle CORS preflight for all routes (browser sends OPTIONS before POST with auth headers)"""
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
            "Access-Control-Max-Age": "600",
        }
    )


@app.get("/")
async def root():
    return {"message": "🌾 AgroVerse API", "version": "2.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)