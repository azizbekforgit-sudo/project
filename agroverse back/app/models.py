from sqlalchemy import (
    Column, String, Integer, Numeric, Text, Boolean, 
    DateTime, Enum, ForeignKey, Float, Index, JSON
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    FERMER = "fermer"
    XARIDOR = "xaridor"
    ADMIN = "admin"
    COURIER = "courier"

class UserTariff(str, enum.Enum):
    STANDART = "standart"
    NORMAL = "normal"
    PREMIUM = "premium"

class ProductStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class OrderStatus(str, enum.Enum):
    CREATED = "created"
    PAID = "paid"
    READY_FOR_PICKUP = "ready_for_pickup"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PickupMethod(str, enum.Enum):
    SELF = "self"
    FARMER = "farmer"
    EXTERNAL = "external"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.XARIDOR)
    tariff = Column(Enum(UserTariff), default=UserTariff.STANDART)
    bonus_points = Column(Integer, default=0)
    wallet_balance = Column(Numeric(12, 2), default=0)
    is_active = Column(Boolean, default=True)
    block_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    products = relationship("Product", back_populates="fermer")
    orders_as_xaridor = relationship("Order", foreign_keys="Order.xaridor_id")
    orders_as_fermer = relationship("Order", foreign_keys="Order.fermer_id")
    reviews = relationship("Review", back_populates="xaridor")
    bonus_transactions = relationship("BonusTransaction", back_populates="user")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    fermer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(20), nullable=False)
    quantity_available = Column(Numeric(10, 2), nullable=False)
    photos = Column(JSON, default=list)
    certificates = Column(JSON, default=list)
    status = Column(Enum(ProductStatus), default=ProductStatus.PENDING)
    rating = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
    
    fermer = relationship("User", back_populates="products")
    orders = relationship("Order", back_populates="product")
    reviews = relationship("Review", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    xaridor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fermer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    commission = Column(Numeric(12, 2), nullable=False)
    pickup_method = Column(Enum(PickupMethod), default=PickupMethod.SELF)
    status = Column(Enum(OrderStatus), default=OrderStatus.CREATED)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    xaridor = relationship("User", foreign_keys=[xaridor_id])
    fermer = relationship("User", foreign_keys=[fermer_id])
    product = relationship("Product", back_populates="orders")
    review = relationship("Review", back_populates="order", uselist=False)

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    xaridor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    order = relationship("Order", back_populates="review")
    xaridor = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")

class BonusTransaction(Base):
    __tablename__ = "bonus_transactions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    points = Column(Integer, nullable=False)
    reason = Column(String(200), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="bonus_transactions")

# ─── Courier models ───────────────────────────────────────────

class CourierProfile(Base):
    __tablename__ = "courier_profiles"

    id               = Column(Integer, primary_key=True)
    user_id          = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name        = Column(String(200), default="")
    phone            = Column(String(30), default="")
    transport_type   = Column(String(50), default="")
    max_weight       = Column(Float, default=5000)
    has_thermo_bag   = Column(Boolean, default=False)
    experience_years = Column(Integer, default=0)
    city             = Column(String(100), default="")
    radius_km        = Column(Float, default=50)
    work_mode        = Column(String(30), default="flexible")
    work_hours       = Column(String(30), default="08:00-20:00")
    vehicle_number   = Column(String(50), default="")
    license_info     = Column(String(200), default="")
    bio              = Column(Text, default="")
    photo_url        = Column(String(500), nullable=True)
    documents        = Column(JSON, default=list) # List of document URLs or info
    admin_approved   = Column(Boolean, default=False)
    rejection_reason = Column(Text, nullable=True)
    rating           = Column(Float, default=5.0)
    balance          = Column(Float, default=0.0)
    status           = Column(String(20), default="offline")
    lat              = Column(Float, default=0.0)
    lng              = Column(Float, default=0.0)
    created_at       = Column(DateTime, server_default=func.now())

    user = relationship("User")


class CourierOrder(Base):
    __tablename__ = "courier_orders"

    id                = Column(Integer, primary_key=True)
    courier_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_id         = Column(Integer, ForeignKey("users.id"), nullable=True)
    cargo             = Column(String(200), default="")
    cargo_description = Column(Text, default="")
    pickup_address    = Column(String(300), default="")
    delivery_address  = Column(String(300), default="")
    pickup_lat        = Column(Float, default=0)
    pickup_lng        = Column(Float, default=0)
    delivery_lat      = Column(Float, default=0)
    delivery_lng      = Column(Float, default=0)
    distance_km       = Column(Float, default=0)
    weight_kg         = Column(Float, default=0)
    price             = Column(Float, default=0)
    status            = Column(String(30), default="pending")
    scheduled_time    = Column(String(50), nullable=True)
    created_at        = Column(DateTime, server_default=func.now())


class CourierTransaction(Base):
    __tablename__ = "courier_transactions"

    id         = Column(Integer, primary_key=True)
    courier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount     = Column(Float, default=0)
    type       = Column(String(20), default="income")
    desc       = Column(String(200), default="")
    method     = Column(String(50), default="")
    status     = Column(String(30), default="completed")
    created_at = Column(DateTime, server_default=func.now())


class CourierRatingEntry(Base):
    __tablename__ = "courier_ratings"

    id         = Column(Integer, primary_key=True)
    courier_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    from_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating     = Column(Integer, nullable=False)
    comment    = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# Индексы для производительности
Index("idx_products_status", Product.status)
Index("idx_products_category", Product.category)
Index("idx_orders_xaridor", Order.xaridor_id)
Index("idx_orders_fermer", Order.fermer_id)
Index("idx_orders_status", Order.status)
Index("idx_users_role", User.role)