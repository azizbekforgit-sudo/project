from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy import select
import os
import uvicorn

from app.database import engine, Base, AsyncSessionLocal, get_db
from app.config import settings
from app.routers import auth, products, orders, payment, bonus, admin, ai, delivery
from app.models import User, Product
from app.schemas import ProductResponse, ProductListResponse
from app.dependencies import get_current_user

ADMIN_PHONE = settings.admin_phone or "+998000000000"
ADMIN_PASSWORD = settings.admin_password or "admin123"


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
        print(f"Админ создан — логин: {ADMIN_PHONE}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT"))
        except Exception:
            pass
    await seed_admin()
    print("🌾 AgroVerse API запущен")
    yield
    await engine.dispose()


app = FastAPI(title="AgroVerse API", version="2.0", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "https://pure-strength-production.up.railway.app",
    "https://project-production-5501.up.railway.app",
    "https://project-production-7a95.up.railway.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=600,
)


def _safe_serialize(obj):
    """Рекурсивно сериализуем объект, заменяя бинарные данные на строку-заглушку."""
    if isinstance(obj, bytes):
        return f"<binary {len(obj)} bytes>"
    if isinstance(obj, dict):
        return {k: _safe_serialize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_safe_serialize(i) for i in obj]
    return obj


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors():
        errors.append({
            "loc": [str(x) for x in e.get("loc", [])],
            "msg": str(e.get("msg", "Validation error")),
            "type": str(e.get("type", "")),
        })
    # _safe_serialize убирает бинарные байты из input, чтобы не было UnicodeDecodeError
    safe_errors = _safe_serialize(errors)
    return JSONResponse(
        status_code=422,
        headers={"Access-Control-Allow-Origin": "*"},
        content={"detail": safe_errors},
    )


os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payment.router)
app.include_router(bonus.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(delivery.router)


@app.get("/api/my/products")
async def my_products_compat(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.fermer_id == current_user.id))
    products = result.scalars().all()
    product_responses = []
    for product in products:
        product_responses.append(ProductResponse(
            id=product.id, fermer_id=product.fermer_id, fermer_name=current_user.name,
            fermer_rating=current_user.bonus_points, title=product.title,
            description=product.description, category=product.category,
            price_per_unit=float(product.price_per_unit), unit=product.unit,
            quantity_available=float(product.quantity_available),
            photos=product.photos or [], rating=product.rating,
            status=product.status, created_at=product.created_at,
        ))
    return ProductListResponse(total=len(products), page=1, limit=len(products), products=product_responses)


@app.get("/")
async def root():
    return {"message": "🌾 AgroVerse API", "version": "2.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)