from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_
from app.database import get_db
from app.models import User, Product, Order, BonusTransaction, UserRole, OrderStatus, PickupMethod, DeliveryRequest, CourierProfile, CourierTransaction
from app.schemas import OrderCreate, OrderResponse, DriverCandidateRequest
from app.dependencies import get_current_user
from datetime import datetime
from decimal import Decimal

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.COURIER:
        raise HTTPException(status_code=403, detail="Курьер не может оформлять покупки")

    result = await db.execute(select(Product).where(Product.id == order_data.product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    if product.fermer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя купить свой собственный товар")

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
        fermer_phone=fermer.phone,
        xaridor_phone=current_user.phone,
        product_unit=product.unit,
        my_role="buyer",
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
    # Каждый видит и свои покупки, и свои продажи (фермер тоже может покупать)
    if current_user.role == UserRole.ADMIN:
        query = select(Order)
    else:
        query = select(Order).where(or_(Order.xaridor_id == current_user.id, Order.fermer_id == current_user.id))

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
        if not fermer or not xaridor:
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
            product_id=order.product_id or 0,
            product_title=product.title if product else "Товар удалён",
            product_photo=(product.photos[0] if product and product.photos else None),
            product_unit=product.unit if product else None,
            xaridor_id=order.xaridor_id,
            xaridor_name=xaridor.name,
            xaridor_phone=xaridor.phone,
            fermer_id=order.fermer_id,
            fermer_name=fermer.name,
            fermer_phone=fermer.phone,
            my_role="seller" if order.fermer_id == current_user.id else "buyer",
            cancelled_by=getattr(order, "cancelled_by", None),
            quantity=float(order.quantity),
            total_price=float(order.total_price),
            commission=float(order.commission),
            pickup_method=getattr(order.pickup_method, "value", order.pickup_method),
            status=order.status,
            delivery_request=delivery_info,
            driver_candidate_id=order.driver_candidate_id,
            driver_candidate_name=driver_candidate_name,
            delivery_route_from=order.delivery_route_from,
            delivery_route_to=order.delivery_route_to,
            delivery_distance_km=order.delivery_distance_km,
            delivery_price=order.delivery_price,
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
        xaridor_phone=xaridor.phone,
        fermer_id=order.fermer_id,
        fermer_name=fermer.name,
        fermer_phone=fermer.phone,
        product_unit=product.unit,
        my_role="seller" if order.fermer_id == current_user.id else "buyer",
        cancelled_by=getattr(order, "cancelled_by", None),
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
    if current_user.id == order.xaridor_id:
        order.cancelled_by = "buyer"
    elif current_user.id == order.fermer_id:
        order.cancelled_by = "seller"
    else:
        order.cancelled_by = "admin"
    await db.commit()

    return {"message": "Заказ отменен", "status": "cancelled", "cancelled_by": order.cancelled_by}


OPEN_STATUSES = (OrderStatus.CREATED, OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP)


async def _seller_order(order_id: int, current_user: User, db: AsyncSession) -> Order:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order or order.fermer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.status not in OPEN_STATUSES:
        raise HTTPException(status_code=400, detail="Этот заказ уже закрыт")
    return order


@router.patch("/{order_id}/sold")
async def mark_sold(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Продавец отмечает: товар передан покупателю, сделка состоялась."""
    order = await _seller_order(order_id, current_user, db)
    order.status = OrderStatus.COMPLETED

    if order.product_id:
        product_result = await db.execute(select(Product).where(Product.id == order.product_id))
        product = product_result.scalar_one_or_none()
        if product:
            left = Decimal(str(product.quantity_available)) - Decimal(str(order.quantity))
            product.quantity_available = max(left, Decimal("0"))

    db.add(BonusTransaction(user_id=current_user.id, points=5, reason=f"Продажа по заказу #{order.id}"))
    current_user.bonus_points = (current_user.bonus_points or 0) + 5
    await db.commit()
    return {"message": "Отмечено как продано", "status": "completed"}


@router.patch("/{order_id}/reject")
async def reject_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Продавец отказывается от заказа (нет товара, не договорились)."""
    order = await _seller_order(order_id, current_user, db)
    if order.status == OrderStatus.PAID:
        xaridor_result = await db.execute(select(User).where(User.id == order.xaridor_id))
        xaridor = xaridor_result.scalar_one()
        xaridor.wallet_balance += order.total_price
        current_user.wallet_balance -= (order.total_price - order.commission)
    order.status = OrderStatus.CANCELLED
    order.cancelled_by = "seller"
    await db.commit()
    return {"message": "Заказ отклонён", "status": "cancelled", "cancelled_by": "seller"}


@router.post("/{order_id}/select-driver-candidate")
async def select_driver_candidate(
    order_id: int,
    data: DriverCandidateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

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
    order.delivery_route_from = data.route_from
    order.delivery_route_to = data.route_to
    order.delivery_distance_km = data.distance_km
    order.delivery_price = data.total_price
    await db.commit()

    return {"message": "Драйвер выбран как кандидат", "driver_candidate_id": data.courier_user_id}


@router.post("/{order_id}/assign-driver")
async def assign_driver(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if not order.driver_candidate_id:
        raise HTTPException(status_code=400, detail="Кандидат-драйвер не выбран")

    if order.delivery_request_id:
        raise HTTPException(status_code=400, detail="Драйвер уже назначен на этот заказ")

    # Копируем маршрут из заказа в DeliveryRequest
    route_from = order.delivery_route_from or ""
    route_to = order.delivery_route_to or ""
    distance_km = order.delivery_distance_km or 0
    total_price = order.delivery_price or 0
    price_per_km = round(total_price / distance_km, 2) if distance_km > 0 else 0

    dr = DeliveryRequest(
        order_id=order.id,
        courier_id=order.driver_candidate_id,
        buyer_id=current_user.id,
        route_from=route_from,
        route_to=route_to,
        distance_km=distance_km,
        price_per_km=price_per_km,
        total_price=total_price,
        status="pending",
        buyer_confirmed_disclaimer=True  # Покупатель уже подтвердил нажатием "Заказать этого драйвера"
    )
    db.add(dr)
    await db.flush()

    order.delivery_request_id = dr.id
    await db.commit()

    return {"message": "Драйвер назначен на заказ", "delivery_request_id": dr.id}


@router.post("/{order_id}/pay-driver")
async def pay_driver(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if not order.delivery_request_id:
        raise HTTPException(status_code=400, detail="Доставка не назначена")

    dr_result = await db.execute(select(DeliveryRequest).where(DeliveryRequest.id == order.delivery_request_id))
    dr = dr_result.scalar_one_or_none()
    if not dr:
        raise HTTPException(status_code=404, detail="Заявка на доставку не найдена")

    if dr.status != "delivered":
        raise HTTPException(status_code=400, detail="Доставка ещё не завершена")

    if dr.total_price <= 0:
        raise HTTPException(status_code=400, detail="Стоимость доставки не указана")

    # Проверяем баланс покупателя
    price = Decimal(str(dr.total_price))
    if current_user.wallet_balance < price:
        raise HTTPException(status_code=400, detail=f"Недостаточно средств. Нужно: {dr.total_price} сум")

    # Списываем с покупателя
    current_user.wallet_balance -= price

    # Начисляем драйверу на User.wallet_balance
    driver_result = await db.execute(select(User).where(User.id == dr.courier_id))
    driver = driver_result.scalar_one()
    driver.wallet_balance += price

    # Начисляем драйверу на CourierProfile.balance (для раздела "Кошелёк" в дашборде)
    cp_result = await db.execute(select(CourierProfile).where(CourierProfile.user_id == driver.id))
    cp = cp_result.scalar_one_or_none()
    if cp:
        cp.balance = (cp.balance or 0) + price

    # Записываем транзакцию в CourierTransaction
    ct = CourierTransaction(
        courier_id=driver.id,
        amount=float(price),
        type="income",
        desc=f"Оплата доставки заказа #{order_id}",
        method="wallet",
        status="completed"
    )
    db.add(ct)

    # Бонусы
    buyer_bonus = BonusTransaction(
        user_id=current_user.id,
        points=2,
        reason=f"Оплата доставки заказа #{order_id}: {dr.total_price} сум"
    )
    db.add(buyer_bonus)
    current_user.bonus_points += 2

    driver_bonus = BonusTransaction(
        user_id=driver.id,
        points=5,
        reason=f"Оплата доставки заказа #{order_id}: {dr.total_price} сум"
    )
    db.add(driver_bonus)
    driver.bonus_points += 5

    # Обновляем статус доставки
    dr.status = "completed"

    await db.commit()

    return {"message": f"Оплачено {dr.total_price} сум. Драйверу начислено на баланс."}


@router.post("/{order_id}/clear-driver-candidate")
async def clear_driver_candidate(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order or order.xaridor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.delivery_request_id:
        raise HTTPException(status_code=400, detail="Нельзя сменить драйвера — уже назначен на доставку")

    order.driver_candidate_id = None
    order.delivery_route_from = None
    order.delivery_route_to = None
    order.delivery_distance_km = None
    order.delivery_price = None
    await db.commit()

    return {"message": "Кандидат-драйвер снят"}