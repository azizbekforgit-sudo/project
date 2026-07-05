from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Product, Order, UserRole, ProductStatus, OrderStatus, CourierProfile
from app.dependencies import get_current_admin
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users")
async def get_all_users(
    page: int = 1,
    limit: int = 50,
    role: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Список всех пользователей"""
    query = select(User)
    
    if role:
        query = query.where(User.role == role)
    
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "role": str(u.role),
            "tariff": str(u.tariff),
            "bonus_points": u.bonus_points,
            "wallet_balance": float(u.wallet_balance),
            "is_active": u.is_active,
            "block_reason": u.block_reason,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@router.patch("/users/{user_id}/block")
async def block_user(
    user_id: int,
    reason: str = Body("", embed=True),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Заблокировать пользователя"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Нельзя блокировать администратора")
    
    user.is_active = False
    user.block_reason = (reason or "").strip() or "Нарушение правил платформы"
    await db.commit()
    
    return {"message": f"Пользователь {user.name} заблокирован"}

@router.patch("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Разблокировать пользователя"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    user.is_active = True
    user.block_reason = None
    await db.commit()
    
    return {"message": f"Пользователь {user.name} разблокирован"}

@router.get("/products/pending")
async def get_pending_products(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Товары ожидающие модерации"""
    result = await db.execute(
        select(Product).where(Product.status == ProductStatus.PENDING)
    )
    products = result.scalars().all()

    # FIX: batch-load farmers to avoid N+1 queries
    fermer_ids = list({p.fermer_id for p in products})
    fermers_result = await db.execute(select(User).where(User.id.in_(fermer_ids)))
    fermers_map = {u.id: u for u in fermers_result.scalars().all()}

    products_response = []
    for product in products:
        fermer = fermers_map.get(product.fermer_id)
        fermer_name = fermer.name if fermer else "Unknown"
        fermer_phone = fermer.phone if fermer else ""

        products_response.append({
            "id": product.id,
            "title": product.title,
            "fermer_name": fermer_name,
            "fermer_phone": fermer_phone,
            "category": product.category,
            "price": float(product.price_per_unit),
            "photos": product.photos,
            "created_at": product.created_at.isoformat() if product.created_at else None
        })
    
    return products_response

@router.patch("/products/{product_id}/approve")
async def approve_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Одобрить товар"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    product.status = ProductStatus.ACTIVE
    await db.commit()
    
    return {"message": f"Товар {product.title} одобрен"}

@router.patch("/products/{product_id}/reject")
async def reject_product(
    product_id: int,
    reason: str = Body("", embed=True),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Отклонить товар"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    product.status = ProductStatus.INACTIVE
    await db.commit()
    
    return {
        "message": f"Товар {product.title} отклонен",
        "reason": reason or "Не указана"
    }

@router.get("/reports/orders")
async def orders_report(
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Отчёт по заказам"""
    query = select(Order)
    
    if start_date:
        query = query.where(Order.created_at >= start_date)
    if end_date:
        query = query.where(Order.created_at <= end_date)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    total_revenue = sum(float(o.total_price) for o in orders)
    total_commission = sum(float(o.commission) for o in orders)
    
    return {
        "total_orders": len(orders),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "by_status": {
            "created": len([o for o in orders if o.status == OrderStatus.CREATED]),
            "paid": len([o for o in orders if o.status == OrderStatus.PAID]),
            "ready": len([o for o in orders if o.status == OrderStatus.READY_FOR_PICKUP]),
            "completed": len([o for o in orders if o.status == OrderStatus.COMPLETED]),
            "cancelled": len([o for o in orders if o.status == OrderStatus.CANCELLED])
        }
    }

@router.get("/reports/revenue")
async def revenue_report(
    period: str = "month",  # day, week, month, year
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Отчёт по доходам"""
    # Заглушка для MVP
    return {
        "period": period,
        "total_revenue": 125000.00,
        "platform_commission": 12500.00,
        "subscription_revenue": 2500.00,
        "growth": "+15.5%",
        "chart_data": {
            "labels": ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"],
            "values": [8500, 9200, 10100, 11800, 12500, 13200]
        }
    }


# ─── Рейтинг курьера (0-10, ставит админ) ─────────────────────

from pydantic import BaseModel as _BM, Field

class CourierRateRequest(_BM):
    rating: float = Field(..., ge=0, le=10)


@router.patch("/couriers/{courier_id}/rate")
async def admin_rate_courier(
    courier_id: int,
    data: CourierRateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Админ ставит рейтинг курьеру (0-10)"""
    result = await db.execute(
        select(CourierProfile).where(CourierProfile.id == courier_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Курьер не найден")
    profile.rating = round(data.rating, 1)
    await db.commit()
    return {"ok": True, "rating": profile.rating}