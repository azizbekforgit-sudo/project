from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserRegister, UserLogin, OTPSend, OTPVerify, Token, GoogleAuth
from app.auth import (
    get_password_hash, verify_password, create_access_token,
    create_refresh_token
)
from app.dependencies import get_current_user
from app.config import settings
from app import sms
import re
import secrets
import httpx


def clean_phone(raw: str) -> str:
    """+998 (90) 123-45-67 → +998901234567"""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 9:
        digits = "998" + digits
    return "+" + digits if digits else ""


def auth_payload(user: User) -> dict:
    """Одинаковый ответ для всех способов входа."""
    return {
        "access_token": create_access_token({"sub": str(user.id)}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "city": user.city,
            "role": getattr(user.role, "value", user.role) if user.role else "xaridor",
            "wallet_balance": float(user.wallet_balance or 0),
            "bonus_points": user.bonus_points,
        },
    }


def blocked_error(user: User):
    return HTTPException(status_code=403, detail={"blocked": True, "reason": user.block_reason or "Причина не указана"})

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    user_data.phone = clean_phone(user_data.phone)
    if sms.sms_enabled():
        if not user_data.code:
            raise HTTPException(status_code=400, detail="Введите код из СМС")
        if not sms.check_code("register", user_data.phone, user_data.code):
            raise HTTPException(status_code=400, detail="Неверный или устаревший код из СМС")
    result = await db.execute(select(User).where(User.phone == user_data.phone))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    new_user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        city=user_data.city,
        password_hash=get_password_hash(user_data.password),
        plain_password=user_data.password,
        role=user_data.role,
        tariff="standart",
        bonus_points=20 if user_data.role == "xaridor" else 0
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
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
            "city": new_user.city,
            "role": getattr(new_user.role, "value", new_user.role) if new_user.role else "xaridor",
            "wallet_balance": float(new_user.wallet_balance or 0),  # FIX: раньше отсутствовало
            "bonus_points": new_user.bonus_points,
        }
    }

@router.post("/login")
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == clean_phone(login_data.phone)))
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
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
            "city": user.city,
            "plain_password": user.plain_password,
            "role": getattr(user.role, "value", user.role) if user.role else "xaridor",
            "wallet_balance": float(user.wallet_balance or 0),  # FIX: раньше отсутствовало
            "bonus_points": user.bonus_points,
        }
    }

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "city": current_user.city,
        "plain_password": current_user.plain_password,
        "role": getattr(current_user.role, "value", current_user.role) if current_user.role else None,
        "tariff": getattr(current_user.tariff, "value", current_user.tariff) if current_user.tariff else None,
        "bonus_points": current_user.bonus_points,
        "wallet_balance": float(current_user.wallet_balance or 0),
        "is_active": current_user.is_active
    }

from pydantic import BaseModel as _BM
class ProfileUpdate(_BM):
    name: str | None = None
    email: str | None = None
    city: str | None = None

class ChangePassword(_BM):
    current_password: str
    new_password: str = Field(..., min_length=6)

