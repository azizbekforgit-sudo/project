from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import os
import bcrypt

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, select

# ─── Database setup ───────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:lRrjQszvnZZlqeQirdiiKzyXfteFgoIM@postgres.railway.internal:5432/railway"
).replace("postgresql://", "postgresql+asyncpg://").replace("postgres://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# ─── Models ───────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(100))
    phone        = Column(String(20), unique=True, index=True)
    email        = Column(String(100))
    password     = Column(String(200))
    role         = Column(String(20), default="xaridor")
    token        = Column(String(100))
    is_blocked   = Column(String(5), default="false")
    block_reason = Column(Text, default="")
    created_at   = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id                 = Column(Integer, primary_key=True, index=True)
    fermer_id          = Column(Integer)
    fermer_name        = Column(String(100))
    title              = Column(String(200))
    description        = Column(Text)
    category           = Column(String(100))
    price_per_unit     = Column(Float)
    unit               = Column(String(20))
    quantity_available = Column(Integer)
    status             = Column(String(20), default="pending")
    rating             = Column(Float, default=0)
    created_at         = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id         = Column(Integer, primary_key=True, index=True)
    buyer_id   = Column(Integer)
    product_id = Column(Integer)
    quantity   = Column(Integer)
    status     = Column(String(20), default="created")
    created_at = Column(DateTime, default=datetime.utcnow)

# ─── App ──────────────────────────────────────────────────────
app = FastAPI(title="AgroVerse API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agroverse-production-4c57.up.railway.app",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# ─── Pydantic schemas ─────────────────────────────────────────
class LoginRequest(BaseModel):
    phone: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    email: str = ""
    role: str = "xaridor"

class CreateProductRequest(BaseModel):
    title: str
    description: str = ""
    category: str = ""
    price_per_unit: float
    unit: str = "kg"
    quantity_available: int

class CreateOrderRequest(BaseModel):
    product_id: int
    quantity: int

class BlockRequest(BaseModel):
    reason: str = ""

# ─── DB session ───────────────────────────────────────────────
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ─── Auth helpers ─────────────────────────────────────────────
async def get_current_user(authorization: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    result = await db.execute(select(User).where(User.token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user.is_blocked == "true":
        raise HTTPException(status_code=403, detail={"blocked": True, "reason": user.block_reason})
    return user

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

# ─── Startup ──────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.phone == "+998000000000"))
        if not result.scalar_one_or_none():
            hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
            db.add(User(name="Admin", phone="+998000000000", email="admin@agroverse.uz",
                        password=hashed, role="admin", token=str(uuid.uuid4())))
            await db.commit()
            print("✅ Admin: +998000000000 / admin123")
    print("🌾 AgroVerse API v3.0 — PostgreSQL connected")

# ─── Root ─────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "🌾 AgroVerse API", "version": "3.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ─── AUTH ─────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == data.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone already registered")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    token = str(uuid.uuid4())
    user = User(name=data.name, phone=data.phone, email=data.email,
                password=hashed, role=data.role, token=token)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"access_token": token, "refresh_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": user.name, "phone": user.phone, "email": user.email, "role": user.role}}

@app.post("/api/auth/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()
    if not user or not bcrypt.checkpw(data.password.encode(), user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.is_blocked == "true":
        raise HTTPException(status_code=403, detail={"blocked": True, "reason": user.block_reason})
    return {"access_token": user.token, "refresh_token": user.token, "token_type": "bearer",
            "user": {"id": user.id, "name": user.name, "phone": user.phone, "email": user.email, "role": user.role}}

@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "phone": current_user.phone,
            "email": current_user.email, "role": current_user.role}

@app.patch("/api/auth/me")
async def update_profile(body: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if "name" in body: current_user.name = body["name"]
    if "email" in body: current_user.email = body["email"]
    await db.commit()
    await db.refresh(current_user)
    return {"id": current_user.id, "name": current_user.name, "phone": current_user.phone,
            "email": current_user.email, "role": current_user.role}

# ─── PRODUCTS ─────────────────────────────────────────────────
@app.get("/api/products/")
async def get_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.status == "active"))
    products = result.scalars().all()
    def fmt(p):
        d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        d.pop("_sa_instance_state", None)
        return d
    return {"total": len(products), "page": 1, "limit": 100, "products": [fmt(p) for p in products]}

@app.get("/api/products/{product_id}")
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {c.name: getattr(product, c.name) for c in product.__table__.columns}

@app.post("/api/products/")
async def create_product(data: CreateProductRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    product = Product(fermer_id=current_user.id, fermer_name=current_user.name,
                      title=data.title, description=data.description, category=data.category,
                      price_per_unit=data.price_per_unit, unit=data.unit,
                      quantity_available=data.quantity_available,
                      status="pending" if current_user.role == "fermer" else "active")
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return {c.name: getattr(product, c.name) for c in product.__table__.columns}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    return {"ok": True}

# ─── ORDERS ───────────────────────────────────────────────────
@app.get("/api/orders/my")
async def get_my_orders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.buyer_id == current_user.id))
    orders = result.scalars().all()
    return {"orders": [{c.name: getattr(o, c.name) for c in o.__table__.columns} for o in orders]}

@app.post("/api/orders/")
async def create_order(data: CreateOrderRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    order = Order(buyer_id=current_user.id, product_id=data.product_id, quantity=data.quantity)
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return {c.name: getattr(order, c.name) for c in order.__table__.columns}

@app.patch("/api/orders/{order_id}/cancel")
async def cancel_order(order_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    order.status = "cancelled"
    await db.commit()
    return {"ok": True}

@app.patch("/api/orders/{order_id}/complete")
async def complete_order(order_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    order.status = "completed"
    await db.commit()
    return {"ok": True}

@app.patch("/api/orders/{order_id}/ready")
async def mark_ready(order_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    order.status = "ready"
    await db.commit()
    return {"ok": True}

# ─── WALLET ───────────────────────────────────────────────────
@app.get("/api/payment/wallet")
async def get_wallet(current_user: User = Depends(get_current_user)):
    return {"balance": 0, "currency": "UZS"}

# ─── ADMIN ────────────────────────────────────────────────────
@app.get("/api/admin/users")
async def admin_get_users(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return {"users": [{"id": u.id, "name": u.name, "phone": u.phone, "email": u.email,
                        "role": u.role, "is_blocked": u.is_blocked} for u in users]}

@app.patch("/api/admin/users/{user_id}/block")
async def admin_block_user(user_id: int, body: BlockRequest, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = "true"
    user.block_reason = body.reason
    await db.commit()
    return {"ok": True}

@app.patch("/api/admin/users/{user_id}/unblock")
async def admin_unblock_user(user_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = "false"
    user.block_reason = ""
    await db.commit()
    return {"ok": True}

@app.get("/api/admin/products/pending")
async def admin_pending_products(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.status == "pending"))
    products = result.scalars().all()
    return {"products": [{c.name: getattr(p, c.name) for c in p.__table__.columns} for p in products]}

@app.patch("/api/admin/products/{product_id}/approve")
async def admin_approve_product(product_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product: raise HTTPException(status_code=404, detail="Product not found")
    product.status = "active"
    await db.commit()
    return {"ok": True}

@app.patch("/api/admin/products/{product_id}/reject")
async def admin_reject_product(product_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product: raise HTTPException(status_code=404, detail="Product not found")
    product.status = "rejected"
    await db.commit()
    return {"ok": True}

@app.get("/api/admin/reports/orders")
async def admin_orders_report(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order))
    orders = result.scalars().all()
    return {"total": len(orders), "orders": [{c.name: getattr(o, c.name) for c in o.__table__.columns} for o in orders]}

@app.get("/api/admin/reports/revenue")
async def admin_revenue_report(admin: User = Depends(get_admin_user)):
    return {"total_revenue": 0, "currency": "UZS"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)