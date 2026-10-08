"""Отправка СМС через Eskiz.uz и одноразовые коды подтверждения.

Настройка (переменные окружения на сервере):
  ESKIZ_EMAIL, ESKIZ_PASSWORD — логин в кабинете notify.eskiz.uz
  ESKIZ_FROM                  — имя отправителя (по умолчанию 4546)
Пока они не заданы, вход по СМС выключен, а регистрация работает как раньше.
Текст СМС должен быть одобрен в кабинете Eskiz (шаблон), иначе Eskiz его не отправит.
"""
import hashlib
import hmac
import secrets
import time

import httpx

from app.config import settings

ESKIZ_BASE = "https://notify.eskiz.uz/api"
OTP_TTL = 300          # код живёт 5 минут
OTP_RESEND = 60        # повторная отправка не чаще раза в минуту
OTP_MAX_TRIES = 5      # после 5 неверных попыток код сгорает

_token = {"value": None, "at": 0.0}
_codes: dict[str, dict] = {}   # ключ: f"{purpose}:{phone}"


def sms_enabled() -> bool:
    return bool(settings.eskiz_email and settings.eskiz_password)


def _hash(code: str) -> str:
    return hmac.new(settings.secret_key.encode(), code.encode(), hashlib.sha256).hexdigest()


async def _eskiz_token(client: httpx.AsyncClient, force: bool = False) -> str:
    # токен Eskiz живёт 30 дней; обновляем раз в сутки или по 401
    if not force and _token["value"] and time.time() - _token["at"] < 86400:
        return _token["value"]
    r = await client.post(f"{ESKIZ_BASE}/auth/login",
                          data={"email": settings.eskiz_email, "password": settings.eskiz_password})
    r.raise_for_status()
    _token["value"] = r.json()["data"]["token"]
    _token["at"] = time.time()
    return _token["value"]


async def send_sms(phone: str, text: str) -> None:
    mobile = phone.lstrip("+")
    async with httpx.AsyncClient(timeout=20.0) as client:
        token = await _eskiz_token(client)
        for attempt in range(2):
            r = await client.post(
                f"{ESKIZ_BASE}/message/sms/send",
                headers={"Authorization": f"Bearer {token}"},
                data={"mobile_phone": mobile, "message": text, "from": settings.eskiz_from},
            )
            if r.status_code == 401 and attempt == 0:
                token = await _eskiz_token(client, force=True)
                continue
            r.raise_for_status()
            return


def can_resend(purpose: str, phone: str) -> int:
    """Сколько секунд ждать до повторной отправки (0 — можно)."""
    rec = _codes.get(f"{purpose}:{phone}")
    if not rec:
        return 0
    wait = int(OTP_RESEND - (time.time() - rec["sent_at"]))
    return max(wait, 0)


def new_code(purpose: str, phone: str) -> str:
    code = f"{secrets.randbelow(100000):05d}"
    _codes[f"{purpose}:{phone}"] = {"hash": _hash(code), "exp": time.time() + OTP_TTL,
                                    "tries": 0, "sent_at": time.time()}
    return code


def check_code(purpose: str, phone: str, code: str) -> bool:
    key = f"{purpose}:{phone}"
    rec = _codes.get(key)
    if not rec or rec["exp"] < time.time():
        _codes.pop(key, None)
        return False
    rec["tries"] += 1
    if rec["tries"] > OTP_MAX_TRIES:
        _codes.pop(key, None)
        return False
    if hmac.compare_digest(rec["hash"], _hash((code or "").strip())):
        _codes.pop(key, None)
        return True
    return False


def sms_text(code: str) -> str:
    return f"AgroVerse: tasdiqlash kodi {code}. Kodni hech kimga aytmang."
