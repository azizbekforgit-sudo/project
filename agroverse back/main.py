from fastapi import FastAPI, HTTPException, Header, Depends, Form, File, UploadFile
from typing import Optional, List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
    allow_origins=["*"],
    allow_credentials=False,
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

# Форсированный CORS для всех ответов (включая ошибки)
@app.middleware("http")
async def add_cors_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

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
async def create_product(
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form(""),
    price_per_unit: float = Form(...),
    unit: str = Form("kg"),
    quantity_available: float = Form(...),
    photos: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    product = Product(
        fermer_id=current_user.id,
        fermer_name=current_user.name,
        title=title,
        description=description,
        category=category,
        price_per_unit=price_per_unit,
        unit=unit,
        quantity_available=int(quantity_available),
        status="pending" if current_user.role == "fermer" else "active"
    )
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

# ─── COURIER MODEL ────────────────────────────────────────────
from sqlalchemy import Boolean

class CourierProfile(Base):
    __tablename__ = "courier_profiles"
    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, unique=True, index=True)
    full_name        = Column(String(200), default="")
    phone            = Column(String(30), default="")
    transport_type   = Column(String(50), default="")
    max_weight       = Column(Integer, default=5000)
    has_thermo_bag   = Column(String(5), default="false")
    experience_years = Column(Integer, default=0)
    city             = Column(String(100), default="")
    radius_km        = Column(Integer, default=50)
    work_mode        = Column(String(30), default="flexible")
    work_hours       = Column(String(30), default="08:00-20:00")
    vehicle_number   = Column(String(50), default="")
    bio              = Column(Text, default="")
    admin_approved   = Column(String(5), default="false")
    rating           = Column(Float, default=5.0)
    balance          = Column(Float, default=0.0)
    status           = Column(String(20), default="offline")
    lat              = Column(Float, default=0.0)
    lng              = Column(Float, default=0.0)
    created_at       = Column(DateTime, default=datetime.utcnow)

class CourierOrder(Base):
    __tablename__ = "courier_orders"
    id                = Column(Integer, primary_key=True, index=True)
    courier_id        = Column(Integer, index=True, default=0)
    cargo             = Column(String(200), default="")
    cargo_description = Column(Text, default="")
    pickup_address    = Column(String(300), default="")
    delivery_address  = Column(String(300), default="")
    distance_km       = Column(Float, default=0)
    weight_kg         = Column(Float, default=0)
    price             = Column(Float, default=0)
    status            = Column(String(30), default="available")
    pickup_lat        = Column(Float, default=0)
    pickup_lng        = Column(Float, default=0)
    created_at        = Column(DateTime, default=datetime.utcnow)

class CourierTransaction(Base):
    __tablename__ = "courier_transactions"
    id         = Column(Integer, primary_key=True, index=True)
    courier_id = Column(Integer, index=True)
    amount     = Column(Float, default=0)
    type       = Column(String(20), default="income")
    desc       = Column(String(200), default="")
    method     = Column(String(50), default="")
    status     = Column(String(30), default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)

# ─── COURIER SCHEMAS ──────────────────────────────────────────
class CourierProfileSetup(BaseModel):
    transport_type:   str
    max_weight:       int = 5000
    has_thermo_bag:   bool = False
    experience_years: int = 0
    city:             str = ""
    radius_km:        int = 50
    work_mode:        str = "flexible"
    work_hours:       str = "08:00-20:00"
    full_name:        str = ""
    phone:            str = ""
    vehicle_number:   str = ""
    bio:              str = ""

class CourierStatusUpdate(BaseModel):
    status: str
    lat: float = 0.0
    lng: float = 0.0

class WithdrawRequest(BaseModel):
    amount: float
    method: str = "click"

class AIChatRequest(BaseModel):
    message: str

# ─── COURIER ENDPOINTS ────────────────────────────────────────

@app.get("/api/courier/profile")
async def get_courier_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": profile.full_name,
        "phone": profile.phone,
        "transport_type": profile.transport_type,
        "max_weight": profile.max_weight,
        "has_thermo_bag": profile.has_thermo_bag == "true",
        "experience_years": profile.experience_years,
        "city": profile.city,
        "radius_km": profile.radius_km,
        "work_mode": profile.work_mode,
        "work_hours": profile.work_hours,
        "vehicle_number": profile.vehicle_number,
        "bio": profile.bio,
        "admin_approved": profile.admin_approved == "true",
        "rating": profile.rating,
        "balance": profile.balance,
        "status": profile.status,
    }

