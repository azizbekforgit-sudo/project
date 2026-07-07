from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy import select
import os
import uvicorn

print("========== ВЕРСИЯ ФАЙЛА: MARKER-7788 ==========")

from app.database import engine, Base, AsyncSessionLocal, get_db
from app.config import settings
from app.routers import auth, products, orders, payment, bonus, admin, ai, delivery
from app.models import User, Product
from app.schemas import ProductResponse, ProductListResponse
from app.dependencies import get_current_user

ADMIN_PHONE = settings.admin_phone or "+998000000000"
ADMIN_PASSWORD = settings.admin_password or "admin123"


async def seed_admin():
    from sqlalchemy import text
    from app.auth import get_password_hash
    async with AsyncSessionLocal() as db:
        new_hash = get_password_hash(ADMIN_PASSWORD)

        # Используем сырые SQL чтобы избежать проблем с PostgreSQL enum-типами
        result = await db.execute(
            text("SELECT id, password_hash, role, is_active FROM users WHERE phone = :phone"),
            {"phone": ADMIN_PHONE},
        )
        row = result.fetchone()

        if row:
            user_id, current_hash, current_role, current_active = row
            changed = False
            if current_hash != new_hash:
                await db.execute(
                    text("UPDATE users SET password_hash = :h WHERE id = :id"),
                    {"h": new_hash, "id": user_id},
                )
                changed = True
            if str(current_role).lower() != "admin":
                await db.execute(
                    text("UPDATE users SET role = 'admin' WHERE id = :id"),
                    {"id": user_id},
                )
                changed = True
            if not current_active:
                await db.execute(
                    text("UPDATE users SET is_active = true WHERE id = :id"),
                    {"id": user_id},
                )
                changed = True
            if changed:
                await db.commit()
                print(f"[ADMIN] Синхронизирован: phone={ADMIN_PHONE}")
            else:
                print(f"[ADMIN] OK: phone={ADMIN_PHONE}")
            return

        # 2) Check if there's ANY admin
        admin_res = await db.execute(
            text("SELECT id FROM users WHERE lower(role) = 'admin' LIMIT 1")
        )
        any_admin = admin_res.fetchone()
        if any_admin:
            await db.execute(
                text("UPDATE users SET phone = :phone, password_hash = :h, is_active = true WHERE id = :id"),
                {"phone": ADMIN_PHONE, "h": new_hash, "id": any_admin[0]},
            )
            await db.commit()
            print(f"[ADMIN] Обновлён существующий админ: id={any_admin[0]}, phone={ADMIN_PHONE}")
            return

        # 3) Create admin
        await db.execute(
            text("INSERT INTO users (name, phone, email, password_hash, role, tariff, bonus_points, is_active) "
                 "VALUES (:name, :phone, :email, :hash, 'admin', 'premium', 0, true)"),
            {"name": "Администратор", "phone": ADMIN_PHONE, "email": "admin@agroverse.uz", "hash": new_hash},
        )
        await db.commit()
        print(f"[ADMIN] Создан: phone={ADMIN_PHONE}, password={ADMIN_PASSWORD}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import text

    async with engine.begin() as conn:

        async def safe_exec(sql, params=None, label=None):
            """Выполняет SQL в отдельном SAVEPOINT, чтобы ошибка в одной
            команде не откатывала ВСЮ транзакцию (включая create_all и
            все успешные миграции, выполненные ранее)."""
            try:
                async with conn.begin_nested():
                    await conn.execute(text(sql), params or {})
                if label:
                    print(f"[MIGRATION] {label}: OK")
            except Exception as e:
                if label:
                    print(f"[MIGRATION] {label}: {e}")

        # ── ВРЕМЕННО: полный снос и пересоздание таблиц ──
        # Включается переменной окружения RESET_DB=true в Railway.
        # ОБЯЗАТЕЛЬНО убрать/выключить эту переменную после одного запуска,
        # иначе база будет стираться при КАЖДОМ деплое!
        if os.getenv("RESET_DB") == "true":
            await conn.run_sync(Base.metadata.drop_all)
            print("[RESET_DB] Все таблицы удалены")

        await conn.run_sync(Base.metadata.create_all)

        # ── ВРЕМЕННАЯ ДИАГНОСТИКА: к какой базе реально подключились ──
        try:
            db_info = await conn.execute(text(
                "SELECT current_database(), inet_server_addr()::text"
            ))
            dbname, dbhost = db_info.fetchone()
            print(f"[DEBUG] Подключены к базе: {dbname} @ {dbhost}")
        except Exception as e:
            print(f"[DEBUG] Не удалось получить инфо о базе: {e}")

        try:
            cols = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='products' ORDER BY ordinal_position"
            ))
            col_names = [r[0] for r in cols.fetchall()]
            print(f"[DEBUG] Колонки products СРАЗУ после create_all: {col_names}")
        except Exception as e:
            print(f"[DEBUG] Не удалось получить колонки products: {e}")

        # ── Конвертируем PostgreSQL enum-колонки в VARCHAR ──
        enum_columns = [
            ("users",       "role"),
            ("users",       "tariff"),
            ("products",    "status"),
            ("orders",      "pickup_method"),
            ("orders",      "status"),
        ]
        for table, column in enum_columns:
            async with conn.begin_nested():
                check = await conn.execute(text(
                    "SELECT data_type FROM information_schema.columns "
                    "WHERE table_name=:t AND column_name=:c"
                ), {"t": table, "c": column})
                row = check.fetchone()
            if row and row[0] == "USER-DEFINED":
                await safe_exec(
                    f"ALTER TABLE {table} ALTER COLUMN {column} TYPE VARCHAR(50) USING {column}::text",
                    label=f"{table}.{column} enum→VARCHAR"
                )

        # ── Добавляем колонки, которых не хватает в уже существующих таблицах ──
        missing_columns = [
            ("products", "photos", "JSON DEFAULT '[]'::json"),
            ("products", "certificates", "JSON DEFAULT '[]'::json"),
            ("products", "delivery_available", "BOOLEAN DEFAULT FALSE"),
            ("courier_profiles", "price_per_km", "FLOAT DEFAULT 0"),
            ("orders", "delivery_request_id", "INTEGER"),
        ]
        for table, column, coltype in missing_columns:
            async with conn.begin_nested():
                check = await conn.execute(text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name=:t AND column_name=:c"
                ), {"t": table, "c": column})
                exists = check.fetchone()
            if not exists:
                await safe_exec(
                    f"ALTER TABLE {table} ADD COLUMN {column} {coltype}",
                    label=f"{table}.{column} добавлена"
                )

        # Нормализуем uppercase enum-значения в lowercase
        await safe_exec("UPDATE users SET role = lower(role) WHERE role ~ '[A-Z]'")
        await safe_exec("UPDATE users SET tariff = lower(tariff) WHERE tariff ~ '[A-Z]'")
        await safe_exec("UPDATE products SET status = lower(status) WHERE status ~ '[A-Z]'")
        await safe_exec("UPDATE orders SET pickup_method = lower(pickup_method) WHERE pickup_method ~ '[A-Z]'")
        await safe_exec("UPDATE orders SET status = lower(status) WHERE status ~ '[A-Z]'")

        # Удаляем старые enum-типы PostgreSQL
        await safe_exec("""
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT typname FROM pg_type WHERE typtype = 'e'
             AND typname IN ('userrole','usertariff','productstatus','orderstatus','pickupmethod') LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(t.typname) || ' CASCADE';
    END LOOP;
END $$;
        """)

        # ── Миграция из легаси main.py (если таблица создана монолитом) ──
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT")
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)")
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
        # Копируем password → password_hash, только если такая legacy-колонка вообще есть
        await safe_exec("""
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
        UPDATE users SET password_hash = password WHERE password_hash IS NULL OR password_hash = '';
    END IF;
END $$;
        """)
        # Конвертируем is_blocked → is_active, только если такая legacy-колонка есть
        await safe_exec("""
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_blocked') THEN
        UPDATE users SET is_active = (is_blocked::text != 'true') WHERE is_active IS NULL;
    END IF;
END $$;
        """)
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS tariff VARCHAR(20) DEFAULT 'standart'")
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0")
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0")
        await safe_exec("ALTER TABLE users ALTER COLUMN wallet_balance SET DEFAULT 0")
        await safe_exec("UPDATE users SET wallet_balance = 0 WHERE wallet_balance IS NULL")

        # ── Новые колонки: city и plain_password ──
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)")
        await safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(255)")

        # ── DeliveryRequest: rating columns ──
        await safe_exec("ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS buyer_rating INTEGER")
        await safe_exec("ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS buyer_comment TEXT")

        # ── Delivery Requests table ──
        await safe_exec("""
CREATE TABLE IF NOT EXISTS delivery_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    courier_id INTEGER REFERENCES users(id),
    buyer_id INTEGER REFERENCES users(id),
    route_from VARCHAR(200) DEFAULT '',
    route_to VARCHAR(200) DEFAULT '',
    distance_km FLOAT DEFAULT 0,
    price_per_km FLOAT DEFAULT 0,
    total_price FLOAT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending',
    buyer_confirmed_disclaimer BOOLEAN DEFAULT FALSE,
    driver_confirmed_disclaimer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
)
""", label="delivery_requests table")

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
            status=product.status, delivery_available=product.delivery_available or False,
            created_at=product.created_at,
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
    from sqlalchemy import text
    from app.auth import verify_password
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT id, phone, name, is_active, password_hash FROM users WHERE lower(role) = 'admin'")
        )
        rows = result.fetchall()

        admin_list = []
        for row in rows:
            password_works = verify_password(ADMIN_PASSWORD, row[4])
            admin_list.append({
                "id": row[0],
                "phone": row[1],
                "name": row[2],
                "is_active": row[3],
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
    from sqlalchemy import text
    from app.auth import get_password_hash
    async with AsyncSessionLocal() as db:
        new_hash = get_password_hash(ADMIN_PASSWORD)

        result = await db.execute(
            text("SELECT id FROM users WHERE phone = :phone"),
            {"phone": ADMIN_PHONE},
        )
        admin = result.fetchone()

        if admin:
            await db.execute(
                text("UPDATE users SET password_hash = :h, is_active = true, role = 'admin' WHERE id = :id"),
                {"h": new_hash, "id": admin[0]},
            )
            await db.commit()
            return {"ok": True, "message": f"Admin password reset for phone {ADMIN_PHONE}"}

        result2 = await db.execute(
            text("SELECT id FROM users WHERE lower(role) = 'admin' LIMIT 1")
        )
        any_admin = result2.fetchone()
        if any_admin:
            await db.execute(
                text("UPDATE users SET phone = :phone, password_hash = :h, is_active = true WHERE id = :id"),
                {"phone": ADMIN_PHONE, "h": new_hash, "id": any_admin[0]},
            )
            await db.commit()
            return {"ok": True, "message": f"Admin updated: id={any_admin[0]}, phone={ADMIN_PHONE}"}

        await db.execute(
            text("INSERT INTO users (name, phone, email, password_hash, role, tariff, bonus_points, is_active) "
                 "VALUES (:name, :phone, :email, :hash, 'admin', 'premium', 0, true)"),
            {"name": "Администратор", "phone": ADMIN_PHONE, "email": "admin@agroverse.uz", "hash": new_hash},
        )
        await db.commit()
        return {"ok": True, "message": f"Admin created: phone={ADMIN_PHONE}"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)