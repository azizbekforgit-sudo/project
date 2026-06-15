from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.config import settings
import random

# bcrypt напрямую (без passlib) — совместимо с любой версией bcrypt.
# bcrypt ограничен 72 байтами, поэтому пароль безопасно усекаем.
def _to_72(password: str) -> bytes:
    return password.encode("utf-8")[:72]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        hashed = hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password
        return bcrypt.checkpw(_to_72(plain_password), hashed)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_to_72(password), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"

# Временное хранилище OTP (в продакшене использовать Redis)
otp_storage = {}

def store_otp(phone: str, code: str):
    otp_storage[phone] = {"code": code, "expires_at": datetime.utcnow() + timedelta(minutes=5)}

def verify_otp(phone: str, code: str) -> bool:
    stored = otp_storage.get(phone)
    if not stored:
        return False
    if stored["expires_at"] < datetime.utcnow():
        del otp_storage[phone]
        return False
    if stored["code"] == code:
        del otp_storage[phone]
        return True
    return False
