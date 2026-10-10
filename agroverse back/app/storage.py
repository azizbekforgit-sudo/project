"""Хранение загруженных файлов в Postgres (таблица stored_files).

Раньше файлы лежали в папке uploads/ на диске сервера. На Render этот диск
временный: после каждого деплоя (git push) он очищается, и все фото товаров
пропадали. База данных при деплое не сбрасывается, поэтому храним файлы в ней.

Фото уменьшаем до 1600 px по длинной стороне и пережимаем в JPEG — снимок
с телефона в 4–8 МБ превращается примерно в 200–400 КБ.
"""
import io
import re
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import StoredFile

MAX_UPLOAD = 15 * 1024 * 1024   # больше с телефона не принимаем
IMAGE_MAX_SIDE = 1600
URL_PREFIX = "/api/files/"
_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def _shrink_image(data: bytes):
    """(байты, content_type) уменьшенной картинки или None, если это не картинка."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        return None
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
        im = ImageOps.exif_transpose(im)   # фото с телефона часто «лежат на боку»
        im.thumbnail((IMAGE_MAX_SIDE, IMAGE_MAX_SIDE))
        out = io.BytesIO()
        has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        if has_alpha:
            im.convert("RGBA").save(out, "WEBP", quality=85)
            return out.getvalue(), "image/webp"
        im.convert("RGB").save(out, "JPEG", quality=82, optimize=True, progressive=True)
        return out.getvalue(), "image/jpeg"
    except Exception:
        return None


async def save_upload(db: AsyncSession, file: UploadFile, kind: str,
                      owner_id: int | None = None, images_only: bool = False) -> str:
    """Сохраняет файл в базу и возвращает ссылку /api/files/<id>.
    Коммит делает вызывающий код — вместе с остальными изменениями."""
    data = await file.read(MAX_UPLOAD + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 15 МБ)")

    shrunk = _shrink_image(data)
    if shrunk:
        data, content_type = shrunk
    elif images_only:
        raise HTTPException(status_code=400, detail="Можно загрузить только фото (JPG, PNG, WEBP)")
    else:
        content_type = (file.content_type or "application/octet-stream")[:100]

    name = re.sub(r"[^A-Za-z0-9._-]", "_", (file.filename or "file"))[-120:] or "file"
    row = StoredFile(id=uuid.uuid4().hex, kind=kind, owner_id=owner_id, filename=name,
                     content_type=content_type, size=len(data), data=data)
    db.add(row)
    return URL_PREFIX + row.id


def file_id_from_url(url: str | None) -> str | None:
    if not url or not isinstance(url, str):
        return None
    tail = url.rsplit(URL_PREFIX, 1)[-1] if URL_PREFIX in url else ""
    return tail if _ID_RE.match(tail) else None


async def delete_by_urls(db: AsyncSession, urls) -> None:
    ids = [i for i in (file_id_from_url(u) for u in (urls or [])) if i]
    if ids:
        await db.execute(delete(StoredFile).where(StoredFile.id.in_(ids)))
