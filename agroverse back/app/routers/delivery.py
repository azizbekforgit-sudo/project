"""
delivery.py — Модуль доставки AgroVerse (Полная исправленная версия)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, CourierProfile, CourierOrder, CourierTransaction, CourierRatingEntry, UserRole
from pydantic import BaseModel
from typing import Optional, List
import math
import httpx
import os

router = APIRouter(prefix="/api", tags=["delivery"])

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
    license_info:     Optional[str] = None
    bio:              Optional[str] = None
    photo_url:        Optional[str] = None
    documents:        Optional[list] = []
    route_from:       Optional[str] = ""
    route_to:         Optional[str] = ""
    route_anywhere:   bool = False
    address:          Optional[str] = ""
    price_per_km:     Optional[float] = 0.0

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

# ─── Твои Тарифы (Фикс из "исправленного" варианта) ────────────────────────────────

TARIFFS = {
    "moto":      {"base": 8000,  "per_km": 900,  "extra_weight": 1000},
    "car":       {"base": 12000, "per_km": 1200, "extra_weight": 2000},
    "truck":     {"base": 25000, "per_km": 2000, "extra_weight": 0},
    "fura":      {"base": 40000, "per_km": 3000, "extra_weight": 0},
    "refrig":    {"base": 35000, "per_km": 2800, "extra_weight": 0},
    "tentovan":  {"base": 30000, "per_km": 2500, "extra_weight": 0},
    "samosval":  {"base": 38000, "per_km": 3200, "extra_weight": 0},
    "bortovoy":  {"base": 25000, "per_km": 2000, "extra_weight": 0},
}

# ─── Utils ────────────────────────────────────────────────────

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
        "license_info": p.license_info,
        "bio": p.bio,
        "photo_url": p.photo_url,
        "documents": p.documents,
        "admin_approved": p.admin_approved,
        "rejection_reason": p.rejection_reason,
        "rating": p.rating,
        "balance": p.balance,
        "status": p.status,
        "lat": p.lat,
        "lng": p.lng,
        "route_from": p.route_from,
        "route_to": p.route_to,
        "route_anywhere": p.route_anywhere,
        "address": p.address,
        "price_per_km": p.price_per_km,
        "total_deliveries": p.total_deliveries,
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
        profile.license_info     = data.license_info or ""
        profile.bio              = data.bio or ""
        profile.photo_url        = data.photo_url
        profile.documents        = data.documents or []
        profile.route_from       = data.route_from or ""
        profile.route_to         = data.route_to or ""
        profile.route_anywhere   = data.route_anywhere
        profile.address          = data.address or ""
        profile.price_per_km     = data.price_per_km or 0.0
        profile.admin_approved   = False
        profile.rejection_reason = None
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
            license_info=data.license_info or "",
            bio=data.bio or "",
            photo_url=data.photo_url,
            documents=data.documents or [],
            route_from=data.route_from or "",
            route_to=data.route_to or "",
            route_anywhere=data.route_anywhere,
            address=data.address or "",
            price_per_km=data.price_per_km or 0.0,
            admin_approved=False,
            rejection_reason=None,
        )
        db.add(profile)

    current_user.role = UserRole.COURIER
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
    lat: float = Query(None),
    lng: float = Query(None),
    radius: float = Query(50),
    city: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(CourierProfile).where(
        CourierProfile.admin_approved == True,
        CourierProfile.status != "offline"
    )
    if city:
        query = query.where(CourierProfile.city.ilike(f"%{city}%"))

    result = await db.execute(query)
    profiles = result.scalars().all()
    out = []
    for p in profiles:
        if lat is not None and lng is not None and p.lat and p.lng:
            dist = haversine(lat, lng, p.lat, p.lng)
            if dist > radius:
                continue
        else:
            dist = 0
        t = TARIFFS.get(p.transport_type, TARIFFS.get("car", {"base": 5000, "per_km": 500}))
        out.append({
            **profile_to_dict(p),
            "distance_km": round(dist, 1),
            "est_price": int(t["base"] + t["per_km"] * max(dist, 1)),
        })
    out.sort(key=lambda x: x["distance_km"])
    return out


# ─── 3.1 Публичный профиль курьера (для карточки при клике) ───

@router.get("/delivery/couriers/{courier_user_id}/profile")
async def get_public_courier_profile(
    courier_user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CourierProfile).where(CourierProfile.user_id == courier_user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Профиль курьера не найден")
    d = profile_to_dict(profile)
    d.pop("balance", None)
    d.pop("documents", None)
    return d


# ─── 3.2 Поиск курьеров по зоне (lat/lng/radius) ─────────────

@router.get("/delivery/couriers/zone")
async def search_couriers_zone(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(50),
    transport: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(CourierProfile).where(
        CourierProfile.admin_approved == True,
    )
    if transport:
        query = query.where(CourierProfile.transport_type == transport)

    result = await db.execute(query)
    profiles = result.scalars().all()
    out = []
    for p in profiles:
        if p.lat and p.lng:
            dist = haversine(lat, lng, p.lat, p.lng)
            if dist > radius:
                continue
        else:
            dist = 0
        t = TARIFFS.get(p.transport_type, TARIFFS.get("car", {"base": 5000, "per_km": 500}))
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
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.admin_approved == False))
    return [profile_to_dict(p) for p in result.scalars().all()]


@router.get("/admin/couriers")
async def get_all_couriers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile))
    return [profile_to_dict(p) for p in result.scalars().all()]


@router.get("/admin/couriers/{courier_id}")
async def get_courier_detail(
    courier_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.id == courier_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    return profile_to_dict(profile)


@router.get("/courier/public/{user_id}")
async def get_courier_public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CourierProfile).where(
            CourierProfile.user_id == user_id,
            CourierProfile.admin_approved == True
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Профиль курьера не найден")
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    data = profile_to_dict(profile)
    data["user_name"] = user.name if user else ""
    data["user_phone"] = user.phone if user else ""
    data.pop("balance", None)
    return data


@router.patch("/admin/couriers/{courier_id}/approve")
async def approve_courier(
    courier_id: int,
    rating: float = Body(0, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.id == courier_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    profile.admin_approved = True
    profile.rejection_reason = ""
    profile.rating = max(0.0, min(10.0, float(rating)))
    await db.commit()
    return {"ok": True, "rating": profile.rating}


@router.patch("/admin/couriers/{courier_id}/reject")
async def reject_courier(
    courier_id: int,
    reason: str = Body("", embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")
    result = await db.execute(select(CourierProfile).where(CourierProfile.id == courier_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    profile.admin_approved = False
    profile.rejection_reason = reason or ""
    await db.commit()
    return {"ok": True}


# ─── Delivery Request endpoints (new) ──────────────────────────────────────

# City coordinates for distance calculation
CITY_COORDS = {
    "ташкент":      (41.2995, 69.2401),
    "самарканд":    (39.6542, 66.9597),
    "навои":        (40.1000, 65.3700),
    "бухара":       (39.7681, 64.4556),
    "карши":        (38.8600, 65.7500),
    "коканд":       (40.5283, 70.9425),
    "андижан":      (40.7821, 72.3442),
    "фергана":      (40.3842, 71.7869),
    "наманган":     (40.9983, 71.0000),
    "термез":       (37.2242, 67.2783),
    "джизак":       (40.1250, 67.8400),
    "ургенч":       (41.5500, 60.6333),
    "хива":         (41.3786, 60.3564),
    "нукус":        (42.4600, 59.6000),
    "гулистан":     (40.4900, 68.7800),
    "маргилан":     (40.4700, 71.7200),
    "чирчик":       (41.4683, 69.5850),
    "алмалык":      (40.8400, 69.6000),
    "бекабад":      (40.2200, 69.2700),
    "ташкентская":  (41.2995, 69.2401),
    "самаркандская":(39.6542, 66.9597),
    "навоийская":   (40.1000, 65.3700),
    "бухарская":    (39.7681, 64.4556),
    "кашкадарьинская":(38.8600, 65.7500),
    "ферманская":   (40.5283, 70.9425),
    "андижанская":  (40.7821, 72.3442),
    "ферганская":   (40.3842, 71.7869),
    "наманганская": (40.9983, 71.0000),
    "сурхандарьинская":(37.2242, 67.2783),
    "джизакская":   (40.1250, 67.8400),
    "хорезмская":   (41.5500, 60.6333),
    "каракалпакстан":(42.4600, 59.6000),
    "сырдарьинская":(40.4900, 68.7800),
}


def get_city_coords(city_name: str):
    """Get coordinates for a city name (case-insensitive, handles suffixes)."""
    key = city_name.strip().lower()
    if key in CITY_COORDS:
        return CITY_COORDS[key]
    # Try without common suffixes
    for suffix in ["ская", "ая", "ий", "ый", "ой"]:
        stripped = key.rstrip(suffix) if key.endswith(suffix) else key
        if stripped in CITY_COORDS:
            return CITY_COORDS[stripped]
    return None


class DeliveryRequestCreate(BaseModel):
    order_id: int
    courier_user_id: int
    route_from: str
    route_to: str
    distance_km: float
    price_per_km: float
    total_price: float


@router.get("/delivery/couriers/by-route")
async def couriers_by_route(
    from_city: str = Query(..., alias="from"),
    to_city: str = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
):
    """Find couriers matching a route. Exact routes first (by rating), then 'anywhere' couriers."""
    # Exact match: route_from=from AND route_to=to
    exact_q = select(CourierProfile).where(
        CourierProfile.admin_approved == True,
        CourierProfile.route_from.ilike(f"%{from_city}%"),
        CourierProfile.route_to.ilike(f"%{to_city}%"),
    ).order_by(CourierProfile.rating.desc())
    exact_result = await db.execute(exact_q)
    exact_profiles = exact_result.scalars().all()

    # Anywhere couriers
    anywhere_q = select(CourierProfile).where(
        CourierProfile.admin_approved == True,
        CourierProfile.route_anywhere == True,
    ).order_by(CourierProfile.rating.desc())
    anywhere_result = await db.execute(anywhere_q)
    anywhere_profiles = anywhere_result.scalars().all()

    def profile_brief(p):
        return {
            "user_id": p.user_id,
            "full_name": p.full_name,
            "city": p.city,
            "transport_type": p.transport_type,
            "rating": p.rating,
            "route_from": p.route_from,
            "route_to": p.route_to,
            "route_anywhere": p.route_anywhere,
            "price_per_km": p.price_per_km,
            "photo_url": p.photo_url,
            "total_deliveries": p.total_deliveries,
        }

    return {
        "exact": [profile_brief(p) for p in exact_profiles],
        "anywhere": [profile_brief(p) for p in anywhere_profiles],
    }


@router.get("/delivery/calculate-route")
async def calculate_route(
    from_city: str = Query(..., alias="from"),
    to_city: str = Query(..., alias="to"),
    courier_user_id: int = Query(None),
):
    """Calculate distance and price for a route."""
    from_coords = get_city_coords(from_city)
    to_coords = get_city_coords(to_city)

    if not from_coords:
        raise HTTPException(400, f"Город не найден: {from_city}")
    if not to_coords:
        raise HTTPException(400, f"Город не найден: {to_city}")

    distance = haversine(from_coords[0], from_coords[1], to_coords[0], to_coords[1])

    price_per_km = 0
    if courier_user_id:
        # Will be set by frontend from courier profile
        pass

    return {
        "from": from_city,
        "to": to_city,
        "distance_km": round(distance, 1),
        "price_per_km": price_per_km,
        "total_price": round(distance * price_per_km, 0) if price_per_km else 0,
    }


@router.post("/delivery/request")
async def create_delivery_request(
    data: DeliveryRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a delivery request linking a marketplace order to a courier."""
    # Verify order exists and belongs to current user
    from app.models import Order
    order_result = await db.execute(select(Order).where(Order.id == data.order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Заказ не найден")
    if order.xaridor_id != current_user.id:
        raise HTTPException(403, "Нет доступа к этому заказу")

    # Verify courier exists
    courier_result = await db.execute(select(User).where(User.id == data.courier_user_id))
    courier = courier_result.scalar_one_or_none()
    if not courier:
        raise HTTPException(404, "Драйвер не найден")

    # Create DeliveryRequest
    from app.models import DeliveryRequest
    dr = DeliveryRequest(
        order_id=data.order_id,
        courier_id=data.courier_user_id,
        buyer_id=current_user.id,
        route_from=data.route_from,
        route_to=data.route_to,
        distance_km=data.distance_km,
        price_per_km=data.price_per_km,
        total_price=data.total_price,
        status="pending",
        buyer_confirmed_disclaimer=False,
        driver_confirmed_disclaimer=False,
    )
    db.add(dr)
    await db.flush()

    # Link to order
    order.delivery_request_id = dr.id
    await db.commit()
    await db.refresh(dr)

    return {"ok": True, "delivery_request_id": dr.id, "status": dr.status}


@router.patch("/delivery/request/{request_id}/buyer-confirm")
async def buyer_confirm_disclaimer(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Buyer confirms they read and agree to the disclaimer."""
    from app.models import DeliveryRequest
    result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == request_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(404, "Заявка не найдена")
    if dr.buyer_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    if dr.status not in ("pending",):
        raise HTTPException(400, f"Невозможно подтвердить в статусе: {dr.status}")

    dr.buyer_confirmed_disclaimer = True
    if dr.driver_confirmed_disclaimer:
        dr.status = "driver_accepted"
    await db.commit()
    return {"ok": True, "status": dr.status, "both_confirmed": dr.buyer_confirmed_disclaimer and dr.driver_confirmed_disclaimer}


@router.patch("/delivery/request/{request_id}/driver-accept")
async def driver_accept_order(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Driver accepts the delivery order and confirms disclaimer."""
    from app.models import DeliveryRequest
    result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == request_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(404, "Заявка не найдена")
    if dr.courier_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    if dr.status not in ("pending",):
        raise HTTPException(400, f"Невозможно принять в статусе: {dr.status}")

    dr.driver_confirmed_disclaimer = True
    if dr.buyer_confirmed_disclaimer:
        dr.status = "driver_accepted"
    await db.commit()

    # Get buyer phone for notification
    buyer_result = await db.execute(select(User).where(User.id == dr.buyer_id))
    buyer = buyer_result.scalar_one_or_none()

    return {
        "ok": True,
        "status": dr.status,
        "both_confirmed": dr.buyer_confirmed_disclaimer and dr.driver_confirmed_disclaimer,
        "buyer_phone": buyer.phone if buyer else "",
        "buyer_name": buyer.name if buyer else "",
    }


@router.patch("/delivery/request/{request_id}/driver-reject")
async def driver_reject_order(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Driver rejects the delivery order."""
    from app.models import DeliveryRequest
    result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == request_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(404, "Заявка не найдена")
    if dr.courier_id != current_user.id:
        raise HTTPException(403, "Нет доступа")

    dr.status = "cancelled_by_driver"
    await db.commit()
    return {"ok": True, "status": dr.status}


@router.patch("/delivery/request/{request_id}/buyer-cancel")
async def buyer_cancel_order(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Buyer cancels the delivery request (only within 30 minutes)."""
    from app.models import DeliveryRequest
    from datetime import datetime, timezone
    result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == request_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(404, "Заявка не найдена")
    if dr.buyer_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    if dr.status in ("completed", "delivered"):
        raise HTTPException(400, "Невозможно отменить завершённый заказ")

    # Check 30-minute time limit
    if dr.created_at:
        now = datetime.now(timezone.utc)
        created = dr.created_at.replace(tzinfo=timezone.utc) if dr.created_at.tzinfo is None else dr.created_at
        elapsed_minutes = (now - created).total_seconds() / 60
        if elapsed_minutes > 30:
            raise HTTPException(400, "Отмена возможна только в течение 30 минут после оформления заказа")

    dr.status = "cancelled_by_buyer"
    await db.commit()
    return {"ok": True, "status": dr.status}


@router.get("/delivery/request/my")
async def get_my_delivery_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery requests where current user is the driver."""
    from app.models import DeliveryRequest, Order, Product
    result = await db.execute(
        select(DeliveryRequest)
        .where(DeliveryRequest.courier_id == current_user.id)
        .order_by(DeliveryRequest.created_at.desc())
    )
    requests = result.scalars().all()

    out = []
    for dr in requests:
        # Get order info
        order_result = await db.execute(select(Order).where(Order.id == dr.order_id))
        order = order_result.scalar_one_or_none()
        product_title = ""
        product_photo = None
        order_quantity = 0
        order_total = 0
        buyer_name = ""
        buyer_phone = ""
        if order:
            prod_result = await db.execute(select(Product).where(Product.id == order.product_id))
            prod = prod_result.scalar_one_or_none()
            if prod:
                product_title = prod.title
                product_photo = (prod.photos or [None])[0] if prod.photos else None
            order_quantity = float(order.quantity)
            order_total = float(order.total_price)
            buyer_result = await db.execute(select(User).where(User.id == dr.buyer_id))
            buyer = buyer_result.scalar_one_or_none()
            if buyer:
                buyer_name = buyer.name
                buyer_phone = buyer.phone

        out.append({
            "id": dr.id,
            "order_id": dr.order_id,
            "route_from": dr.route_from,
            "route_to": dr.route_to,
            "distance_km": dr.distance_km,
            "price_per_km": dr.price_per_km,
            "total_price": dr.total_price,
            "status": dr.status,
            "buyer_confirmed_disclaimer": dr.buyer_confirmed_disclaimer,
            "driver_confirmed_disclaimer": dr.driver_confirmed_disclaimer,
            "product_title": product_title,
            "product_photo": product_photo,
            "order_quantity": order_quantity,
            "order_total_price": order_total,
            "buyer_name": buyer_name,
            "buyer_phone": buyer_phone,
            "created_at": dr.created_at.isoformat() if dr.created_at else "",
        })

    return out


@router.get("/delivery/request/buyer")
async def get_buyer_delivery_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery requests where current user is the buyer."""
    from app.models import DeliveryRequest, Order, Product
    result = await db.execute(
        select(DeliveryRequest)
        .where(DeliveryRequest.buyer_id == current_user.id)
        .order_by(DeliveryRequest.created_at.desc())
    )
    requests = result.scalars().all()

    out = []
    for dr in requests:
        order_result = await db.execute(select(Order).where(Order.id == dr.order_id))
        order = order_result.scalar_one_or_none()
        product_title = ""
        product_photo = None
        order_quantity = 0
        order_total = 0
        courier_name = ""
        courier_phone = ""
        if order:
            prod_result = await db.execute(select(Product).where(Product.id == order.product_id))
            prod = prod_result.scalar_one_or_none()
            if prod:
                product_title = prod.title
                product_photo = (prod.photos or [None])[0] if prod.photos else None
            order_quantity = float(order.quantity)
            order_total = float(order.total_price)
            courier_result = await db.execute(select(User).where(User.id == dr.courier_id))
            courier = courier_result.scalar_one_or_none()
            if courier:
                courier_name = courier.name
                courier_phone = courier.phone

        out.append({
            "id": dr.id,
            "order_id": dr.order_id,
            "route_from": dr.route_from,
            "route_to": dr.route_to,
            "distance_km": dr.distance_km,
            "price_per_km": dr.price_per_km,
            "total_price": dr.total_price,
            "status": dr.status,
            "buyer_confirmed_disclaimer": dr.buyer_confirmed_disclaimer,
            "driver_confirmed_disclaimer": dr.driver_confirmed_disclaimer,
            "product_title": product_title,
            "product_photo": product_photo,
            "order_quantity": order_quantity,
            "order_total_price": order_total,
            "courier_name": courier_name,
            "courier_phone": courier_phone,
            "created_at": dr.created_at.isoformat() if dr.created_at else "",
        })

    return out


# ─── Delivery Request Status Update ──────────────────────────────────────

class DeliveryRequestStatusUpdate(BaseModel):
    status: str  # collecting, in_transit, delivered, completed

@router.patch("/delivery/request/{request_id}/status")
async def update_delivery_request_status(
    request_id: int,
    data: DeliveryRequestStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Driver updates delivery request status."""
    from app.models import DeliveryRequest
    result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == request_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(404, "Заявка не найдена")

    allowed_transitions = {
        "driver_accepted": ["collecting"],
        "collecting": ["in_transit"],
        "in_transit": ["delivered"],
        "delivered": ["completed"],
    }
    current = dr.status
    if current not in allowed_transitions or data.status not in allowed_transitions[current]:
        raise HTTPException(400, f"Невозможно перейти из '{current}' в '{data.status}'")

    if dr.courier_id != current_user.id:
        raise HTTPException(403, "Нет доступа")

    dr.status = data.status
    await db.commit()

    return {"ok": True, "status": dr.status}


# ─── Delivery Request Rating ─────────────────────────────────────────────

class DeliveryRequestRating(BaseModel):
    rating: int  # 0-10
    comment: Optional[str] = None

@router.patch("/delivery/request/{request_id}/rate")
async def rate_delivery_request(
    request_id: int,
    data: DeliveryRequestRating,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Buyer rates a completed delivery (0-10). Rating 0 = negative, 1-10 = positive."""
    from app.models import DeliveryRequest, CourierProfile
    result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == request_id))
    dr = result.scalar_one_or_none()
    if not dr:
        raise HTTPException(404, "Заявка не найдена")
    if dr.buyer_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    if dr.status not in ("delivered",):
        raise HTTPException(400, "Можно оценить только доставленный заказ")
    if data.rating < 0 or data.rating > 10:
        raise HTTPException(400, "Рейтинг от 0 до 10")

    dr.buyer_rating = data.rating
    dr.buyer_comment = data.comment
    dr.status = "completed"

    # Update courier rating (0 = decrease, 1-10 = set)
    if data.rating == 0:
        # Decrease rating
        cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == dr.courier_id))
        cp = cp_res.scalar_one_or_none()
        if cp and cp.rating > 0:
            cp.rating = max(0.0, round(cp.rating - 1.0, 1))
    else:
        # Set rating based on this delivery (1-10 scale)
        cp_res = await db.execute(select(CourierProfile).where(CourierProfile.user_id == dr.courier_id))
        cp = cp_res.scalar_one_or_none()
        if cp:
            # Simple average with existing rating
            if cp.rating > 0:
                cp.rating = round((cp.rating + data.rating) / 2, 1)
            else:
                cp.rating = float(data.rating)

    await db.commit()
    return {"ok": True, "status": dr.status, "new_rating": cp.rating if cp else None}


# ─── Get completed deliveries for driver ─────────────────────────────────

@router.get("/delivery/request/completed")
async def get_completed_deliveries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get completed deliveries with ratings for the driver."""
    from app.models import DeliveryRequest, Order, Product
    result = await db.execute(
        select(DeliveryRequest)
        .where(DeliveryRequest.courier_id == current_user.id)
        .where(DeliveryRequest.status == "completed")
        .order_by(DeliveryRequest.updated_at.desc())
    )
    requests = result.scalars().all()

    out = []
    for dr in requests:
        order_result = await db.execute(select(Order).where(Order.id == dr.order_id))
        order = order_result.scalar_one_or_none()
        product_title = ""
        product_photo = None
        buyer_name = ""
        buyer_phone = ""
        if order:
            prod_result = await db.execute(select(Product).where(Product.id == order.product_id))
            prod = prod_result.scalar_one_or_none()
            if prod:
                product_title = prod.title
                product_photo = (prod.photos or [None])[0] if prod.photos else None
            buyer_result = await db.execute(select(User).where(User.id == dr.buyer_id))
            buyer = buyer_result.scalar_one_or_none()
            if buyer:
                buyer_name = buyer.name
                buyer_phone = buyer.phone

        out.append({
            "id": dr.id,
            "order_id": dr.order_id,
            "route_from": dr.route_from,
            "route_to": dr.route_to,
            "distance_km": dr.distance_km,
            "total_price": dr.total_price,
            "status": dr.status,
            "product_title": product_title,
            "product_photo": product_photo,
            "buyer_name": buyer_name,
            "buyer_phone": buyer_phone,
            "buyer_rating": dr.buyer_rating,
            "buyer_comment": dr.buyer_comment,
            "created_at": dr.created_at.isoformat() if dr.created_at else "",
            "updated_at": dr.updated_at.isoformat() if dr.updated_at else "",
        })

    return out


# ─── Get driver public profile with completed deliveries ─────────────────

@router.get("/delivery/couriers/{courier_user_id}/completed")
async def get_courier_completed_deliveries(
    courier_user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get completed deliveries for public profile view."""
    from app.models import DeliveryRequest, Order, Product
    result = await db.execute(
        select(DeliveryRequest)
        .where(DeliveryRequest.courier_id == courier_user_id)
        .where(DeliveryRequest.status == "completed")
        .order_by(DeliveryRequest.updated_at.desc())
    )
    requests = result.scalars().all()

    out = []
    for dr in requests:
        order_result = await db.execute(select(Order).where(Order.id == dr.order_id))
        order = order_result.scalar_one_or_none()
        product_title = ""
        buyer_name = ""
        if order:
            prod_result = await db.execute(select(Product).where(Product.id == order.product_id))
            prod = prod_result.scalar_one_or_none()
            if prod:
                product_title = prod.title
            buyer_result = await db.execute(select(User).where(User.id == dr.buyer_id))
            buyer = buyer_result.scalar_one_or_none()
            if buyer:
                buyer_name = buyer.name

        out.append({
            "id": dr.id,
            "route_from": dr.route_from,
            "route_to": dr.route_to,
            "distance_km": dr.distance_km,
            "total_price": dr.total_price,
            "product_title": product_title,
            "buyer_name": buyer_name,
            "buyer_rating": dr.buyer_rating,
            "buyer_comment": dr.buyer_comment,
            "created_at": dr.created_at.isoformat() if dr.created_at else "",
        })

    return out
