import asyncio
from app.database import AsyncSessionLocal
from app.models import User, Product
from app.auth import get_password_hash

async def create_test_data():
    async with AsyncSessionLocal() as db:
        # Создаем фермера
        fermer = User(
            name="Тестовый Фермер",
            phone="+998901234567",
            password_hash=get_password_hash("test123"),
            role="fermer",
            tariff="normal",
            bonus_points=100,
            wallet_balance=500.00
        )
        db.add(fermer)
        await db.flush()
        
        # Создаем покупателя
        xaridor = User(
            name="Тестовый Покупатель",
            phone="+998998765432",
            password_hash=get_password_hash("test123"),
            role="xaridor",
            bonus_points=50,
            wallet_balance=200.00
        )
        db.add(xaridor)
        await db.flush()
        
        # Создаем товары
        products = [
            Product(
                fermer_id=fermer.id,
                title="Помидоры свежие",
                description="Сочные помидоры, выращенные в теплице. Экологически чистые.",
                category="овощи",
                price_per_unit=2500,
                unit="кг",
                quantity_available=100,
                status="active",
                photos=["/uploads/products/1/tomato1.jpg"],
                rating=4.5
            ),
            Product(
                fermer_id=fermer.id,
                title="Огурцы хрустящие",
                description="Молодые огурцы, собраны сегодня.",
                category="овощи",
                price_per_unit=1800,
                unit="кг",
                quantity_available=150,
                status="active",
                photos=["/uploads/products/1/cucumber1.jpg"],
                rating=4.8
            ),
            Product(
                fermer_id=fermer.id,
                title="Яблоки сорта Голден",
                description="Сладкие и сочные яблоки.",
                category="фрукты",
                price_per_unit=3200,
                unit="кг",
                quantity_available=80,
                status="active",
                photos=["/uploads/products/1/apple1.jpg"],
                rating=4.2
            )
        ]
        
        for product in products:
            db.add(product)
        
        await db.commit()
        print("✅ Тестовые данные созданы!")
        print(f"👨‍🌾 Фермер: +998901234567 / test123")
        print(f"🛒 Покупатель: +998998765432 / test123")

if __name__ == "__main__":
    asyncio.run(create_test_data())