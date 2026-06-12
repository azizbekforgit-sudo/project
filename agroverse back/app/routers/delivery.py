"""
delivery.py — Модуль доставки AgroVerse
Роль: courier | Статусы: online/offline/busy
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func
from app.database import AsyncSessionLocal
from app.dependencies import get_current_user
from app.models import User, UserRole
from pydantic import BaseModel
from typing import Optional, List
import math
import httpx
import os

router = APIRouter(prefix="/api", tags=["delivery"])

async def get_db():
    async with AsyncSessionLocal() as s:
        yield s

# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class CourierProfileSetup(BaseModel):
    # Шаг 1 — транспорт
    transport_type: str           # moto / car / truck
    max_weight: float             # кг
    has_thermo_bag: bool = False
    # Шаг 2 — зона
    experience_years: int = 0
    city: str
    radius_km: float = 10
    work_mode: str = "flexible"   # flexible / day / evening
    work_hours: str = "09:00-18:00"
    # Шаг 3 — документы
    full_name: str
    phone: str
    vehicle_number: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None

class CourierStatusUpdate(BaseModel):
    status: str   # online / offline / busy
    lat: Optional[float] = None
    lng: Optional[float] = None

class DeliveryOrderCreate(BaseModel):
    courier_id: int
    pickup_address: str
    delivery_address: str
    pickup_lat: float
    pickup_lng: float
    delivery_lat: float
    delivery_lng: float
    cargo_description: str
    weight_kg: float
    scheduled_time: Optional[str] = None

class DeliveryStatusUpdate(BaseModel):
    status: str  # accepted / picked_up / in_transit / delivered / cancelled

class CourierRating(BaseModel):
    rating: int   # 1–5
    comment: Optional[str] = None

class WalletWithdraw(BaseModel):
    amount: float
    method: str   # click / payme

class AIChatMessage(BaseModel):
    message: str

# ─── Утилиты ──────────────────────────────────────────────────────────────────

TARIFFS = {
    "moto":  {"base": 8000,  "per_km": 900,  "extra_weight": 1000},
    "car":   {"base": 12000, "per_km": 1200, "extra_weight": 2000},
    "truck": {"base": 25000, "per_km": 2000, "extra_weight": 0},
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
    if weight_kg > 10 and t["extra_weight"]:
        price += t["extra_weight"] * math.ceil((weight_kg - 10) / 5)
    return int(price)

# ─── In-memory хранилище курьеров (в проде — Redis/DB) ───────────────────────
# В реальном деплое эти данные хранятся в таблицах. Здесь упрощённо в памяти.
_courier_profiles: dict = {}   # user_id -> profile dict
_courier_status: dict = {}     # user_id -> {status, lat, lng}
_delivery_orders: dict = {}    # order_id -> order dict
_courier_ratings: dict = {}    # courier_id -> [ratings]
_courier_wallets: dict = {}    # user_id -> balance
_wallet_history: dict = {}     # user_id -> [transactions]
_order_counter = [1000]

# ─── 1. Настройка профиля курьера ─────────────────────────────────────────────

@router.post("/courier/profile/setup")
async def setup_courier_profile(
    data: CourierProfileSetup,
    current_user: User = Depends(get_current_user),
):
    profile_data = data.model_dump()
    profile_data["admin_approved"] = False  # Requires admin approval before appearing in search
    _courier_profiles[current_user.id] = profile_data
    _courier_status[current_user.id] = {"status": "offline", "lat": None, "lng": None}
    if current_user.id not in _courier_wallets:
        _courier_wallets[current_user.id] = 0.0
        _wallet_history[current_user.id] = []
    return {"ok": True, "message": "Профиль курьера сохранён"}

@router.get("/courier/profile")
async def get_courier_profile(current_user: User = Depends(get_current_user)):
    profile = _courier_profiles.get(current_user.id)
    if not profile:
        raise HTTPException(404, "Профиль не найден")
    return {
        **profile,
        "status": _courier_status.get(current_user.id, {}).get("status", "offline"),
        "rating": _get_avg_rating(current_user.id),
        "wallet": _courier_wallets.get(current_user.id, 0),
        "admin_approved": profile.get("admin_approved", False),
    }

# ─── 2. Статус курьера ────────────────────────────────────────────────────────

@router.put("/courier/status")
async def update_courier_status(
    data: CourierStatusUpdate,
    current_user: User = Depends(get_current_user),
):
    if data.status not in ("online", "offline", "busy"):
        raise HTTPException(400, "Неверный статус")
    _courier_status[current_user.id] = {
        "status": data.status,
        "lat": data.lat,
        "lng": data.lng,
    }
    return {"ok": True, "status": data.status}

# ─── 3. Поиск курьеров поблизости ─────────────────────────────────────────────

@router.get("/delivery/couriers/nearby")
async def couriers_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(10),
):
    result = []
    for uid, st in _courier_status.items():
        if st["status"] == "offline":
            continue
        # Only show admin-approved couriers in search
        profile_check = _courier_profiles.get(uid, {})
        if not profile_check.get("admin_approved", False):
            continue
        if st["lat"] is None or st["lng"] is None:
            # курьер онлайн но без координат — добавляем с 0 dist
            dist = 0
        else:
            dist = haversine(lat, lng, st["lat"], st["lng"])
            if dist > radius:
                continue

        profile = _courier_profiles.get(uid, {})
        rating = _get_avg_rating(uid)
        t = TARIFFS.get(profile.get("transport_type", "car"), TARIFFS["car"])
        est_price = t["base"] + t["per_km"] * max(dist, 1)

        result.append({
            "id": uid,
            "full_name": profile.get("full_name", f"Йўлчи #{uid}"),
            "transport_type": profile.get("transport_type", "car"),
            "status": st["status"],
            "lat": st["lat"],
            "lng": st["lng"],
            "distance_km": round(dist, 1),
            "rating": rating,
            "reviews_count": len(_courier_ratings.get(uid, [])),
            "est_price": int(est_price),
            "city": profile.get("city", ""),
            "has_thermo_bag": profile.get("has_thermo_bag", False),
            "max_weight": profile.get("max_weight", 20),
            "experience_years": profile.get("experience_years", 0),
            "photo_url": profile.get("photo_url"),
            "admin_approved": profile.get("admin_approved", False),
        })

    result.sort(key=lambda x: x["distance_km"])
    return result

# ─── 4. Создание заявки на доставку ───────────────────────────────────────────

@router.post("/delivery/orders")
async def create_delivery_order(
    data: DeliveryOrderCreate,
    current_user: User = Depends(get_current_user),
):
    dist = haversine(data.pickup_lat, data.pickup_lng, data.delivery_lat, data.delivery_lng)
    courier_profile = _courier_profiles.get(data.courier_id, {})
    transport = courier_profile.get("transport_type", "car")
    price = calc_price(transport, dist, data.weight_kg)

    _order_counter[0] += 1
    order_id = _order_counter[0]

    order = {
        "id": order_id,
        "client_id": current_user.id,
        "courier_id": data.courier_id,
        "pickup_address": data.pickup_address,
        "delivery_address": data.delivery_address,
        "pickup_lat": data.pickup_lat, "pickup_lng": data.pickup_lng,
        "delivery_lat": data.delivery_lat, "delivery_lng": data.delivery_lng,
        "cargo": data.cargo_description,
        "weight_kg": data.weight_kg,
        "distance_km": round(dist, 1),
        "price": price,
        "status": "pending",
        "scheduled_time": data.scheduled_time,
    }
    _delivery_orders[order_id] = order

    # Ставим курьера занятым
    if data.courier_id in _courier_status:
        _courier_status[data.courier_id]["status"] = "busy"

    return {"ok": True, "order": order}

# ─── 5. Принять/обновить статус заявки ────────────────────────────────────────

@router.post("/delivery/orders/{order_id}/accept")
async def accept_delivery_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
):
    order = _delivery_orders.get(order_id)
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    if order["courier_id"] != current_user.id:
        raise HTTPException(403, "Нет доступа")
    order["status"] = "accepted"
    return {"ok": True, "order": order}

@router.put("/delivery/orders/{order_id}/status")
async def update_delivery_order_status(
    order_id: int,
    data: DeliveryStatusUpdate,
    current_user: User = Depends(get_current_user),
):
    order = _delivery_orders.get(order_id)
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    order["status"] = data.status
    if data.status == "delivered":
        # Зачислить деньги на кошелёк курьера
        courier_id = order["courier_id"]
        _courier_wallets[courier_id] = _courier_wallets.get(courier_id, 0) + order["price"]
        _wallet_history.setdefault(courier_id, []).append({
            "type": "income", "amount": order["price"],
            "desc": f"Доставка #{order_id}", "status": "completed"
        })
        # Курьер снова свободен
        if courier_id in _courier_status:
            _courier_status[courier_id]["status"] = "online"
    return {"ok": True, "order": order}

# ─── 6. Рейтинг курьера ───────────────────────────────────────────────────────

@router.post("/couriers/{courier_id}/rate")
async def rate_courier(
    courier_id: int,
    data: CourierRating,
    current_user: User = Depends(get_current_user),
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(400, "Рейтинг 1–5")
    _courier_ratings.setdefault(courier_id, []).append({
        "rating": data.rating,
        "comment": data.comment,
        "from": current_user.id,
    })
    avg = _get_avg_rating(courier_id)
    warning = None
    if avg < 2.5:
        warning = "blocked"
    elif avg < 3.0:
        warning = "warning"
    return {"ok": True, "new_avg": avg, "warning": warning}

def _get_avg_rating(uid):
    ratings = _courier_ratings.get(uid, [])
    if not ratings:
        return 5.0
    return round(sum(r["rating"] for r in ratings) / len(ratings), 1)

# ─── 7. Кошелёк ───────────────────────────────────────────────────────────────

@router.get("/courier/wallet")
async def get_wallet(current_user: User = Depends(get_current_user)):
    balance = _courier_wallets.get(current_user.id, 0)
    history = _wallet_history.get(current_user.id, [])
    return {"balance": balance, "history": history[-30:]}

@router.post("/courier/wallet/withdraw")
async def wallet_withdraw(
    data: WalletWithdraw,
    current_user: User = Depends(get_current_user),
):
    bal = _courier_wallets.get(current_user.id, 0)
    if data.amount > bal:
        raise HTTPException(400, "Недостаточно средств")
    _courier_wallets[current_user.id] -= data.amount
    _wallet_history.setdefault(current_user.id, []).append({
        "type": "withdraw", "amount": data.amount,
        "method": data.method, "status": "processing"
    })
    return {"ok": True, "new_balance": _courier_wallets[current_user.id]}

# ─── 8. ИИ-помощник курьера ───────────────────────────────────────────────────

@router.post("/courier/ai/chat")
async def courier_ai_chat(
    data: AIChatMessage,
    current_user: User = Depends(get_current_user),
):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"reply": "AI ключ не настроен. Добавьте ANTHROPIC_API_KEY в переменные окружения."}

    system_prompt = (
        "Ты — ИИ-помощник курьера AgroVerse. "
        "Помогаешь курьерам оптимизировать маршруты, разбираться с заявками, "
        "считать заработок и решать рабочие вопросы. "
        "Отвечай кратко и по делу на русском языке."
    )
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
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": data.message}],
                }
            )
            r = resp.json()
            reply = r.get("content", [{}])[0].get("text", "Ошибка ответа")
            return {"reply": reply}
    except Exception as e:
        return {"reply": f"Ошибка связи: {str(e)}"}

# ─── 9. Калькулятор тарифов ───────────────────────────────────────────────────

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

# ─── 10. Заявки курьера ───────────────────────────────────────────────────────

@router.get("/courier/orders")
async def get_courier_orders(current_user: User = Depends(get_current_user)):
    orders = [o for o in _delivery_orders.values() if o["courier_id"] == current_user.id]
    orders.sort(key=lambda x: x["id"], reverse=True)
    return orders

@router.get("/delivery/available-orders")
async def get_available_orders(current_user: User = Depends(get_current_user)):
    orders = [o for o in _delivery_orders.values() if o["status"] == "pending"]
    return orders

# ─── Admin: одобрить/отклонить курьера ────────────────────────────────────────

@router.post("/admin/couriers/{courier_id}/approve")
async def approve_courier(
    courier_id: int,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    profile = _courier_profiles.get(courier_id)
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    _courier_profiles[courier_id]["admin_approved"] = True
    return {"ok": True, "message": f"Курьер #{courier_id} одобрен"}

@router.post("/admin/couriers/{courier_id}/reject")
async def reject_courier(
    courier_id: int,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    profile = _courier_profiles.get(courier_id)
    if not profile:
        raise HTTPException(404, "Курьер не найден")
    _courier_profiles[courier_id]["admin_approved"] = False
    return {"ok": True, "message": f"Курьер #{courier_id} отклонён"}

@router.get("/admin/couriers/pending")
async def get_pending_couriers(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Только для администраторов")
    result = []
    for uid, profile in _courier_profiles.items():
        if not profile.get("admin_approved", False):
            result.append({"id": uid, **profile})
    return result

