from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, UserTariff, ProductStatus, OrderStatus


# ── Auth schemas ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r'^\+?[0-9]{10,15}$')
    email: Optional[EmailStr] = None
    city: Optional[str] = None
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
    delivery_available: Optional[bool] = False


class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    price_per_unit: Optional[float] = Field(None, gt=0)
    quantity_available: Optional[float] = Field(None, gt=0)
    status: Optional[ProductStatus] = None
    delivery_available: Optional[bool] = None


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
    delivery_available: bool = False
    pickup_location: str = ""
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
    pickup_method: str = Field(default="self", pattern="^(self|farmer|external)$")


class OrderResponse(BaseModel):
    id: int
    product_id: int
    product_title: str
    product_photo: Optional[str] = None
    xaridor_id: int
    xaridor_name: str
    fermer_id: int
    fermer_name: str
    quantity: float
    total_price: float
    commission: float
    pickup_method: str
    status: OrderStatus
    delivery_request: Optional[dict] = None
    driver_candidate_id: Optional[int] = None
    driver_candidate_name: Optional[str] = None
    delivery_route_from: Optional[str] = None
    delivery_route_to: Optional[str] = None
    delivery_distance_km: Optional[float] = None
    delivery_price: Optional[float] = None
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


# ── Delivery Request schemas ──────────────────────────────────────────────────

class DeliveryRequestCreate(BaseModel):
    order_id: int
    courier_user_id: int
    route_from: str
    route_to: str
    distance_km: float = Field(..., gt=0)
    price_per_km: float = Field(..., gt=0)
    total_price: float = Field(..., gt=0)


class DeliveryRequestResponse(BaseModel):
    id: int
    order_id: int
    courier_id: int
    courier_name: str
    courier_phone: str
    buyer_id: int
    buyer_name: str
    buyer_phone: str
    route_from: str
    route_to: str
    distance_km: float
    price_per_km: float
    total_price: float
    status: str
    buyer_confirmed_disclaimer: bool
    driver_confirmed_disclaimer: bool
    order_product_title: Optional[str] = None
    order_product_photo: Optional[str] = None
    order_quantity: Optional[float] = None
    order_total_price: Optional[float] = None
    created_at: datetime


# ── Chat schemas ────────────────────────────────────────────────────────────

class ChatCreate(BaseModel):
    order_id: int
    type: str = Field(..., pattern="^(buyer_farmer|buyer_driver|driver_farmer)$")


class ChatParticipant(BaseModel):
    id: int
    name: str
    role: str
    phone: Optional[str] = None


class ChatResponse(BaseModel):
    id: int
    order_id: int
    type: str
    participant_a: ChatParticipant
    participant_b: ChatParticipant
    status: str
    last_message: Optional[dict] = None
    unread_count: int = 0
    order_product_title: Optional[str] = None
    order_product_photo: Optional[str] = None
    created_at: datetime


class MessageCreate(BaseModel):
    type: str = Field(default="text", pattern="^(text|photo|voice|location)$")
    content: str = Field(..., min_length=1, max_length=5000)


class ChatMessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    sender_name: str
    type: str
    content: str
    is_blocked: bool
    created_at: datetime


class DriverCandidateRequest(BaseModel):
    courier_user_id: int
    route_from: Optional[str] = None
    route_to: Optional[str] = None
    distance_km: Optional[float] = None
    total_price: Optional[float] = None


class OrderResponseExtended(BaseModel):
    id: int
    product_id: int
    product_title: str
    product_photo: Optional[str] = None
    xaridor_id: int
    xaridor_name: str
    fermer_id: int
    fermer_name: str
    quantity: float
    total_price: float
    commission: float
    pickup_method: str
    status: OrderStatus
    delivery_request: Optional[dict] = None
    driver_candidate_id: Optional[int] = None
    driver_candidate_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
