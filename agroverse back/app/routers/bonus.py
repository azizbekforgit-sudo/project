from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, BonusTransaction, Order, OrderStatus
from app.schemas import BonusBalance
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/bonus", tags=["bonus"])

@router.get("/balance", response_model=BonusBalance)
async def get_bonus_balance(
    current_user: User = Depends(get_current_user)
):
    """Текущий баланс баллов"""
    return {"bonus_points": current_user.bonus_points}

@router.get("/history")
async def get_bonus_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """История начисления баллов"""
    result = await db.execute(
        select(BonusTransaction)
        .where(BonusTransaction.user_id == current_user.id)
        .order_by(BonusTransaction.created_at.desc())
    )
    transactions = result.scalars().all()
    
    return [
        {
            "points": txn.points,
            "reason": txn.reason,
            "created_at": txn.created_at.isoformat() if txn.created_at else None
        }
        for txn in transactions
    ]

@router.post("/redeem")
async def redeem_bonus(
    order_id: int,
    bonus_to_use: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Потратить баллы на скидку
    Правила:
    - 1 балл = 0.01$ скидка
    - Максимум 20% от суммы заказа
    """
    # Получаем заказ
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.status != OrderStatus.CREATED:
        raise HTTPException(status_code=400, detail="Скидку можно применить только до оплаты")
    
    # Проверяем достаточно ли баллов
    if current_user.bonus_points < bonus_to_use:
        raise HTTPException(status_code=400, detail=f"Недостаточно баллов. Доступно: {current_user.bonus_points}")
    
    # Рассчитываем скидку
    discount_amount = bonus_to_use * 0.01
    max_discount = float(order.total_price) * 0.20  # максимум 20%
    
    if discount_amount > max_discount:
        discount_amount = max_discount
        bonus_used = int(max_discount / 0.01)
    else:
        bonus_used = bonus_to_use
    
    # Применяем скидку
    final_price = float(order.total_price) - discount_amount
    
    # Списываем баллы
    current_user.bonus_points -= bonus_used
    
    # Записываем списание
    bonus_txn = BonusTransaction(
        user_id=current_user.id,
        points=-bonus_used,
        reason=f"Использование скидки на заказ #{order_id}"
    )
    db.add(bonus_txn)
    
    # Обновляем сумму заказа
    order.total_price = final_price
    
    await db.commit()
    
    return {
        "message": "Скидка применена",
        "bonus_used": bonus_used,
        "discount_amount": discount_amount,
        "original_price": float(order.total_price) + discount_amount,
        "final_price": float(order.total_price)
    }

@router.post("/earn")
async def earn_bonus_for_review(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Начисление баллов за отзыв
    (по ТЗ: +3 балла за отзыв на товар)
    """
    # Проверяем существует ли заказ
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Отзыв можно оставить только после получения товара")
    
    # Проверяем не было ли уже отзыва
    from app.models import Review
    review_result = await db.execute(select(Review).where(Review.order_id == order_id))
    existing_review = review_result.scalar_one_or_none()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="Отзыв уже оставлен")
    
    # Начисляем баллы
    current_user.bonus_points += 3
    
    bonus_txn = BonusTransaction(
        user_id=current_user.id,
        points=3,
        reason=f"Отзыв на товар по заказу #{order_id}"
    )
    db.add(bonus_txn)
    
    await db.commit()
    
    return {
        "message": "Баллы за отзыв начислены",
        "bonus_earned": 3,
        "total_bonus": current_user.bonus_points
    }