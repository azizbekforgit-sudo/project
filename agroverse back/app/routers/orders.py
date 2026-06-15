from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import User, Product, Order, BonusTransaction, UserRole, OrderStatus, PickupMethod
from app.schemas import OrderCreate, OrderResponse
from app.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.XARIDOR:
        raise HTTPException(status_code=403, detail="Только покупатели могут создавать заказы")

    result = await db.execute(select(Product).where(Product.id == order_data.product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    if product.fermer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя заказать собственный товар")

    if product.status not in ("active", "pending"):
        raise HTTPException(status_code=400, detail="Товар недоступен для заказа")

    if product.quantity_available < order_data.quantity:
        raise HTTPException(status_code=400, detail=f"Доступно только {product.quantity_available} {product.unit}")

    total_price = float(product.price_per_unit) * order_data.quantity
    commission = total_price * 0.10

    new_order = Order(
        xaridor_id=current_user.id,
        fermer_id=product.fermer_id,
        product_id=product.id,
        quantity=order_data.quantity,
        total_price=total_price,
        commission=commission,
        pickup_method=order_data.pickup_method,
        status=OrderStatus.CREATED
    )

    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)

    fermer_result = await db.execute(select(User).where(User.id == product.fermer_id))
    fermer = fermer_result.scalar_one()

    return OrderResponse(
        id=new_order.id,
        product_id=product.id,
        product_title=product.title,
        product_photo=product.photos[0] if product.photos else None,
        xaridor_id=current_user.id,
        fermer_id=product.fermer_id,
        fermer_name=fermer.name,
        quantity=float(new_order.quantity),
        total_price=float(new_order.total_price),
        commission=float(new_order.commission),
        pickup_method=new_order.pickup_method.value,
        status=new_order.status,
        created_at=new_order.created_at,
        updated_at=new_order.updated_at
    )

@router.get("/my")
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.XARIDOR:
        query = select(Order).where(Order.xaridor_id == current_user.id)
    elif current_user.role == UserRole.FERMER:
        query = select(Order).where(Order.fermer_id == current_user.id)
    else:
        query = select(Order)

    # FIX: добавлена сортировка по дате
    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    orders_response = []
    for order in orders:
        product_result = await db.execute(select(Product).where(Product.id == order.product_id))
        product = product_result.scalar_one()
        fermer_result = await db.execute(select(User).where(User.id == order.fermer_id))
        fermer = fermer_result.scalar_one()
        orders_response.append(OrderResponse(
            id=order.id,
            product_id=product.id,
            product_title=product.title,
            product_photo=product.photos[0] if product.photos else None,
            xaridor_id=order.xaridor_id,
            fermer_id=order.fermer_id,
            fermer_name=fermer.name,
            quantity=float(order.quantity),
            total_price=float(order.total_price),
            commission=float(order.commission),
            pickup_method=order.pickup_method.value,
            status=order.status,
            created_at=order.created_at,
            updated_at=order.updated_at
        ))

    return orders_response

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if current_user.role != UserRole.ADMIN and current_user.id not in [order.xaridor_id, order.fermer_id]:
        raise HTTPException(status_code=403, detail="Нет доступа к этому заказу")

    product_result = await db.execute(select(Product).where(Product.id == order.product_id))
    product = product_result.scalar_one()
    fermer_result = await db.execute(select(User).where(User.id == order.fermer_id))
    fermer = fermer_result.scalar_one()

    return OrderResponse(
        id=order.id,
        product_id=product.id,
        product_title=product.title,
        product_photo=product.photos[0] if product.photos else None,
        xaridor_id=order.xaridor_id,
        fermer_id=order.fermer_id,
        fermer_name=fermer.name,
        quantity=float(order.quantity),
        total_price=float(order.total_price),
        commission=float(order.commission),
        pickup_method=order.pickup_method.value,
        status=order.status,
        created_at=order.created_at,
        updated_at=order.updated_at
    )

@router.patch("/{order_id}/pay")
async def pay_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.XARIDOR:
        raise HTTPException(status_code=403, detail="Только покупатель может оплачивать")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status != OrderStatus.CREATED:
        raise HTTPException(status_code=400, detail=f"Нельзя оплатить заказ в статусе {order.status}")

    if current_user.wallet_balance < order.total_price:
        raise HTTPException(status_code=400, detail="Недостаточно средств на кошельке")

    current_user.wallet_balance -= order.total_price

    fermer_result = await db.execute(select(User).where(User.id == order.fermer_id))
    fermer = fermer_result.scalar_one()
    fermer.wallet_balance += (order.total_price - order.commission)

    order.status = OrderStatus.PAID

    bonus_txn = BonusTransaction(
        user_id=order.fermer_id,
        points=5,
        reason=f"Продажа товара по заказу #{order_id}"
    )
    db.add(bonus_txn)
    fermer.bonus_points += 5

    await db.commit()

    return {"message": "Заказ оплачен", "status": "paid"}

@router.patch("/{order_id}/ready")
async def mark_ready(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.FERMER:
        raise HTTPException(status_code=403, detail="Только фермер может отметить готовность")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order or order.fermer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status != OrderStatus.PAID:
        raise HTTPException(status_code=400, detail=f"Нельзя отметить готовность в статусе {order.status}")

    order.status = OrderStatus.READY_FOR_PICKUP
    await db.commit()

    return {"message": "Заказ готов к выдаче", "status": "ready_for_pickup"}

@router.patch("/{order_id}/complete")
async def complete_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.XARIDOR:
        raise HTTPException(status_code=403, detail="Только покупатель может подтверждать получение")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.status != OrderStatus.READY_FOR_PICKUP:
        raise HTTPException(status_code=400, detail=f"Нельзя завершить заказ в статусе {order.status}")

    order.status = OrderStatus.COMPLETED

    product_result = await db.execute(select(Product).where(Product.id == order.product_id))
    product = product_result.scalar_one()
    product.quantity_available -= order.quantity

    await db.commit()

    return {"message": "Заказ завершен", "status": "completed"}

@router.patch("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if current_user.id not in [order.xaridor_id, order.fermer_id] and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Нет прав на отмену")

    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Нельзя отменить завершенный или уже отмененный заказ")

    # FIX: при отмене оплаченного заказа корректно откатываем платёж
    if order.status in (OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP):
        xaridor_result = await db.execute(select(User).where(User.id == order.xaridor_id))
        xaridor = xaridor_result.scalar_one()
        # Возвращаем полную сумму покупателю
        xaridor.wallet_balance += order.total_price

        # Забираем у фермера то, что ему уже было начислено (total - commission)
        fermer_result = await db.execute(select(User).where(User.id == order.fermer_id))
        fermer = fermer_result.scalar_one()
        fermer.wallet_balance -= (order.total_price - order.commission)

    order.status = OrderStatus.CANCELLED
    await db.commit()

    return {"message": "Заказ отменен", "status": "cancelled"}
