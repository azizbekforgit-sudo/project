from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, BonusTransaction, UserRole
from app.schemas import DepositRequest, WithdrawRequest
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/payment", tags=["payment"])

@router.get("/wallet")
async def get_wallet_balance(
    current_user: User = Depends(get_current_user)
):
    """Просмотр баланса кошелька"""
    return {
        "wallet_balance": float(current_user.wallet_balance),
        "bonus_points": current_user.bonus_points,
        "currency": "USD"
    }

@router.post("/deposit")
async def deposit(
    deposit_data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Пополнить кошелек (заглушка для MVP)"""
    # В реальном проекте здесь интеграция с платежной системой
    # Для MVP просто добавляем баланс
    
    current_user.wallet_balance += deposit_data.amount
    
    # Записываем транзакцию (упрощенно)
    # В production - отдельная таблица transactions
    
    await db.commit()
    
    return {
        "message": "Кошелек пополнен",
        "amount": deposit_data.amount,
        "new_balance": float(current_user.wallet_balance)
    }

@router.post("/withdraw")
async def withdraw(
    withdraw_data: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Вывести средства (только Fermer)"""
    if current_user.role != UserRole.FERMER:
        raise HTTPException(status_code=403, detail="Только фермеры могут выводить средства")
    
    if current_user.wallet_balance < withdraw_data.amount:
        raise HTTPException(status_code=400, detail="Недостаточно средств")
    
    current_user.wallet_balance -= withdraw_data.amount
    
    # В реальном проекте - отправка на банковскую карту
    # Для MVP - просто списываем
    
    await db.commit()
    
    return {
        "message": "Запрос на вывод средств создан",
        "amount": withdraw_data.amount,
        "new_balance": float(current_user.wallet_balance)
    }

@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """История транзакций (упрощенно - возвращаем бонусы и заказы)"""
    
    # Получаем бонусные транзакции
    bonus_result = await db.execute(
        select(BonusTransaction).where(BonusTransaction.user_id == current_user.id)
    )
    bonuses = bonus_result.scalars().all()
    
    # Получаем заказы как покупатель
    from app.models import Order
    orders_result = await db.execute(
        select(Order).where(Order.xaridor_id == current_user.id)
    )
    orders = orders_result.scalars().all()
    
    history = []
    
    for bonus in bonuses:
        history.append({
            "type": "bonus",
            "points": bonus.points,
            "reason": bonus.reason,
            "created_at": bonus.created_at.isoformat() if bonus.created_at else None
        })
    
    for order in orders:
        history.append({
            "type": "payment",
            "amount": float(order.total_price),
            "status": order.status.value,
            "order_id": order.id,
            "created_at": order.created_at.isoformat() if order.created_at else None
        })
    
    # Сортируем по дате
    history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return history