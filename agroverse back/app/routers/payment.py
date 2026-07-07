from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, BonusTransaction, UserRole
from app.schemas import DepositRequest, WithdrawRequest
from app.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional
import os
import uuid

router = APIRouter(prefix="/api/payment", tags=["payment"])

# Card number for admin-assisted top-up
TOPUP_CARD_NUMBER = "1234 1234 1234 1234"

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
    current_user.wallet_balance += deposit_data.amount
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
    await db.commit()
    return {
        "message": "Запрос на вывод средств создан",
        "amount": withdraw_data.amount,
        "new_balance": float(current_user.wallet_balance)
    }

# ─── Admin-assisted Top-Up ──────────────────────────────────────────────

class TopUpCreate(BaseModel):
    amount: float
    card_number: str = ""

@router.get("/topup/card")
async def get_topup_card():
    """Get card number for admin-assisted top-up"""
    return {"card_number": TOPUP_CARD_NUMBER}

@router.post("/topup/request")
async def create_topup_request(
    data: TopUpCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a top-up request with receipt"""
    from app.models import TopUpRequest
    if data.amount < 1000:
        raise HTTPException(400, "Минимальная сумма 1 000 сум")

    req = TopUpRequest(
        user_id=current_user.id,
        amount=data.amount,
        card_number=data.card_number or TOPUP_CARD_NUMBER,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return {"ok": True, "request_id": req.id, "status": "pending"}

@router.post("/topup/{request_id}/upload-receipt")
async def upload_receipt(
    request_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload receipt image for a top-up request"""
    from app.models import TopUpRequest
    result = await db.execute(select(TopUpRequest).where(TopUpRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Заявка не найдена")
    if req.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")

    # Save file
    upload_dir = os.path.join(os.getcwd(), "uploads", "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "jpg"
    filename = f"receipt_{request_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    req.receipt_url = f"/uploads/receipts/{filename}"
    await db.commit()
    return {"ok": True, "receipt_url": req.receipt_url}

@router.get("/topup/my")
async def get_my_topup_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's top-up requests"""
    from app.models import TopUpRequest
    result = await db.execute(
        select(TopUpRequest).where(TopUpRequest.user_id == current_user.id)
        .order_by(TopUpRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return [{
        "id": r.id,
        "amount": r.amount,
        "card_number": r.card_number,
        "receipt_url": r.receipt_url,
        "status": r.status,
        "admin_comment": r.admin_comment,
        "created_at": r.created_at.isoformat() if r.created_at else "",
    } for r in requests]

# ─── Admin endpoints for top-up verification ─────────────────────────────

class TopUpAdminAction(BaseModel):
    comment: Optional[str] = None

@router.get("/admin/topup/pending")
async def get_pending_topups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending top-up requests (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")

    from app.models import TopUpRequest
    result = await db.execute(
        select(TopUpRequest).where(TopUpRequest.status == "pending")
        .order_by(TopUpRequest.created_at.desc())
    )
    requests = result.scalars().all()

    out = []
    for r in requests:
        user_result = await db.execute(select(User).where(User.id == r.user_id))
        user = user_result.scalar_one_or_none()
        out.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_name": user.name if user else "",
            "user_phone": user.phone if user else "",
            "user_email": user.email if user else "",
            "user_role": user.role if user else "",
            "amount": r.amount,
            "card_number": r.card_number,
            "receipt_url": r.receipt_url,
            "status": r.status,
            "admin_comment": r.admin_comment,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })
    return out

@router.patch("/admin/topup/{request_id}/approve")
async def approve_topup(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a top-up request and credit user's wallet"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")

    from app.models import TopUpRequest
    result = await db.execute(select(TopUpRequest).where(TopUpRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Заявка не найдена")
    if req.status != "pending":
        raise HTTPException(400, "Заявка уже обработана")

    req.status = "approved"

    # Credit user's wallet
    user_result = await db.execute(select(User).where(User.id == req.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.wallet_balance += req.amount

    await db.commit()
    return {"ok": True, "amount": req.amount, "new_balance": float(user.wallet_balance) if user else 0}

@router.patch("/admin/topup/{request_id}/reject")
async def reject_topup(
    request_id: int,
    data: TopUpAdminAction,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reject a top-up request"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Только для администраторов")

    from app.models import TopUpRequest
    result = await db.execute(select(TopUpRequest).where(TopUpRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Заявка не найдена")
    if req.status != "pending":
        raise HTTPException(400, "Заявка уже обработана")

    req.status = "rejected"
    req.admin_comment = data.comment or "Отклонено администратором"
    await db.commit()
    return {"ok": True}

@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """История транзакций"""
    bonus_result = await db.execute(
        select(BonusTransaction).where(BonusTransaction.user_id == current_user.id)
    )
    bonuses = bonus_result.scalars().all()

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
            "status": str(order.status),
            "order_id": order.id,
            "created_at": order.created_at.isoformat() if order.created_at else None
        })
    history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return history