from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.database import get_db
from app.models import (
    User, Order, Chat, ChatMessage, DeliveryRequest,
    ChatType, UserRole
)
from app.schemas import (
    ChatCreate, ChatResponse, ChatParticipant,
    MessageCreate, ChatMessageResponse
)
from app.dependencies import get_current_user, get_current_admin
import re
import os
import uuid

router = APIRouter(prefix="/api", tags=["chats"])

# Phone number detection regex
PHONE_PATTERN = re.compile(
    r'(\+?\d{1,3}[\s\-]?)?'
    r'(\(?\d{2,4}\)?[\s\-]?)?'
    r'\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}'
    r'|\b\d{7,15}\b'
)


def contains_phone(text: str) -> bool:
    normalized = re.sub(r'[\s\-\(\)\+]', '', text)
    if re.match(r'^\d{7,15}$', normalized):
        return True
    return bool(PHONE_PATTERN.search(text))


def participant_dict(user: User) -> ChatParticipant:
    return ChatParticipant(
        id=user.id,
        name=user.name,
        role=user.role,
        phone=user.phone
    )


@router.post("/chats", response_model=ChatResponse)
async def create_chat(
    data: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate order exists
    order_result = await db.execute(select(Order).where(Order.id == data.order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Determine participants based on chat type
    chat_type = data.type
    if chat_type == ChatType.BUYER_FARMER:
        if current_user.id not in (order.xaridor_id, order.fermer_id):
            raise HTTPException(status_code=403, detail="Вы не участник этого заказа")
        a_id, b_id = order.xaridor_id, order.fermer_id
    elif chat_type == ChatType.BUYER_DRIVER:
        if current_user.id != order.xaridor_id:
            raise HTTPException(status_code=403, detail="Только покупатель может начать чат с драйвером")
        if not order.driver_candidate_id:
            raise HTTPException(status_code=400, detail="Драйвер ещё не выбран как кандидат")
        a_id, b_id = order.xaridor_id, order.driver_candidate_id
    elif chat_type == ChatType.DRIVER_FARMER:
        if current_user.id != order.driver_candidate_id:
            raise HTTPException(status_code=403, detail="Только драйвер-кандидат может начать чат с фермером")
        a_id, b_id = order.driver_candidate_id, order.fermer_id
    else:
        raise HTTPException(status_code=400, detail="Неверный тип чата")

    # Check for existing chat
    existing = await db.execute(
        select(Chat).where(
            Chat.order_id == data.order_id,
            Chat.type == chat_type,
            Chat.status == "active"
        )
    )
    existing_chat = existing.scalar_one_or_none()
    if existing_chat:
        return await _build_chat_response(existing_chat, current_user.id, db)

    # Create new chat
    new_chat = Chat(
        order_id=data.order_id,
        type=chat_type,
        participant_a_id=a_id,
        participant_b_id=b_id,
        status="active"
    )
    db.add(new_chat)
    await db.commit()
    await db.refresh(new_chat)

    return await _build_chat_response(new_chat, current_user.id, db)


@router.get("/chats", response_model=list[ChatResponse])
async def list_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Chat).where(
            or_(
                Chat.participant_a_id == current_user.id,
                Chat.participant_b_id == current_user.id
            ),
            Chat.status == "active"
        ).order_by(Chat.created_at.desc())
    )
    chats = result.scalars().all()

    responses = []
    for chat in chats:
        responses.append(await _build_chat_response(chat, current_user.id, db))
    return responses


@router.get("/chats/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    if current_user.id not in (chat.participant_a_id, chat.participant_b_id):
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Нет доступа к этому чату")

    return await _build_chat_response(chat, current_user.id, db)


@router.get("/chats/{chat_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    chat_id: int,
    before: int = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate access
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    if current_user.id not in (chat.participant_a_id, chat.participant_b_id):
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Нет доступа к этому чату")

    query = select(ChatMessage).where(ChatMessage.chat_id == chat_id)
    if before:
        query = query.where(ChatMessage.id < before)
    query = query.order_by(ChatMessage.created_at.desc()).limit(limit)

    result = await db.execute(query)
    messages = result.scalars().all()
    messages.reverse()

    # Get sender names
    sender_ids = list({m.sender_id for m in messages})
    senders_result = await db.execute(select(User).where(User.id.in_(sender_ids)))
    senders_map = {u.id: u for u in senders_result.scalars().all()}

    return [
        ChatMessageResponse(
            id=m.id,
            chat_id=m.chat_id,
            sender_id=m.sender_id,
            sender_name=senders_map.get(m.sender_id, User(name="Unknown")).name,
            type=m.type,
            content=m.content,
            is_blocked=m.is_blocked,
            created_at=m.created_at
        )
        for m in messages
    ]


@router.post("/chats/{chat_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    chat_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate access
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    if current_user.id not in (chat.participant_a_id, chat.participant_b_id):
        raise HTTPException(status_code=403, detail="Вы не участник этого чата")

    if chat.status != "active":
        raise HTTPException(status_code=400, detail="Чат закрыт")

    # Phone number check (only for text messages)
    is_blocked = False
    if data.type == "text" and contains_phone(data.content):
        is_blocked = True

    new_msg = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        type=data.type,
        content=data.content if not is_blocked else "",
        is_blocked=is_blocked
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    if is_blocked:
        return ChatMessageResponse(
            id=new_msg.id,
            chat_id=new_msg.chat_id,
            sender_id=new_msg.sender_id,
            sender_name=current_user.name,
            type=new_msg.type,
            content="",
            is_blocked=True,
            created_at=new_msg.created_at
        )

    return ChatMessageResponse(
        id=new_msg.id,
        chat_id=new_msg.chat_id,
        sender_id=new_msg.sender_id,
        sender_name=current_user.name,
        type=new_msg.type,
        content=new_msg.content,
        is_blocked=False,
        created_at=new_msg.created_at
    )


@router.get("/chats/{chat_id}/unread")
async def get_unread_count(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    if current_user.id not in (chat.participant_a_id, chat.participant_b_id):
        raise HTTPException(status_code=403, detail="Нет доступа")

    return {"unread_count": 0}


@router.post("/chats/{chat_id}/upload")
async def upload_chat_file(
    chat_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate access
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    if current_user.id not in (chat.participant_a_id, chat.participant_b_id):
        raise HTTPException(status_code=403, detail="Вы не участник этого чата")

    # Save file
    upload_dir = os.path.join("uploads", "chats", str(chat_id))
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/uploads/chats/{chat_id}/{filename}"
    return {"url": url, "filename": filename}


# ─── Admin endpoints ────────────────────────────────────────────────────────

@router.get("/admin/chats", response_model=list[ChatResponse])
async def admin_list_chats(
    order_id: int = None,
    user_id: int = None,
    chat_type: str = None,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(Chat)
    if order_id:
        query = query.where(Chat.order_id == order_id)
    if user_id:
        query = query.where(
            or_(Chat.participant_a_id == user_id, Chat.participant_b_id == user_id)
        )
    if chat_type:
        query = query.where(Chat.type == chat_type)

    query = query.order_by(Chat.created_at.desc())
    result = await db.execute(query)
    chats = result.scalars().all()

    responses = []
    for chat in chats:
        responses.append(await _build_chat_response(chat, current_user.id, db))
    return responses


@router.get("/admin/chats/{chat_id}/messages", response_model=list[ChatMessageResponse])
async def admin_get_messages(
    chat_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Чат не найден")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(100)
    )
    messages = result.scalars().all()
    messages.reverse()

    sender_ids = list({m.sender_id for m in messages})
    senders_result = await db.execute(select(User).where(User.id.in_(sender_ids)))
    senders_map = {u.id: u for u in senders_result.scalars().all()}

    return [
        ChatMessageResponse(
            id=m.id,
            chat_id=m.chat_id,
            sender_id=m.sender_id,
            sender_name=senders_map.get(m.sender_id, User(name="Unknown")).name,
            type=m.type,
            content=m.content,
            is_blocked=m.is_blocked,
            created_at=m.created_at
        )
        for m in messages
    ]


# ─── Helpers ────────────────────────────────────────────────────────────────

async def _build_chat_response(chat: Chat, current_user_id: int, db: AsyncSession) -> ChatResponse:
    a_result = await db.execute(select(User).where(User.id == chat.participant_a_id))
    a_user = a_result.scalar_one()
    b_result = await db.execute(select(User).where(User.id == chat.participant_b_id))
    b_user = b_result.scalar_one()

    # Get order info
    from app.models import Product
    order_result = await db.execute(select(Order).where(Order.id == chat.order_id))
    order = order_result.scalar_one()
    product_title = None
    product_photo = None
    if order:
        p_result = await db.execute(select(Product).where(Product.id == order.product_id))
        product = p_result.scalar_one_or_none()
        if product:
            product_title = product.title
            product_photo = product.photos[0] if product.photos else None

    # Get last message
    last_msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    last_msg = last_msg_result.scalar_one_or_none()
    last_msg_dict = None
    if last_msg:
        sender_result = await db.execute(select(User).where(User.id == last_msg.sender_id))
        sender = sender_result.scalar_one()
        last_msg_dict = {
            "sender_name": sender.name,
            "content": last_msg.content if not last_msg.is_blocked else "[заблокировано]",
            "type": last_msg.type,
            "created_at": last_msg.created_at.isoformat() if last_msg.created_at else None
        }

    return ChatResponse(
        id=chat.id,
        order_id=chat.order_id,
        type=chat.type,
        participant_a=participant_dict(a_user),
        participant_b=participant_dict(b_user),
        status=chat.status,
        last_message=last_msg_dict,
        unread_count=0,
        order_product_title=product_title,
        order_product_photo=product_photo,
        created_at=chat.created_at
    )