@app.post("/api/courier/profile/setup")
async def setup_courier_profile(data: CourierProfileSetup, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if profile:
        profile.transport_type   = data.transport_type
        profile.max_weight       = data.max_weight
        profile.has_thermo_bag   = "true" if data.has_thermo_bag else "false"
        profile.experience_years = data.experience_years
        profile.city             = data.city
        profile.radius_km        = data.radius_km
        profile.work_mode        = data.work_mode
        profile.work_hours       = data.work_hours
        profile.full_name        = data.full_name
        profile.phone            = data.phone
        profile.vehicle_number   = data.vehicle_number
        profile.bio              = data.bio
    else:
        profile = CourierProfile(
            user_id=current_user.id,
            transport_type=data.transport_type,
            max_weight=data.max_weight,
            has_thermo_bag="true" if data.has_thermo_bag else "false",
            experience_years=data.experience_years,
            city=data.city,
            radius_km=data.radius_km,
            work_mode=data.work_mode,
            work_hours=data.work_hours,
            full_name=data.full_name,
            phone=data.phone,
            vehicle_number=data.vehicle_number,
            bio=data.bio,
            admin_approved="false",
        )
        db.add(profile)
    current_user.role = "courier"
    await db.commit()
    return {"ok": True, "message": "Profile submitted for review"}

@app.put("/api/courier/status")
async def update_courier_status(data: CourierStatusUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.status = data.status
    profile.lat = data.lat
    profile.lng = data.lng
    await db.commit()
    return {"ok": True}

@app.get("/api/courier/orders")
async def get_courier_orders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierOrder).where(CourierOrder.courier_id == current_user.id))
    orders = result.scalars().all()
    return [{c.name: getattr(o, c.name) for c in o.__table__.columns} for o in orders]

@app.get("/api/delivery/available-orders")
async def get_available_orders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierOrder).where(CourierOrder.status == "available"))
    orders = result.scalars().all()
    return [{c.name: getattr(o, c.name) for c in o.__table__.columns} for o in orders]

@app.post("/api/delivery/orders/{order_id}/accept")
async def accept_delivery_order(order_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierOrder).where(CourierOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.courier_id = current_user.id
    order.status = "accepted"
    await db.commit()
    return {"ok": True}

@app.put("/api/delivery/orders/{order_id}/status")
async def update_delivery_order_status(order_id: int, body: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierOrder).where(CourierOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = body.get("status", order.status)
    await db.commit()
    return {"ok": True}

@app.get("/api/delivery/calculate")
async def calculate_delivery_price(transport: str, distance_km: float, weight_kg: float, current_user: User = Depends(get_current_user)):
    price = 5000 + distance_km * 500 + weight_kg * 10
    return {"price": round(price), "currency": "UZS"}

@app.get("/api/courier/wallet")
async def get_courier_wallet(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    balance = profile.balance if profile else 0
    tx_result = await db.execute(select(CourierTransaction).where(CourierTransaction.courier_id == current_user.id))
    transactions = tx_result.scalars().all()
    return {
        "balance": balance,
        "history": [{c.name: getattr(t, c.name) for c in t.__table__.columns} for t in transactions]
    }

@app.post("/api/courier/wallet/withdraw")
async def withdraw_courier_wallet(data: WithdrawRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile.balance < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    profile.balance -= data.amount
    tx = CourierTransaction(courier_id=current_user.id, amount=data.amount, type="outcome",
                            desc="Вывод средств", method=data.method, status="pending")
    db.add(tx)
    await db.commit()
    return {"ok": True}

@app.post("/api/courier/ai/chat")
async def courier_ai_chat(data: AIChatRequest, current_user: User = Depends(get_current_user)):
    msg = data.message.lower()
    if any(w in msg for w in ["маршрут", "куда", "откуда", "дорога"]):
        reply = "Для оптимального маршрута используйте карту в разделе 'Карта' 🗺️"
    elif any(w in msg for w in ["цена", "стоимость", "сколько", "тариф"]):
        reply = "Стоимость: 5000 сум базовая + 500 сум/км + 10 сум/кг. Используйте калькулятор в разделе 'Тарифы' 💰"
    elif any(w in msg for w in ["заказ", "груз", "доставка"]):
        reply = "Доступные заказы в разделе 'Заказы' → 'Доступные' 📦"
    elif any(w in msg for w in ["кошелёк", "баланс", "вывод", "деньги"]):
        reply = "Вывод доступен через Click или Payme в разделе 'Кошелёк' 💳"
    else:
        reply = "Могу помочь с маршрутами, стоимостью доставки и заказами. Спросите что-нибудь конкретное! 🚛"
    return {"reply": reply}

# ─── ADMIN COURIER ENDPOINTS ──────────────────────────────────

@app.get("/api/admin/couriers")
async def admin_get_couriers(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile))
    profiles = result.scalars().all()
    return {"couriers": [{c.name: getattr(p, c.name) for c in p.__table__.columns} for p in profiles]}

@app.patch("/api/admin/couriers/{profile_id}/approve")
async def admin_approve_courier(profile_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Not found")
    profile.admin_approved = "true"
    await db.commit()
    return {"ok": True}

@app.patch("/api/admin/couriers/{profile_id}/reject")
async def admin_reject_courier(profile_id: int, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CourierProfile).where(CourierProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Not found")
    profile.admin_approved = "false"
    await db.commit()
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
