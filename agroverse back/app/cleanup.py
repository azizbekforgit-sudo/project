"""Очистка базы при запуске сервера.

1. remove_demo() — всегда: удаляет примерные объявления (is_demo) и
   выдуманных «фермеров», которых добавлял старый demo_seed. Если их нет — ничего не делает.
2. wipe_products_once() — только если задана переменная WIPE_PRODUCTS=yes:
   удаляет ВСЕ товары и их фото. Выполняется один раз: отметка хранится в
   таблице app_flags, поэтому оставленная переменная не сотрёт новые товары.
   Заказы и отзывы остаются (product_id = NULL, на сайте «Товар удалён»).
"""
import os
import shutil

from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal

DEMO_PHONES = ("+998000000201", "+998000000202", "+998000000203", "+998000000204")


async def _detach_and_delete_products(db, where_sql: str) -> int:
    ids = [r[0] for r in (await db.execute(text(f"SELECT id FROM products WHERE {where_sql}"))).fetchall()]
    if not ids:
        return 0
    await db.execute(text("UPDATE orders SET product_id = NULL WHERE product_id = ANY(:ids)"), {"ids": ids})
    await db.execute(text("UPDATE reviews SET product_id = NULL WHERE product_id = ANY(:ids)"), {"ids": ids})
    await db.execute(text("DELETE FROM products WHERE id = ANY(:ids)"), {"ids": ids})
    for pid in ids:
        shutil.rmtree(os.path.join(settings.upload_dir, "products", str(pid)), ignore_errors=True)
    return len(ids)


async def remove_demo() -> None:
    async with AsyncSessionLocal() as db:
        n = await _detach_and_delete_products(db, "is_demo IS TRUE")
        # демо-фермеры: удаляем, только если на них ничего не ссылается
        users = 0
        for phone in DEMO_PHONES:
            try:
                async with db.begin_nested():
                    r = await db.execute(text(
                        "DELETE FROM users WHERE phone = :p AND NOT EXISTS (SELECT 1 FROM products WHERE fermer_id = users.id)"
                    ), {"p": phone})
                    users += r.rowcount or 0
            except Exception as e:
                print(f"[CLEANUP] демо-пользователь {phone} не удалён: {e}")
        await db.commit()
        shutil.rmtree(os.path.join(settings.upload_dir, "demo"), ignore_errors=True)
        if n or users:
            print(f"[CLEANUP] Удалено примеров: {n}, демо-фермеров: {users}")


async def wipe_products_once() -> None:
    if os.getenv("WIPE_PRODUCTS", "").lower() not in ("yes", "true", "1"):
        return
    async with AsyncSessionLocal() as db:
        await db.execute(text("CREATE TABLE IF NOT EXISTS app_flags (key VARCHAR(100) PRIMARY KEY, done_at TIMESTAMP DEFAULT NOW())"))
        done = (await db.execute(text("SELECT 1 FROM app_flags WHERE key = 'wipe_products'"))).fetchone()
        if done:
            print("[CLEANUP] WIPE_PRODUCTS уже выполнялся раньше — пропускаю. Переменную можно удалить.")
            await db.commit()
            return
        n = await _detach_and_delete_products(db, "TRUE")
        await db.execute(text("INSERT INTO app_flags (key) VALUES ('wipe_products')"))
        await db.commit()
        shutil.rmtree(os.path.join(settings.upload_dir, "products"), ignore_errors=True)
        print(f"[CLEANUP] WIPE_PRODUCTS: удалено товаров: {n}. Уберите переменную WIPE_PRODUCTS.")
