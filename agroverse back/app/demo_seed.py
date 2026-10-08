"""Примерные объявления, чтобы рынок не выглядел пустым.

- Создаются один раз при старте сервера (повторно не дублируются).
- Помечены is_demo=True: на сайте у них значок «Пример», заказать их нельзя —
  иначе покупатель ждал бы ответа от несуществующего фермера.
- Отключить и удалить: переменная окружения SEED_DEMO=false.
"""
import os
import shutil

from sqlalchemy import select, delete, update

from app.auth import get_password_hash
from app.config import settings
from app.database import AsyncSessionLocal
from app.models import User, Product, Order

PHOTO_SRC = os.path.join(os.path.dirname(__file__), "demo_photos")

FARMERS = [
    {"key": "zarafshon", "name": "Ферма «Зарафшон»", "city": "Самарканд", "phone": "+998000000201"},
    {"key": "namangan",  "name": "Бахром Каримов",    "city": "Наманган",  "phone": "+998000000202"},
    {"key": "fergana",   "name": "Хозяйство «Фаргона Сабзи»", "city": "Фергана", "phone": "+998000000203"},
    {"key": "chirchiq",  "name": "Дехканское хозяйство «Чирчик»", "city": "Ташкентская обл.", "phone": "+998000000204"},
]

# (фермер, название, категория, цена, ед., количество, фото, место, доставка, описание)
PRODUCTS = [
    ("zarafshon", "Помидоры сливовидные", "Овощи", 9000, "кг", 800, "vegetables.jpg", "Самарканд, Ургут", True,
     "Плотные сладкие помидоры с открытого грунта. Собираем утром, отгружаем в тот же день."),
    ("zarafshon", "Картофель «Санте»", "Овощи", 5500, "кг", 3000, "vegetables-2.jpg", "Самарканд, Пайарык", False,
     "Крупный картофель для хранения. Сухой, без гнили, отборка от 5 см."),
    ("fergana", "Морковь жёлтая для плова", "Овощи", 6000, "кг", 1200, "vegetables.jpg", "Фергана, Кува", True,
     "Та самая жёлтая морковь для плова. Сладкая, сочная, мытая."),
    ("namangan", "Яблоки «Голден»", "Фрукты", 14000, "кг", 600, "fruits.jpg", "Наманган, Чуст", True,
     "Сладкие хрусткие яблоки из сада в Чусте. Урожай этой недели."),
    ("namangan", "Гранат «Казаки»", "Фрукты", 18000, "кг", 400, "fruits-2.jpg", "Наманган", False,
     "Крупный гранат с тёмным зерном. Подходит для сока."),
    ("chirchiq", "Пшеница продовольственная", "Зерновые", 4200, "кг", 20000, "grains.jpg", "Ташкентская обл., Чирчик", False,
     "Пшеница урожая этого года, влажность до 13%. Мешки по 50 кг, можно оптом."),
    ("fergana", "Рис «Девзира»", "Зерновые", 32000, "кг", 900, "grains-2.jpg", "Фергана, Узген-сай", False,
     "Настоящая девзира для плова: розоватое зерно, хорошо держит форму."),
    ("chirchiq", "Зелень: кинза, укроп, райхон", "Зелень", 2500, "пучок", 300, "greens.jpg", "Ташкент, Кибрай", True,
     "Срезаем утром в день отправки. Можно собрать набор из разных трав."),
    ("zarafshon", "Молоко домашнее", "Молочные", 9000, "литр", 120, "dairy.jpg", "Самарканд", True,
     "Коровье молоко утреннего надоя. Без добавок, в бутылках по 1 и 1,5 литра."),
    ("chirchiq", "Сузьма и катык", "Молочные", 16000, "кг", 60, "dairy-2.jpg", "Ташкентская обл.", True,
     "Домашняя сузьма и катык. Свежие каждый день."),
    ("fergana", "Арбузы", "Бахчевые", 3000, "кг", 5000, "honey.jpg", "Фергана, Бувайда", False,
     "Сладкие арбузы весом 8–12 кг. Отгружаем от одной штуки до машины."),
    ("namangan", "Дыня «Торпеда»", "Бахчевые", 7000, "кг", 1500, "", "Наманган, Пап", False,
     "Душистая поздняя дыня, хорошо хранится до зимы."),
    ("zarafshon", "Мёд горный", "Мёд", 90000, "кг", 80, "", "Самарканд, Агалык", False,
     "Мёд с горных пасек Агалыка. Банки 0,5 и 1 кг."),
    ("chirchiq", "Саженцы абрикоса", "Саженцы", 35000, "шт", 200, "", "Ташкентская обл., Паркент", True,
     "Двухлетние саженцы сорта «Исфарак». Помогаем с посадкой."),
]


def _copy_photos() -> None:
    dst = os.path.join(settings.upload_dir, "demo")
    os.makedirs(dst, exist_ok=True)
    for f in os.listdir(PHOTO_SRC):
        target = os.path.join(dst, f)
        if not os.path.exists(target):
            shutil.copyfile(os.path.join(PHOTO_SRC, f), target)


async def seed_demo() -> None:
    enabled = os.getenv("SEED_DEMO", "true").lower() != "false"
    async with AsyncSessionLocal() as db:
        if not enabled:
            # убрать примеры: заказы на них отвязываем, товары и демо-фермеров удаляем
            demo_ids = (await db.execute(select(Product.id).where(Product.is_demo.is_(True)))).scalars().all()
            if demo_ids:
                await db.execute(update(Order).where(Order.product_id.in_(demo_ids)).values(product_id=None))
                await db.execute(delete(Product).where(Product.id.in_(demo_ids)))
                await db.commit()
                print(f"[DEMO] Удалено примеров: {len(demo_ids)}")
            return

        already = (await db.execute(select(Product.id).where(Product.is_demo.is_(True)).limit(1))).scalar_one_or_none()
        _copy_photos()
        if already:
            return

        farmer_ids = {}
        for f in FARMERS:
            user = (await db.execute(select(User).where(User.phone == f["phone"]))).scalar_one_or_none()
            if not user:
                user = User(name=f["name"], phone=f["phone"], city=f["city"], role="fermer",
                            tariff="premium", bonus_points=0, is_active=True,
                            password_hash=get_password_hash(os.urandom(16).hex()))
                db.add(user)
                await db.flush()
            farmer_ids[f["key"]] = user.id

        for key, title, cat, price, unit, qty, photo, place, delivery, desc in PRODUCTS:
            db.add(Product(
                fermer_id=farmer_ids[key], title=title, category=cat, description=desc,
                price_per_unit=price, unit=unit, quantity_available=qty,
                photos=[f"/uploads/demo/{photo}"] if photo else [],
                pickup_location=place, delivery_available=delivery,
                status="active", rating=round(4.6 + (len(title) % 4) / 10, 1), is_demo=True,
            ))
        await db.commit()
        print(f"[DEMO] Добавлено примеров: {len(PRODUCTS)}")
