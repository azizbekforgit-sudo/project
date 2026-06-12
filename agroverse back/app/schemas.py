from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    FERMER = "fermer"
    XARIDOR = "xaridor"
    ADMIN = "admin"
    COURIER = "courier"


class UserTariff(str, Enum):
    STANDART = "standart"
    NORMAL = "normal"
    PREMIUM = "premium"


class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class OrderStatus(str, Enum):
    CREATED = "created"
    PAID = "paid"
    READY_FOR_PICKUP = "ready_for_pickup"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ── Auth schemas ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r'^\+?[0-9]{10,15}$')
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    role: str = "xaridor"

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        # Нормализация синонимов
        aliases = {'buyer': 'xaridor', 'farmer': 'fermer', 'deliverer': 'courier'}
        v = aliases.get(v, v)
        allowed = {'fermer', 'xaridor', 'courier'}
        if v not in allowed:
            raise ValueError(f"role must be one of: {', '.join(allowed)}")
        return v


class UserLogin(BaseModel):
    phone: str
    password: str


class OTPSend(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    code: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Product schemas ───────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str
    price_per_unit: float = Field(..., gt=0, le=999999)
    unit: str
    quantity_available: float = Field(..., gt=0)
    pickup_method: Optional[str] = "self"


class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    price_per_unit: Optional[float] = Field(None, gt=0)
    quantity_available: Optional[float] = Field(None, gt=0)
    status: Optional[ProductStatus] = None


class ProductResponse(BaseModel):
    id: int
    fermer_id: int
    fermer_name: str
    fermer_rating: Optional[float] = None
    title: str
    description: str
    category: str
    price_per_unit: float
    unit: str
    quantity_available: float
    photos: List[str] = []
    rating: float
    status: ProductStatus
    created_at: datetime


class ProductListResponse(BaseModel):
    total: int
    page: int
    limit: int
    products: List[ProductResponse]


# ── Order schemas ─────────────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    pickup_method: str = Field(..., pattern="^(self|farmer|external)$")


class OrderResponse(BaseModel):
    id: int
    product_id: int
    product_title: str
    product_photo: Optional[str] = None
    xaridor_id: int
    fermer_id: int
    fermer_name: str
    quantity: float
    total_price: float
    commission: float
    pickup_method: str
    status: OrderStatus
    created_at: datetime
    updated_at: datetime


# ── Bonus schemas ─────────────────────────────────────────────────────────────

class BonusBalance(BaseModel):
    bonus_points: int


# ── Wallet schemas ────────────────────────────────────────────────────────────

class DepositRequest(BaseModel):
    amount: float = Field(..., gt=0, le=10000)


class WithdrawRequest(BaseModel):
    amount: float = Field(..., gt=0)


# ── Review schemas ────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    xaridor_name: str
    rating: int
    comment: Optional[str]
    created_at: datetime
