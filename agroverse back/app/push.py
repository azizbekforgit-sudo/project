"""Push-уведомления (Web Push): новое сообщение, новый заказ, ответ продавца.

Как это работает:
  * браузер подписывается (sw.js + js/push.js на сайте) и присылает нам адрес и ключи;
  * мы шифруем короткий текст и отправляем его на этот адрес (сервер Google, Apple
    или Mozilla), а он доставляет уведомление на телефон, даже если сайт закрыт.

Ключи VAPID (ими сервер подписывает уведомления) берутся из VAPID_PUBLIC_KEY /
VAPID_PRIVATE_KEY, а если их нет — создаются один раз и хранятся в базе
(таблица app_settings), поэтому переживают любые деплои.

Отправка идёт в фоне: ответ на «отправить сообщение» не ждёт уведомления.
"""
import asyncio
import base64
import json

from sqlalchemy import delete, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import AppSetting, PushSubscription

_keys = None            # (public_b64url, private_b64url)
_tasks = set()          # держим ссылки на фоновые задачи, чтобы их не собрал сборщик мусора


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _generate_keys():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec

    private = ec.generate_private_key(ec.SECP256R1())
    priv_raw = private.private_numbers().private_value.to_bytes(32, "big")
    pub_raw = private.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    return _b64url(pub_raw), _b64url(priv_raw)


async def get_keys():
    """(публичный, приватный) ключ VAPID в base64url."""
    global _keys
    if _keys:
        return _keys
    if settings.vapid_public_key and settings.vapid_private_key:
        _keys = (settings.vapid_public_key, settings.vapid_private_key)
        return _keys
    async with AsyncSessionLocal() as db:
        rows = {r.key: r.value for r in (await db.execute(
            select(AppSetting).where(AppSetting.key.in_(("vapid_public", "vapid_private")))
        )).scalars()}
        if "vapid_public" not in rows or "vapid_private" not in rows:
            pub, priv = _generate_keys()
            # merge: если два экземпляра сервера стартуют одновременно, не упадём на дубле
            await db.merge(AppSetting(key="vapid_public", value=pub))
            await db.merge(AppSetting(key="vapid_private", value=priv))
            await db.commit()
            rows = {"vapid_public": pub, "vapid_private": priv}
            print("[PUSH] Созданы ключи VAPID и сохранены в базе")
    _keys = (rows["vapid_public"], rows["vapid_private"])
    return _keys


# ── Тексты уведомлений ──────────────────────────────────────────────
_T = {
    "uz": {
        "photo": "📷 Rasm", "voice": "🎤 Ovozli xabar", "location": "📍 Joylashuv",
        "new_order": "Yangi buyurtma", "order_body": "{buyer}: {product} — {qty}",
        "sold": "Buyurtma tasdiqlandi", "sold_body": "{product}: sotuvchi «Sotildi» deb belgiladi",
        "rejected": "Buyurtma rad etildi", "rejected_body": "{product}: sotuvchi buyurtmani rad etdi",
        "cancelled": "Buyurtma bekor qilindi", "cancelled_body": "{product}: xaridor buyurtmani bekor qildi",
    },
    "ru": {
        "photo": "📷 Фото", "voice": "🎤 Голосовое сообщение", "location": "📍 Место",
        "new_order": "Новый заказ", "order_body": "{buyer}: {product} — {qty}",
        "sold": "Заказ подтверждён", "sold_body": "{product}: продавец отметил «Продано»",
        "rejected": "Заказ отклонён", "rejected_body": "{product}: продавец отклонил заказ",
        "cancelled": "Заказ отменён", "cancelled_body": "{product}: покупатель отменил заказ",
    },
    "en": {
        "photo": "📷 Photo", "voice": "🎤 Voice message", "location": "📍 Location",
        "new_order": "New order", "order_body": "{buyer}: {product} — {qty}",
        "sold": "Order confirmed", "sold_body": "{product}: the seller marked it as sold",
        "rejected": "Order declined", "rejected_body": "{product}: the seller declined the order",
        "cancelled": "Order cancelled", "cancelled_body": "{product}: the buyer cancelled the order",
    },
}


def _text(lang: str, key: str, **kw) -> str:
    return (_T.get(lang) or _T["uz"])[key].format(**kw)


def _message_payload(lang: str, sender: str, msg_type: str, content: str, chat_id: int) -> dict:
    if msg_type in ("photo", "voice", "location"):
        body = _text(lang, msg_type)
    else:
        body = (content or "").strip()
        if len(body) > 160:
            body = body[:157] + "…"
    return {"title": sender, "body": body, "url": f"/#/chats/{chat_id}", "tag": f"chat-{chat_id}"}


# ── Отправка ─────────────────────────────────────────────────────────
def _send_one(sub: dict, payload: str, private_key: str) -> int:
    """Синхронная отправка одного уведомления. Возвращает HTTP-статус (0 — сеть)."""
    from pywebpush import WebPushException, webpush
    try:
        resp = webpush(
            subscription_info=sub,
            data=payload,
            vapid_private_key=private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=24 * 3600,
            headers={"Urgency": "high"},
            timeout=10,
        )
        return getattr(resp, "status_code", 201)
    except WebPushException as e:
        return getattr(e.response, "status_code", 0) or 0
    except Exception as e:  # сеть, неверные ключи подписки и т. п. — не роняем сайт
        print(f"[PUSH] ошибка отправки: {e}")
        return 0


async def _deliver(user_id: int, build) -> None:
    """build(lang) -> dict уведомления. Шлём на все устройства человека."""
    try:
        _, private_key = await get_keys()
        async with AsyncSessionLocal() as db:
            subs = (await db.execute(
                select(PushSubscription).where(PushSubscription.user_id == user_id)
            )).scalars().all()
            gone = []
            for s in subs:
                info = {"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}
                payload = json.dumps(build(s.lang or "uz"), ensure_ascii=False)
                status = await asyncio.to_thread(_send_one, info, payload, private_key)
                if status in (404, 410):      # подписка больше не действует (удалили сайт, сменили браузер)
                    gone.append(s.id)
            if gone:
                await db.execute(delete(PushSubscription).where(PushSubscription.id.in_(gone)))
                await db.commit()
    except Exception as e:
        print(f"[PUSH] уведомление пользователю {user_id} не отправлено: {e}")


def _background(coro) -> None:
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


# ── То, что вызывают роутеры ─────────────────────────────────────────
def notify_message(recipient_id: int, sender_name: str, msg_type: str, content: str, chat_id: int) -> None:
    _background(_deliver(recipient_id, lambda lang: _message_payload(lang, sender_name, msg_type, content, chat_id)))


def notify_new_order(seller_id: int, buyer_name: str, product_title: str, qty: str) -> None:
    _background(_deliver(seller_id, lambda lang: {
        "title": _text(lang, "new_order"),
        "body": _text(lang, "order_body", buyer=buyer_name, product=product_title, qty=qty),
        "url": "/#/orders?tab=sales", "tag": "orders-sales",
    }))


def notify_order_status(user_id: int, kind: str, product_title: str) -> None:
    """kind: sold | rejected (покупателю) или cancelled (продавцу)."""
    url = "/#/orders?tab=sales" if kind == "cancelled" else "/#/orders"
    _background(_deliver(user_id, lambda lang: {
        "title": _text(lang, kind),
        "body": _text(lang, kind + "_body", product=product_title),
        "url": url, "tag": f"order-{kind}",
    }))
