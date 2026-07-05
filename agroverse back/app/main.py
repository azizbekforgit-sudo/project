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
        new_hash = get_password_hash(ADMIN_PASSWORD)

        # 1) Try exact phone match
        res = await db.execute(select(User).where(User.phone == ADMIN_PHONE))
        existing = res.scalar_one_or_none()

        if existing:
            changed = False
            if existing.password_hash != new_hash:
                existing.password_hash = new_hash
                changed = True
            if existing.role != UserRole.ADMIN:
                existing.role = UserRole.ADMIN
                changed = True
            if not existing.is_active:
                existing.is_active = True
                changed = True
            if changed:
                await db.commit()
                print(f"[ADMIN] Синхронизирован: phone={ADMIN_PHONE}")
            else:
                print(f"[ADMIN] OK: phone={ADMIN_PHONE}")
            return

        # 2) If phone not found, check if there's ANY admin — update their password
        admin_res = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        any_admin = admin_res.scalar_one_or_none()
        if any_admin:
            any_admin.phone = ADMIN_PHONE
            any_admin.password_hash = new_hash
            any_admin.is_active = True
            await db.commit()
            print(f"[ADMIN] Обновлён существующий админ: id={any_admin.id}, phone={ADMIN_PHONE}")
            return

        # 3) No admin at all — create
        admin = User(
            name="Администратор",
            phone=ADMIN_PHONE,
            email="admin@agroverse.uz",
            password_hash=new_hash,
            role=UserRole.ADMIN,
            tariff=UserTariff.PREMIUM,
            bonus_points=0,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"[ADMIN] Создан: phone={ADMIN_PHONE}, password={ADMIN_PASSWORD}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text

        # ── Конвертируем PostgreSQL enum-колонки в VARCHAR ──
        for col, new_type in [
            ("role", "VARCHAR(20)"),
            ("tariff", "VARCHAR(20)"),
        ]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE users ALTER COLUMN {col} TYPE {new_type} USING {col}::text"
                ))
            except Exception:
                pass
        for col, new_type in [
            ("status", "VARCHAR(20)"),
        ]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE products ALTER COLUMN {col} TYPE {new_type} USING {col}::text"
                ))
            except Exception:
                pass
        for col, new_type in [
            ("pickup_method", "VARCHAR(20)"),
            ("status", "VARCHAR(20)"),
        ]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE orders ALTER COLUMN {col} TYPE {new_type} USING {col}::text"
                ))
            except Exception:
                pass
        # Удаляем старые enum-типы PostgreSQL если есть
        for tname in ["userrole", "usertariff", "productstatus", "orderstatus", "pickupmethod"]:
            try:
                await conn.execute(text(f"DROP TYPE IF EXISTS {tname} CASCADE"))
            except Exception:
                pass

        # ── Миграция из легаси main.py (если таблица создана монолитом) ──
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
        except Exception:
            pass
        # Копируем password → password_hash если password_hash пуст
        try:
            await conn.execute(text(
                "UPDATE users SET password_hash = password WHERE password_hash IS NULL OR password_hash = ''"
            ))
        except Exception:
            pass
        # Конвертируем is_blocked → is_active если is_active не установлен
        try:
            await conn.execute(text(
                "UPDATE users SET is_active = (is_blocked != 'true') WHERE is_active IS NULL"
            ))
        except Exception:
            pass
        # Добавляем tariff если нет
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS tariff VARCHAR(20) DEFAULT 'standart'"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0"))
        except Exception:
            pass
    await seed_admin()
    print("🌾 AgroVerse API запущен")
    yield
    await engine.dispose()


app = FastAPI(title="AgroVerse API", version="2.0", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "https://pure-strength-production.up.railway.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/api/config")
async def get_config():
    return {
        "google_maps_key": settings.google_maps_key,
        "version": "2.0",
    }


@app.get("/api/debug/admin-info")
async def debug_admin_info():
    """Debug endpoint — shows admin account info (no auth needed)"""
    from app.models import User, UserRole
    from app.auth import verify_password, get_password_hash
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        admins = result.scalars().all()

        admin_list = []
        for a in admins:
            password_works = verify_password(ADMIN_PASSWORD, a.password_hash)
            admin_list.append({
                "id": a.id,
                "phone": a.phone,
                "name": a.name,
                "is_active": a.is_active,
                "password_works_with_default": password_works,
            })

        return {
            "admin_phone_setting": ADMIN_PHONE,
            "admin_password_is_default": ADMIN_PASSWORD == "admin123",
            "admins_found": len(admin_list),
            "admins": admin_list,
            "secret_key_length": len(settings.secret_key),
        }


@app.post("/api/debug/reset-admin")
async def debug_reset_admin():
    """Force-reset admin password to admin123 (no auth needed)"""
    from app.models import User, UserRole
    from app.auth import get_password_hash
    async with AsyncSessionLocal() as db:
        new_hash = get_password_hash(ADMIN_PASSWORD)

        # Find admin by phone
        result = await db.execute(select(User).where(User.phone == ADMIN_PHONE))
        admin = result.scalar_one_or_none()

        if admin:
            admin.password_hash = new_hash
            admin.is_active = True
            admin.role = UserRole.ADMIN
            await db.commit()
            return {"ok": True, "message": f"Admin password reset for phone {ADMIN_PHONE}"}

        # Find ANY admin
        result2 = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        any_admin = result2.scalar_one_or_none()
        if any_admin:
            any_admin.phone = ADMIN_PHONE
            any_admin.password_hash = new_hash
            any_admin.is_active = True
            await db.commit()
            return {"ok": True, "message": f"Admin updated: id={any_admin.id}, phone={ADMIN_PHONE}"}

        # Create new admin
        new_admin = User(
            name="Администратор",
            phone=ADMIN_PHONE,
            email="admin@agroverse.uz",
            password_hash=new_hash,
            role=UserRole.ADMIN,
            tariff="premium",
            bonus_points=0,
            is_active=True,
        )
        db.add(new_admin)
        await db.commit()
        return {"ok": True, "message": f"Admin created: phone={ADMIN_PHONE}"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)