from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from typing import Optional, List
import os
import shutil
from datetime import datetime
from app.database import get_db
from app.models import User, Product, UserRole, ProductStatus, BonusTransaction
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.dependencies import get_current_user, get_current_fermer
from app.config import settings
try:
    from PIL import Image
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

router = APIRouter(prefix="/api/products", tags=["products"])

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
}

# ── OPTIONS preflight для всех эндпоинтов роутера ──
@router.options("/")
@router.options("/{rest:path}")
async def products_options(rest: str = ""):
    return Response(status_code=200, headers=CORS_HEADERS)


# Вспомогательная функция сохранения фото
async def save_photo(file: UploadFile, product_id: int) -> str:
    product_dir = os.path.join(settings.upload_dir, "products", str(product_id))
    os.makedirs(product_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(product_dir, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return f"/uploads/products/{product_id}/{filename}"


@router.get("/", response_model=ProductListResponse)
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    fermer_id: Optional[int] = None,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Просмотр каталога товаров (доступен всем, только активные товары)"""
    query = select(Product).where(
        Product.status.in_([ProductStatus.ACTIVE, ProductStatus.PENDING])
    )
    if fermer_id:
        query = query.where(Product.fermer_id == fermer_id)
    if category:
        query = query.where(Product.category == category)
    if min_price:
        query = query.where(Product.price_per_unit >= min_price)
    if max_price:
        query = query.where(Product.price_per_unit <= max_price)
    if search:
        query = query.where(
            or_(
                Product.title.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )

    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    products = result.scalars().all()

    product_responses = []
    for product in products:
        fermer_result = await db.execute(select(User).where(User.id == product.fermer_id))
        fermer = fermer_result.scalar_one()

        product_responses.append(ProductResponse(
            id=product.id,
            fermer_id=product.fermer_id,
            fermer_name=fermer.name,
            fermer_rating=fermer.bonus_points,
            title=product.title,
            description=product.description,
            category=product.category,
            price_per_unit=float(product.price_per_unit),
            unit=product.unit,
            quantity_available=float(product.quantity_available),
            photos=product.photos or [],
            rating=product.rating,
            status=product.status,
            created_at=product.created_at
        ))

    return ProductListResponse(
        total=len(products),
        page=page,
        limit=limit,
        products=product_responses
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Детальная страница товара"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    fermer_result = await db.execute(select(User).where(User.id == product.fermer_id))
    fermer = fermer_result.scalar_one()

    return ProductResponse(
        id=product.id,
        fermer_id=product.fermer_id,
        fermer_name=fermer.name,
        fermer_rating=fermer.bonus_points,
        title=product.title,
        description=product.description,
        category=product.category,
        price_per_unit=float(product.price_per_unit),
        unit=product.unit,
        quantity_available=float(product.quantity_available),
        photos=product.photos or [],
        rating=product.rating,
        status=product.status,
        created_at=product.created_at
    )


@router.post("/", response_model=ProductResponse)
async def create_product(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price_per_unit: float = Form(...),
    unit: str = Form(...),
    quantity_available: float = Form(...),
    photos: List[UploadFile] = File(default_factory=list),
    current_user: User = Depends(get_current_fermer),
    db: AsyncSession = Depends(get_db)
):
    """
    Публикация товара фермером
    - Проверка тарифа (лимит товаров)
    - Загрузка фото
    - Статус pending (ожидает модерации)
    - Начисление бонусов
    """
    tariff_limits = {
        "standart": 5,
        "normal": 30,
        "premium": 999999
    }
    max_products = tariff_limits.get(current_user.tariff, 5)

    result = await db.execute(
        select(Product).where(
            Product.fermer_id == current_user.id,
            Product.status.in_([ProductStatus.ACTIVE, ProductStatus.PENDING])
        )
    )
    active_products = result.scalars().all()

    if len(active_products) >= max_products:
        raise HTTPException(
            status_code=403,
            detail=f"Превышен лимит товаров для тарифа {current_user.tariff}. Максимум: {max_products}"
        )

    new_product = Product(
        fermer_id=current_user.id,
        title=title,
        description=description,
        category=category,
        price_per_unit=price_per_unit,
        unit=unit,
        quantity_available=quantity_available,
        status=ProductStatus.PENDING
    )
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)

    photo_urls = []
    valid_photos = [p for p in (photos or []) if getattr(p, "filename", None)]
    for i, photo in enumerate(valid_photos[:10]):
        url = await save_photo(photo, new_product.id)
        photo_urls.append(url)

    new_product.photos = photo_urls
    await db.commit()

    bonus_txn = BonusTransaction(
        user_id=current_user.id,
        points=10,
        reason=f"Добавление товара: {title}"
    )
    db.add(bonus_txn)
    current_user.bonus_points += 10
    await db.commit()

    fermer_result = await db.execute(select(User).where(User.id == current_user.id))
    fermer = fermer_result.scalar_one()

    return ProductResponse(
        id=new_product.id,
        fermer_id=new_product.fermer_id,
        fermer_name=fermer.name,
        fermer_rating=fermer.bonus_points,
        title=new_product.title,
        description=new_product.description,
        category=new_product.category,
        price_per_unit=float(new_product.price_per_unit),
        unit=new_product.unit,
        quantity_available=float(new_product.quantity_available),
        photos=new_product.photos or [],
        rating=new_product.rating,
        status=new_product.status,
        created_at=new_product.created_at
    )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновление товара (только автор-фермер)"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.fermer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in product_data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    fermer_result = await db.execute(select(User).where(User.id == product.fermer_id))
    fermer = fermer_result.scalar_one()

    return ProductResponse(
        id=product.id,
        fermer_id=product.fermer_id,
        fermer_name=fermer.name,
        fermer_rating=fermer.bonus_points,
        title=product.title,
        description=product.description,
        category=product.category,
        price_per_unit=float(product.price_per_unit),
        unit=product.unit,
        quantity_available=float(product.quantity_available),
        photos=product.photos or [],
        rating=product.rating,
        status=product.status,
        created_at=product.created_at
    )


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаление товара (фермер свой или админ)"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.fermer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(product)
    await db.commit()

    return {"message": "Product deleted successfully"}


@router.post("/{product_id}/photos")
async def upload_product_photos(
    product_id: int,
    photos: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_fermer),
    db: AsyncSession = Depends(get_db)
):
    """Загрузка фото к товару"""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if not product or product.fermer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    photo_urls = product.photos or []
    for photo in photos[:10]:
        url = await save_photo(photo, product_id)
        photo_urls.append(url)

    product.photos = photo_urls
    await db.commit()

    return {"photos": photo_urls}
