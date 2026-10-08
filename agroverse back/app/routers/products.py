from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func, update
from typing import Optional, List
import os
import re
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

async def save_photo(file: UploadFile, product_id: int) -> str:
    product_dir = os.path.join(settings.upload_dir, "products", str(product_id))
    os.makedirs(product_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Имя с телефона может содержать пробелы, кириллицу и «/» — оставляем безопасные символы
    original = os.path.basename(file.filename or "photo.jpg")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", original)[-80:] or "photo.jpg"
    filename = f"{timestamp}_{safe_name}"
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
    base_query = select(Product).where(
        Product.status.in_([ProductStatus.ACTIVE, ProductStatus.PENDING])
    )
    if fermer_id:
        base_query = base_query.where(Product.fermer_id == fermer_id)
    if category:
        base_query = base_query.where(Product.category == category)
    if min_price:
        base_query = base_query.where(Product.price_per_unit >= min_price)
    if max_price:
        base_query = base_query.where(Product.price_per_unit <= max_price)
    if search:
        base_query = base_query.where(
            or_(
                Product.title.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )

    # FIX: считаем реальный total отдельным запросом
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    offset = (page - 1) * limit
    paged_query = base_query.offset(offset).limit(limit)
    result = await db.execute(paged_query)
    products = result.scalars().all()

    # FIX: batch-load farmers to avoid N+1 queries
    fermer_ids = list({p.fermer_id for p in products})
    fermers_result = await db.execute(select(User).where(User.id.in_(fermer_ids)))
    fermers_map = {u.id: u for u in fermers_result.scalars().all()}

    product_responses = []
    for product in products:
        fermer = fermers_map.get(product.fermer_id)
        fermer_name = fermer.name if fermer else "Unknown"
        fermer_rating = float(fermer.bonus_points) if fermer else 0
        product_responses.append(ProductResponse(
            id=product.id,
            fermer_id=product.fermer_id,
            fermer_name=fermer_name,
            fermer_rating=fermer_rating,
            title=product.title,
            description=product.description,
            category=product.category,
            price_per_unit=float(product.price_per_unit),
            unit=product.unit,
            quantity_available=float(product.quantity_available),
            photos=product.photos or [],
            rating=product.rating,
            status=product.status,
            delivery_available=product.delivery_available or False,
            is_demo=bool(getattr(product, 'is_demo', False)),
            pickup_location=getattr(product, 'pickup_location', '') or '',
            created_at=product.created_at
        ))

    return ProductListResponse(
        total=total,
        page=page,
        limit=limit,
        products=product_responses
    )

@router.get("/my", response_model=ProductListResponse)
async def get_my_products(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Product).where(Product.fermer_id == current_user.id).order_by(Product.id.desc())
    )
    products = result.scalars().all()

    product_responses = []
    for product in products:
        product_responses.append(ProductResponse(
            id=product.id,
            fermer_id=product.fermer_id,
            fermer_name=current_user.name,
            fermer_rating=current_user.bonus_points,
            title=product.title,
            description=product.description,
            category=product.category,
            price_per_unit=float(product.price_per_unit),
            unit=product.unit,
            quantity_available=float(product.quantity_available),
            photos=product.photos or [],
            rating=product.rating,
            status=product.status,
            delivery_available=product.delivery_available or False,
            is_demo=bool(getattr(product, 'is_demo', False)),
            pickup_location=getattr(product, 'pickup_location', '') or '',
            created_at=product.created_at
        ))

    return ProductListResponse(
        total=len(products),
        page=1,
        limit=len(products),
        products=product_responses
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
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
        delivery_available=product.delivery_available or False,
        is_demo=bool(getattr(product, 'is_demo', False)),
        pickup_location=getattr(product, 'pickup_location', '') or '',
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
    delivery_available: bool = Form(False),
    pickup_location: str = Form(""),
    photos: List[UploadFile] = File(default_factory=list),
    current_user: User = Depends(get_current_fermer),
    db: AsyncSession = Depends(get_db)
):
    tariff_limits = {
        "standart": 5,
        "normal": 30,
        "premium": 999999
    }
    # FIX: используем .value чтобы получить строку из Enum
    tariff_key = current_user.tariff.value if hasattr(current_user.tariff, 'value') else str(current_user.tariff)
    max_products = tariff_limits.get(tariff_key, 5)

    result = await db.execute(
        select(Product).where(
            Product.fermer_id == current_user.id,
            Product.status.in_([ProductStatus.ACTIVE, ProductStatus.PENDING])
        )
    )
    active_products = result.scalars().all()

    if price_per_unit <= 0:
        raise HTTPException(status_code=400, detail="Цена должна быть больше нуля")
    if price_per_unit > 999_999_999_999:
        raise HTTPException(status_code=400, detail="Слишком большая цена")
    if quantity_available <= 0:
        raise HTTPException(status_code=400, detail="Количество должно быть больше нуля")
    if quantity_available > 9_999_999_999:
        raise HTTPException(status_code=400, detail="Слишком большое количество")

    if len(active_products) >= max_products:
        raise HTTPException(
            status_code=403,
            detail=f"Превышен лимит товаров для тарифа {tariff_key}. Максимум: {max_products}"
        )

    new_product = Product(
        fermer_id=current_user.id,
        title=title,
        description=description,
        category=category,
        price_per_unit=price_per_unit,
        unit=unit,
        quantity_available=quantity_available,
        delivery_available=delivery_available,
        pickup_location=pickup_location or "",
        status=ProductStatus.ACTIVE
    )
    db.add(new_product)
    # flush даёт id для папки с фото, но всё сохраняется одним commit ниже:
    # если что-то упадёт, не останется «половинного» товара и дублей при повторе
    await db.flush()

    photo_urls = []
    valid_photos = [p for p in (photos or []) if getattr(p, "filename", None)]
    for photo in valid_photos[:10]:
        url = await save_photo(photo, new_product.id)
        photo_urls.append(url)
    new_product.photos = photo_urls

    db.add(BonusTransaction(
        user_id=current_user.id,
        points=10,
        reason=f"Добавление товара: {title}"[:200]
    ))
    current_user.bonus_points = (current_user.bonus_points or 0) + 10
    await db.commit()
    await db.refresh(new_product)

    fermer = current_user

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
        delivery_available=new_product.delivery_available or False,
        is_demo=bool(getattr(new_product, 'is_demo', False)),
        pickup_location=new_product.pickup_location or "",
        created_at=new_product.created_at
    )

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
        delivery_available=product.delivery_available or False,
        is_demo=bool(getattr(product, 'is_demo', False)),
        pickup_location=getattr(product, 'pickup_location', '') or '',
        created_at=product.created_at
    )

@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.fermer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    # Обнуляем связи перед удалением
    from app.models import Order, Review
    await db.execute(update(Order).where(Order.product_id == product_id).values(product_id=None))
    await db.execute(update(Review).where(Review.product_id == product_id).values(product_id=None))
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