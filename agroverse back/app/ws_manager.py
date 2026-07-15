from fastapi import WebSocket
from typing import Dict, Set
import json


class ConnectionManager:
    """Центральный реестр активных WebSocket соединений."""

    def __init__(self):
        # user_id -> набор активных сокетов (юзер может быть открыт в нескольких вкладках)
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        """Отправить сообщение всем активным соединениям пользователя."""
        connections = self.active_connections.get(user_id, set()).copy()
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                # Соединение мёртвое — удаляем
                self.active_connections.get(user_id, set()).discard(ws)

    def is_online(self, user_id: int) -> bool:
        return bool(self.active_connections.get(user_id))


manager = ConnectionManager()
