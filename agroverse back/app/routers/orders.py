from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import User, Product, Order, BonusTransaction, UserRole, OrderStatus, PickupMethod, DeliveryRequest
from app.schemas import OrderCreate, OrderResponse, DriverCandidateRequest
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
        pickup_method=PickupMethod(order_data.pickup_method),
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
        xaridor_name=current_user.name,
        fermer_id=product.fermer_id,
        fermer_name=fermer.name,
        quantity=float(new_order.quantity),
        total_price=float(new_order.total_price),
        commission=float(new_order.commission),
        pickup_method=getattr(new_order.pickup_method, "value", new_order.pickup_method),
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

    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    product_ids = list({o.product_id for o in orders})
    fermer_ids = list({o.fermer_id for o in orders})
    xaridor_ids = list({o.xaridor_id for o in orders})

    products_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products_map = {p.id: p for p in products_result.scalars().all()}

    fermers_result = await db.execute(select(User).where(User.id.in_(fermer_ids)))
    fermers_map = {u.id: u for u in fermers_result.scalars().all()}

    xaridors_result = await db.execute(select(User).where(User.id.in_(xaridor_ids)))
    xaridors_map = {u.id: u for u in xaridors_result.scalars().all()}

    orders_response = []
    for order in orders:
        product = products_map.get(order.product_id)
        fermer = fermers_map.get(order.fermer_id)
        xaridor = xaridors_map.get(order.xaridor_id)
        if not product or not fermer or not xaridor:
            continue

        # Load delivery request if linked
        delivery_info = None
        if order.delivery_request_id:
            dr_result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == order.delivery_request_id))
            dr = dr_result.scalar_one_or_none()
            if dr:
                courier_result = await db.execute(select(User).where(User.id == dr.courier_id))
                courier = courier_result.scalar_one_or_none()
                delivery_info = {
                    "id": dr.id,
                    "status": dr.status,
                    "route_from": dr.route_from,
                    "route_to": dr.route_to,
                    "distance_km": dr.distance_km,
                    "total_price": dr.total_price,
                    "courier_name": courier.name if courier else "",
                    "courier_phone": courier.phone if courier else "",
                    "buyer_confirmed_disclaimer": dr.buyer_confirmed_disclaimer,
                    "driver_confirmed_disclaimer": dr.driver_confirmed_disclaimer,
                }

        # Load driver candidate if set
        driver_candidate_name = None
        if order.driver_candidate_id:
            dc_result = await db.execute(select(User).where(User.id == order.driver_candidate_id))
            dc_user = dc_result.scalar_one_or_none()
            if dc_user:
                driver_candidate_name = dc_user.name

        orders_response.append(OrderResponse(
            id=order.id,
            product_id=product.id,
            product_title=product.title,
            product_photo=product.photos[0] if product.photos else None,
            xaridor_id=order.xaridor_id,
            xaridor_name=xaridor.name,
            fermer_id=order.fermer_id,
            fermer_name=fermer.name,
            quantity=float(order.quantity),
            total_price=float(order.total_price),
            commission=float(order.commission),
            pickup_method=getattr(order.pickup_method, "value", order.pickup_method),
            status=order.status,
            delivery_request=delivery_info,
            driver_candidate_id=order.driver_candidate_id,
            driver_candidate_name=driver_candidate_name,
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
    xaridor_result = await db.execute(select(User).where(User.id == order.xaridor_id))
    xaridor = xaridor_result.scalar_one()

    return OrderResponse(
        id=order.id,
        product_id=product.id,
        product_title=product.title,
        product_photo=product.photos[0] if product.photos else None,
        xaridor_id=order.xaridor_id,
        xaridor_name=xaridor.name,
        fermer_id=order.fermer_id,
        fermer_name=fermer.name,
        quantity=float(order.quantity),
        total_price=float(order.total_price),
        commission=float(order.commission),
        pickup_method=getattr(order.pickup_method, "value", order.pickup_method),
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

    # Record transaction for farmer
    fermer_bonus = BonusTransaction(
        user_id=order.fermer_id,
        points=5,
        reason=f"Оплата покупки от {current_user.name}: {order.quantity} шт. товара #{order.product_id}, сумма {order.total_price - order.commission} сум"
    )
    db.add(fermer_bonus)
    fermer.bonus_points += 5

    # Record buyer transaction
    buyer_bonus = BonusTransaction(
        user_id=current_user.id,
        points=2,
        reason=f"Оплата заказа #{order_id}: {order.quantity} шт. товара #{order.product_id}, сумма {order.total_price} сум"
    )
    db.add(buyer_bonus)
    current_user.bonus_points += 2

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

    if order.status == OrderStatus.PAID:
        xaridor_result = await db.execute(select(User).where(User.id == order.xaridor_id))
        xaridor = xaridor_result.scalar_one()
        xaridor.wallet_balance += order.total_price

        fermer_result = await db.execute(select(User).where(User.id == order.fermer_id))
        fermer = fermer_result.scalar_one()
        fermer.wallet_balance -= (order.total_price - order.commission)

    order.status = OrderStatus.CANCELLED
    await db.commit()

    return {"message": "Заказ отменен", "status": "cancelled"}


@router.post("/{order_id}/select-driver-candidate")
async def select_driver_candidate(
    order_id: int,
    data: DriverCandidateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.XARIDOR:
        raise HTTPException(status_code=403, detail="Только покупатель может выбирать кандидата")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.pickup_method != PickupMethod.EXTERNAL:
        raise HTTPException(status_code=400, detail="Выбор драйвера доступен только для внешней доставки")

    # Verify driver exists and has courier profile
    driver_result = await db.execute(select(User).where(User.id == data.courier_user_id))
    driver = driver_result.scalar_one_or_none()
    if not driver or driver.role != UserRole.COURIER:
        raise HTTPException(status_code=400, detail="Указан неверный драйвер")

    order.driver_candidate_id = data.courier_user_id
    await db.commit()

    return {"message": "Драйвер выбран как кандидат", "driver_candidate_id": data.courier_user_id}


@router.post("/{order_id}/assign-driver")
async def assign_driver(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.XARIDOR:
        raise HTTPException(status_code=403, detail="Только покупатель может назначать драйвера")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if not order.driver_candidate_id:
        raise HTTPException(status_code=400, detail="Кандидат-драйвер не выбран")

    if order.delivery_request_id:
        raise HTTPException(status_code=400, detail="Драйвер уже назначен на этот заказ")

    # Create DeliveryRequest (simplified — without route details, those should come from the chat context)
    dr = DeliveryRequest(
        order_id=order.id,
        courier_id=order.driver_candidate_id,
        buyer_id=current_user.id,
        route_from="",
        route_to="",
        distance_km=0,
        price_per_km=0,
        total_price=0,
        status="pending"
    )
    db.add(dr)
    await db.flush()

    order.delivery_request_id = dr.id
    await db.commit()

    return {"message": "Драйвер назначен на заказ", "delivery_request_id": dr.id}