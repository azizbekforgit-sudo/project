"""
delivery.py — Модуль доставки AgroVerse (БД версия)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.dependencies import get_current_user
from app.models import User, CourierProfile, CourierOrder, CourierTransaction, CourierRatingEntry
from pydantic import BaseModel
from typing import Optional
import math
import httpx
import os

router = APIRouter(prefix="/api", tags=["delivery"])

async def get_db():
    async with AsyncSessionLocal() as s:
        yield s

# ─── Schemas ──────────────────────────────────────────────────

class CourierProfileSetup(BaseModel):
    transport_type:   str
    max_weight:       float = 5000
    has_thermo_bag:   bool = False
    experience_years: int = 0
    city:             str
    radius_km:        float = 50
    work_mode:        str = "flexible"
    work_hours:       str = "08:00-20:00"
    full_name:        str
    phone:            str
    vehicle_number:   Optional[str] = None
    bio:              Optional[str] = None
    photo_url:        Optional[str] = None

class CourierStatusUpdate(BaseModel):
    status: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class DeliveryOrderCreate(BaseModel):
    courier_id:       int
    pickup_address:   str
    delivery_address: str
    pickup_lat:       float
    pickup_lng:       float
    delivery_lat:     float
    delivery_lng:     float
    cargo_description: str
    weight_kg:        float
    scheduled_time:   Optional[str] = None

class DeliveryStatusUpdate(BaseModel):
    status: str

class CourierRatingSchema(BaseModel):
    rating:  int
    comment: Optional[str] = None

class WalletWithdraw(BaseModel):
    amount: float
    method: str = "click"

class AIChatMessage(BaseModel):
    message: str

# ─── Utils ────────────────────────────────────────────────────

TARIFFS = {
    "moto":  {"base": 8000,  "per_km": 900,  "extra_weight": 1000},
    "car":   {"base": 12000, "per_km": 1200, "extra_weight": 2000},
    "truck": {"base": 25000, "per_km": 2000, "extra_weight": 0},
    # Грузовые типы из фронтенда
    "fura":      {"base": 30000, "per_km": 2500, "extra_weight": 0},
    "refrig":    {"base": 28000, "per_km": 2200, "extra_weight": 0},
    "tentovan":  {"base": 27000, "per_km": 2100, "extra_weight": 0},
    "samosval":  {"base": 32000, "per_km": 2800, "extra_weight": 0},
    "bortovoy":  {"base": 22000, "per_km": 1800, "extra_weight": 0},
}

def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def calc_price(transport: str, distance_km: float, weight_kg: float) -> int:
    t = TARIFFS.get(transport, TARIFFS["car"])
    price = t["base"] + t["per_km"] * distance_km
    if weight_kg > 10 and t.get("extra_weight"):
        price += t["extra_weight"] * math.ceil((weight_kg - 10) / 5)
    return int(price)

def profile_to_dict(p: CourierProfile) -> dict:
    return {
        "id": p.id,
        "user_id": p.user_id,
        "full_name": p.full_name,
        "phone": p.phone,
        "transport_type": p.transport_type,
        "max_weight": p.max_weight,
        "has_thermo_bag": p.has_thermo_bag,
        "experience_years": p.experience_years,
        "city": p.city,
        "radius_km": p.radius_km,
        "work_mode": p.work_mode,
        "work_hours": p.work_hours,
        "vehicle_number": p.vehicle_number,
        "bio": p.bio,
        "photo_url": p.photo_url,
        "admin_approved": p.admin_approved,
        "rating": p.rating,
        "balance": p.balance,
        "status": p.status,
        "lat": p.lat,
        "lng": p.lng,
    }

def order_to_dict(o: CourierOrder) -> dict:
    return {
        "id": o.id,
        "courier_id": o.courier_id,
        "client_id": o.client_id,
        "cargo": o.cargo,
        "cargo_description": o.cargo_description,
        "pickup_address": o.pickup_address,
        "delivery_address": o.delivery_address,
        "pickup_lat": o.pickup_lat,
        "pickup_lng": o.pickup_lng,
        "delivery_lat": o.delivery_lat,
        "delivery_lng": o.delivery_lng,
        "distance_km": o.distance_km,
        "weight_kg": o.weight_kg,
        "price": o.price,
        "status": o.status,
        "scheduled_time": o.scheduled_time,
    }

# ─── 1. Профиль курьера ───────────────────────────────────────

@router.post("/courier/profile/setup")
async def setup_courier_profile(
    data: CourierProfileSetup,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()

    if profile:
        profile.transport_type   = data.transport_type
        profile.max_weight       = data.max_weight
        profile.has_thermo_bag   = data.has_thermo_bag
        profile.experience_years = data.experience_years
        profile.city             = data.city
        profile.radius_km        = data.radius_km
        profile.work_mode        = data.work_mode
        profile.work_hours       = data.work_hours
        profile.full_name        = data.full_name
        profile.phone            = data.phone
        profile.vehicle_number   = data.vehicle_number or ""
        profile.bio              = data.bio or ""
        profile.photo_url        = data.photo_url
    else:
        profile = CourierProfile(
            user_id=current_user.id,
            transport_type=data.transport_type,
            max_weight=data.max_weight,
            has_thermo_bag=data.has_thermo_bag,
            experience_years=data.experience_years,
            city=data.city,
            radius_km=data.radius_km,
            work_mode=data.work_mode,
            work_hours=data.work_hours,
            full_name=data.full_name,
            phone=data.phone,
            vehicle_number=data.vehicle_number or "",
            bio=data.bio or "",
            photo_url=data.photo_url,
            admin_approved=False,
        )
        db.add(profile)

    # Меняем роль на courier
    from app.models import UserRole as _UR
    current_user.role = _UR.COURIER
    await db.commit()
    return {"ok": True, "message": "Профиль курьера сохранён, ожидайте одобрения администратора"}


@router.get("/courier/profile")
async def get_courier_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Профиль не найден")
    return profile_to_dict(profile)

# ─── 2. Статус курьера ────────────────────────────────────────

@router.put("/courier/status")
async def update_courier_status(
    data: CourierStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Профиль не найден")
    profile.status = data.status
    if data.lat is not None:
        profile.lat = data.lat
    if data.lng is not None:
        profile.lng = data.lng
    await db.commit()
    return {"ok": True, "status": data.status}

# ─── 3. Поиск курьеров поблизости ────────────────────────────

@router.get("/delivery/couriers/nearby")
async def couriers_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(10),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CourierProfile).where(
            CourierProfile.admin_approved == True,
            CourierProfile.status != "offline"
        )
    )
    profiles = result.scalars().all()
    out = []
    for p in profiles:
        dist = haversine(lat, lng, p.lat or 0, p.lng or 0) if (p.lat and p.lng) else 0
        if dist > radius:
            continue
        t = TARIFFS.get(p.transport_type, TARIFFS["car"])
        out.append({
            **profile_to_dict(p),
            "distance_km": round(dist, 1),
            "est_price": int(t["base"] + t["per_km"] * max(dist, 1)),
        })
    out.sort(key=lambda x: x["distance_km"])
    return out

# ─── 4. Создание заявки ───────────────────────────────────────

@router.post("/delivery/orders")
async def create_delivery_order(
    data: DeliveryOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dist = haversine(data.pickup_lat, data.pickup_lng, data.delivery_lat, data.delivery_lng)

    # Узнать транспорт курьера
    cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == data.courier_id))
    cp = cp_res.scalar_one_or_none()
    transport = cp.transport_type if cp else "car"
    price = calc_price(transport, dist, data.weight_kg)

    order = CourierOrder(
        courier_id=data.courier_id,
        client_id=current_user.id,
        cargo=data.cargo_description,
        cargo_description=data.cargo_description,
        pickup_address=data.pickup_address,
        delivery_address=data.delivery_address,
        pickup_lat=data.pickup_lat,
        pickup_lng=data.pickup_lng,
        delivery_lat=data.delivery_lat,
        delivery_lng=data.delivery_lng,
        distance_km=round(dist, 1),
        weight_kg=data.weight_kg,
        price=price,
        status="pending",
        scheduled_time=data.scheduled_time,
    )
    db.add(order)

    if cp:
        cp.status = "busy"

    await db.commit()
    await db.refresh(order)
    return {"ok": True, "order": order_to_dict(order)}

# ─── 5. Принять / обновить статус заявки ─────────────────────

@router.post("/delivery/orders/{order_id}/accept")
async def accept_delivery_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CourierOrder).where(CourierOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    order.courier_id = current_user.id
    order.status = "accepted"
    await db.commit()
    return {"ok": True, "order": order_to_dict(order)}


@router.put("/delivery/orders/{order_id}/status")
async def update_delivery_order_status(
    order_id: int,
    data: DeliveryStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CourierOrder).where(CourierOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    order.status = data.status

    if data.status == "delivered":
        # Зачислить на кошелёк
        cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == order.courier_id))
        cp = cp_res.scalar_one_or_none()
        if cp:
            cp.balance += order.price
            cp.status = "online"
        tx = CourierTransaction(
            courier_id=order.courier_id,
            amount=order.price,
            type="income",
            desc=f"Доставка #{order_id}",
            status="completed",
        )
        db.add(tx)

    await db.commit()
    return {"ok": True, "order": order_to_dict(order)}

# ─── 6. Рейтинг ──────────────────────────────────────────────

@router.post("/couriers/{courier_id}/rate")
async def rate_courier(
    courier_id: int,
    data: CourierRatingSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(400, "Рейтинг 1–5")

    entry = CourierRatingEntry(
        courier_id=courier_id,
        from_id=current_user.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(entry)

    # Пересчитать средний рейтинг
    res = await db.execute(
        select(func.avg(CourierRatingEntry.rating)).where(CourierRatingEntry.courier_id == courier_id)
    )
    avg = round(float(res.scalar() or 5.0), 1)

    cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == courier_id))
    cp = cp_res.scalar_one_or_none()
    if cp:
        cp.rating = avg

    await db.commit()
    return {"ok": True, "new_avg": avg}

# ─── 7. Кошелёк ──────────────────────────────────────────────

@router.get("/courier/wallet")
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    cp = cp_res.scalar_one_or_none()
    balance = cp.balance if cp else 0

    tx_res = await db.execute(
        select(CourierTransaction).where(CourierTransaction.courier_id == current_user.id)
        .order_by(CourierTransaction.created_at.desc()).limit(30)
    )
    txs = tx_res.scalars().all()
    return {
        "balance": balance,
        "history": [
            {"id": t.id, "amount": t.amount, "type": t.type,
             "desc": t.desc, "method": t.method, "status": t.status}
            for t in txs
        ]
    }


@router.post("/courier/wallet/withdraw")
async def wallet_withdraw(
    data: WalletWithdraw,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == current_user.id))
    cp = cp_res.scalar_one_or_none()
    if not cp:
        raise HTTPException(404, "Профиль не найден")
    if cp.balance < data.amount:
        raise HTTPException(400, "Недостаточно средств")

    cp.balance -= data.amount
    tx = CourierTransaction(
        courier_id=current_user.id,
        amount=data.amount,
        type="outcome",
        desc="Вывод средств",
        method=data.method,
        status="processing",
    )
    db.add(tx)
    await db.commit()
    return {"ok": True, "new_balance": cp.balance}

# ─── 8. ИИ-помощник ──────────────────────────────────────────

@router.post("/courier/ai/chat")
async def courier_ai_chat(
    data: AIChatMessage,
    current_user: User = Depends(get_current_user),
):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        msg = data.message.lower()
        if any(w in msg for w in ["маршрут", "куда", "дорога"]):
            reply = "Для маршрута используйте раздел 'Карта' 🗺️"
        elif any(w in msg for w in ["цена", "стоимость", "тариф"]):
            reply = "Стоимость: база + 900–2500 сум/км в зависимости от транспорта 💰"
        elif any(w in msg for w in ["заказ", "груз"]):
            reply = "Доступные заказы в разделе 'Заказы' → 'Доступные' 📦"
        else:
            reply = "Помогу с маршрутами, тарифами и заказами. Спросите конкретнее! 🚛"
        return {"reply": reply}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-6",
                    "max_tokens": 512,
                    "system": "Ты — ИИ-помощник курьера AgroVerse. Помогаешь с маршрутами, заказами и заработком. Отвечай кратко на русском.",
                    "messages": [{"role": "user", "content": data.message}],
                }
            )
            r = resp.json()
            reply = r.get("content", [{}])[0].get("text", "Ошибка ответа")
            return {"reply": reply}
    except Exception as e:
        return {"reply": f"Ошибка связи: {str(e)}"}

# ─── 9. Тарифы и калькулятор ─────────────────────────────────

@router.get("/delivery/tariffs")
async def get_tariffs():
    return TARIFFS

@router.get("/delivery/calculate")
async def calculate_price(
    transport: str = Query("car"),
    distance_km: float = Query(...),
    weight_kg: float = Query(0),
):
    price = calc_price(transport, distance_km, weight_kg)
    return {"price": price, "transport": transport, "distance_km": distance_km, "weight_kg": weight_kg}

# ─── 10. Заявки курьера ──────────────────────────────────────

@router.get("/courier/orders")
async def get_courier_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CourierOrder).where(CourierOrder.courier_id == current_user.id)
        .order_by(CourierOrder.id.desc())
    )
    return [order_to_dict(o) for o in result.scalars().all()]


@router.get("/delivery/available-orders")
async def get_available_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CourierOrder).where(CourierOrder.status == "pending")
    )
    return [order_to_dict(o) for o in result.scalars().all()]

# ─── 11. Админ: одобрить/отклонить курьера ───────────────────

@router.get("/admin/couriers/pending")
async def get_pending_couriers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models import UserRole as _UR
    if current_user.role != _UR.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.admin_approved == False))
    return [profile_to_dict(p) for p in result.scalars().all()]


@router.post("/admin/couriers/{courier_id}/approve")
async def approve_courier(
    courier_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models import UserRole as _UR
    if current_user.role != _UR.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == courier_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    profile.admin_approved = True
    await db.commit()
    return {"ok": True}


@router.post("/admin/couriers/{courier_id}/reject")
async def reject_courier(
    courier_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models import UserRole as _UR
    if current_user.role != _UR.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == courier_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    profile.admin_approved = False
    await db.commit()
    return {"ok": True}