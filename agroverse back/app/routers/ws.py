from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth import decode_token
from app.ws_manager import manager
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User
import asyncio

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """WebSocket эндпоинт для реалтайм-доставки сообщений."""

    # Проверяем токен
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Проверяем что пользователь существует и активен
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            await websocket.close(code=4003, reason="User not found or blocked")
            return

    # Подключаем
    await manager.connect(user_id, websocket)

    # Пинг каждые 30 сек для поддержания соединения
    async def ping_loop():
        try:
            while True:
                await asyncio.sleep(30)
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
        except asyncio.CancelledError:
            pass

    ping_task = asyncio.create_task(ping_loop())

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ping_task.cancel()
        manager.disconnect(user_id, websocket)
