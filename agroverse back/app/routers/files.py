"""Отдача загруженных файлов из базы: GET /api/files/<id>."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import StoredFile
from app.storage import _ID_RE

router = APIRouter(prefix="/api/files", tags=["files"])

# картинки показываем прямо в браузере, всё остальное — только скачиванием,
# чтобы загруженный HTML/SVG не выполнялся на домене API
_INLINE = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}


@router.get("/{file_id}")
async def get_file(file_id: str, db: AsyncSession = Depends(get_db)):
    if not _ID_RE.match(file_id):
        raise HTTPException(status_code=404, detail="Файл не найден")
    row = await db.get(StoredFile, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Файл не найден")
    headers = {
        # id уникален и файл по нему не меняется — браузер может кэшировать навсегда
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    }
    media_type = row.content_type
    if media_type not in _INLINE:
        media_type = "application/octet-stream"
        headers["Content-Disposition"] = f'attachment; filename="{row.filename or "file"}"'
    return Response(content=row.data, media_type=media_type, headers=headers)
