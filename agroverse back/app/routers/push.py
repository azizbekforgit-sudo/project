"""Подписка на push-уведомления: ключ для браузера, подписаться, отписаться."""
import base64

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import PushSubscription, User
from app.push import get_keys

router = APIRouter(prefix="/api/push", tags=["push"])


class SubKeys(BaseModel):
    p256dh: str = Field(..., max_length=200)
    auth: str = Field(..., max_length=100)


class SubscribeIn(BaseModel):
    endpoint: str = Field(..., min_length=10, max_length=2000)
    keys: SubKeys
    lang: str = "uz"


class UnsubscribeIn(BaseModel):
    endpoint: str = Field(..., max_length=2000)


def _valid_keys(keys: SubKeys) -> bool:
    """Ключи браузера: p256dh — точка на кривой P-256 (65 байт), auth — 16 байт."""
    try:
        dec = lambda v: base64.urlsafe_b64decode(v + "=" * (-len(v) % 4))
        p256dh, auth = dec(keys.p256dh), dec(keys.auth)
        if len(p256dh) != 65 or p256dh[0] != 4 or len(auth) != 16:
            return False
        from cryptography.hazmat.primitives.asymmetric import ec
        ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), p256dh)
        return True
    except Exception:
        return False


@router.get("/key")
async def public_key():
    pub, _ = await get_keys()
    return {"public_key": pub}


@router.post("/subscribe")
async def subscribe(data: SubscribeIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not data.endpoint.startswith("https://") or not _valid_keys(data.keys):
        return {"ok": False}
    lang = data.lang if data.lang in ("uz", "ru", "en") else "uz"
    sub = (await db.execute(select(PushSubscription).where(PushSubscription.endpoint == data.endpoint))).scalar_one_or_none()
    if sub:
        # то же устройство: мог войти другой человек или поменяться язык
        sub.user_id, sub.p256dh, sub.auth, sub.lang = current_user.id, data.keys.p256dh, data.keys.auth, lang
    else:
        db.add(PushSubscription(user_id=current_user.id, endpoint=data.endpoint,
                                p256dh=data.keys.p256dh, auth=data.keys.auth, lang=lang))
    await db.commit()
    return {"ok": True}


@router.post("/unsubscribe")
async def unsubscribe(data: UnsubscribeIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(PushSubscription).where(
        PushSubscription.endpoint == data.endpoint, PushSubscription.user_id == current_user.id))
    await db.commit()
    return {"ok": True}
