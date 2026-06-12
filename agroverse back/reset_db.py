import asyncio
from app.database import engine, Base
from app.models import User, Product, Order, Review, BonusTransaction

async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Таблицы созданы заново!")

asyncio.run(reset_db())