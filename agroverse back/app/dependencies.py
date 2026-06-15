from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.auth import decode_token
from app.models import User, UserRole

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))  # <-- ИСПРАВЛЕНО
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail={
                "blocked": True,
                "reason": user.block_reason or "Причина не указана",
            },
        )
    return user

async def get_current_fermer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.FERMER:
        raise HTTPException(status_code=403, detail="Access denied: Fermer only")
    return current_user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied: Admin only")
    return current_user