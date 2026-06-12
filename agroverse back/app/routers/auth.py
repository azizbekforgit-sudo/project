from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserRegister, UserLogin, OTPSend, OTPVerify, Token
from app.auth import (
    get_password_hash, verify_password, create_access_token, 
    create_refresh_token, generate_otp, store_otp, verify_otp
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Проверка существующего пользователя
    result = await db.execute(select(User).where(User.phone == user_data.phone))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    # Создание пользователя
    new_user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        tariff="standart",
        bonus_points=20 if user_data.role == "xaridor" else 0
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Создание токенов
    access_token = create_access_token({"sub": str(new_user.id)})
    refresh_token = create_refresh_token({"sub": str(new_user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "phone": new_user.phone,
            "email": new_user.email,
            "role": new_user.role.value if new_user.role else "xaridor"
        }
    }

@router.post("/login")
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == login_data.phone))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail={
                "blocked": True,
                "reason": user.block_reason or "Причина не указана",
            },
        )
    
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Возвращаем вместе с токеном данные пользователя
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "role": user.role.value if user.role else "xaridor"
        }
    }
@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "role": current_user.role.value if current_user.role else None,
        "tariff": current_user.tariff.value if current_user.tariff else None,
        "bonus_points": current_user.bonus_points,
        "wallet_balance": float(current_user.wallet_balance),
        "is_active": current_user.is_active
    }

from pydantic import BaseModel as _BM
class ProfileUpdate(_BM):
    name: str | None = None
    email: str | None = None

@router.patch("/me")
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Редактирование профиля (имя, email)"""
    if data.name is not None and data.name.strip():
        current_user.name = data.name.strip()
    if data.email is not None:
        current_user.email = data.email.strip() or None
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "role": current_user.role.value if current_user.role else None,
        "tariff": current_user.tariff.value if current_user.tariff else None,
        "bonus_points": current_user.bonus_points,
        "wallet_balance": float(current_user.wallet_balance),
    }

@router.post("/otp/send")
async def send_otp(otp_data: OTPSend):
    code = generate_otp()
    store_otp(otp_data.phone, code)
    print(f"📱 OTP для {otp_data.phone}: {code}")
    return {"message": "OTP sent successfully"}

@router.post("/otp/verify")
async def verify_otp_code(otp_data: OTPVerify, db: AsyncSession = Depends(get_db)):
    if not verify_otp(otp_data.phone, otp_data.code):
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    result = await db.execute(select(User).where(User.phone == otp_data.phone))
    user = result.scalar_one_or_none()
    
    if not user:
        new_user = User(
            name=otp_data.phone,
            phone=otp_data.phone,
            password_hash=get_password_hash("temporary"),
            role="xaridor"
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        user = new_user
    
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(access_token=access_token, refresh_token=refresh_token)