@router.patch("/me")
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Редактирование профиля (имя, email, город)"""
    if data.name is not None and data.name.strip():
        current_user.name = data.name.strip()
    if data.email is not None:
        current_user.email = data.email.strip() or None
    if data.city is not None:
        current_user.city = data.city.strip() or None
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "city": current_user.city,
        "plain_password": current_user.plain_password,
        "role": getattr(current_user.role, "value", current_user.role) if current_user.role else None,
        "tariff": getattr(current_user.tariff, "value", current_user.tariff) if current_user.tariff else None,
        "bonus_points": current_user.bonus_points,
        "wallet_balance": float(current_user.wallet_balance or 0),
    }

@router.post("/otp/send")
async def send_otp(otp_data: OTPSend, db: AsyncSession = Depends(get_db)):
    """Отправить код по СМС: для входа (номер уже есть) или для регистрации (номера ещё нет)."""
    if not sms.sms_enabled():
        raise HTTPException(status_code=503, detail="Вход по СМС пока не настроен")
    phone = clean_phone(otp_data.phone)
    if not re.fullmatch(r"\+\d{10,15}", phone):
        raise HTTPException(status_code=400, detail="Проверьте номер телефона")

    exists = (await db.execute(select(User.id).where(User.phone == phone))).scalar_one_or_none()
    if otp_data.purpose == "login" and not exists:
        raise HTTPException(status_code=404, detail="Этот номер не зарегистрирован")
    if otp_data.purpose == "register" and exists:
        raise HTTPException(status_code=400, detail="Phone already registered")

    wait = sms.can_resend(otp_data.purpose, phone)
    if wait:
        raise HTTPException(status_code=429, detail=f"Подождите {wait} сек. перед новой отправкой")

    code = sms.new_code(otp_data.purpose, phone)
    try:
        await sms.send_sms(phone, sms.sms_text(code))
    except Exception as e:
        print(f"[SMS] ошибка отправки на {phone}: {e}")
        raise HTTPException(status_code=502, detail="Не удалось отправить СМС. Попробуйте позже.")
    return {"message": "Код отправлен", "resend_in": sms.OTP_RESEND}


@router.post("/otp/verify")
async def verify_otp_code(otp_data: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Вход по коду из СМС. Новых пользователей здесь не создаём — для этого есть регистрация."""
    phone = clean_phone(otp_data.phone)
    if not sms.check_code("login", phone, otp_data.code):
        raise HTTPException(status_code=400, detail="Неверный или устаревший код из СМС")
    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Этот номер не зарегистрирован")
    if not user.is_active:
        raise blocked_error(user)
    return auth_payload(user)


@router.post("/google")
async def google_auth(data: GoogleAuth, db: AsyncSession = Depends(get_db)):
    """Вход через Google. Если такого пользователя нет — просим телефон и роль
    (телефон нужен: его видит вторая сторона заказа)."""
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Вход через Google пока не настроен")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": data.credential})
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Google не отвечает. Попробуйте ещё раз.")
    info = r.json() if r.status_code == 200 else {}
    if (info.get("aud") != settings.google_client_id
            or info.get("iss") not in ("accounts.google.com", "https://accounts.google.com")
            or str(info.get("email_verified")).lower() != "true"
            or not info.get("email")):
        raise HTTPException(status_code=401, detail="Google не подтвердил вход")

    email = info["email"].lower()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user:
        if not user.is_active:
            raise blocked_error(user)
        return auth_payload(user)

    # новый пользователь: нужен телефон и роль
    if not data.phone or not data.role:
        return {"need_profile": True, "email": email, "name": info.get("name") or email.split("@")[0]}
    phone = clean_phone(data.phone)
    if not re.fullmatch(r"\+\d{10,15}", phone):
        raise HTTPException(status_code=400, detail="Проверьте номер телефона")
    if data.role not in ("xaridor", "fermer"):
        raise HTTPException(status_code=400, detail="Выберите: покупатель или фермер")
    if sms.sms_enabled() and not sms.check_code("register", phone, data.code or ""):
        raise HTTPException(status_code=400, detail="Неверный или устаревший код из СМС")
    if (await db.execute(select(User.id).where(User.phone == phone))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone already registered")

    user = User(
        name=(info.get("name") or email.split("@")[0])[:100],
        phone=phone,
        email=email,
        password_hash=get_password_hash(secrets.token_urlsafe(24)),  # пароль не нужен, вход через Google
        role=data.role,
        tariff="standart",
        bonus_points=20 if data.role == "xaridor" else 0,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return auth_payload(user)

@router.post("/change-password")
async def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Смена пароля"""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    current_user.password_hash = get_password_hash(data.new_password)
    current_user.plain_password = data.new_password
    await db.commit()
    
    return {"message": "Пароль успешно изменён"}