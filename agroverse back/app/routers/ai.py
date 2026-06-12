from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_fermer
from app.models import User
import random

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/demand-forecast")
async def demand_forecast(
    product_category: str,
    current_user: User = Depends(get_current_fermer)
):
    """Прогноз спроса на товар"""
    # Заглушка для MVP
    forecasts = {
        "овощи": {"demand": "высокий", "trend": "+15%", "best_month": "сентябрь"},
        "фрукты": {"demand": "средний", "trend": "+8%", "best_month": "август"},
        "зелень": {"demand": "высокий", "trend": "+25%", "best_month": "май"},
        "зерновые": {"demand": "стабильный", "trend": "+3%", "best_month": "октябрь"}
    }
    
    return forecasts.get(product_category.lower(), {
        "demand": "средний",
        "trend": f"+{random.randint(1, 20)}%",
        "best_month": ["апрель", "май", "июнь", "сентябрь"][random.randint(0, 3)]
    })

@router.get("/price-analysis")
async def price_analysis(
    product_category: str,
    current_user: User = Depends(get_current_fermer)
):
    """Анализ рыночных цен"""
    return {
        "category": product_category,
        "average_price": round(random.uniform(50, 500), 2),
        "min_price": round(random.uniform(30, 150), 2),
        "max_price": round(random.uniform(200, 1000), 2),
        "recommended_price": round(random.uniform(80, 300), 2),
        "trend": "rising" if random.random() > 0.5 else "falling"
    }

@router.get("/planting-advice")
async def planting_advice(
    current_user: User = Depends(get_current_fermer)
):
    """Советы по посеву"""
    advice_list = [
        "🌱 Оптимальное время для посадки томатов - середина марта",
        "🌾 Пшеницу лучше сажать в первой декаде апреля",
        "🥕 Морковь устойчива к заморозкам, можно сажать в конце апреля",
        "🥒 Огурцы требуют тепла, сажайте после 20 мая",
        "🧅 Лук севок высаживают при температуре почвы +5°C"
    ]
    
    return {
        "advice": random.choice(advice_list),
        "soil_temperature": f"{random.randint(5, 25)}°C",
        "humidity": f"{random.randint(40, 80)}%"
    }

@router.get("/sell-advice")
async def sell_advice(
    product_id: int,
    current_user: User = Depends(get_current_fermer)
):
    """Советы по продаже"""
    actions = [
        "Повысьте цену на 15% - сезонный спрос растет",
        "Сделайте скидку 10% для оптовых покупателей",
        "Добавьте больше фото для привлечения внимания",
        "Обновите описание, добавьте информацию о свежести",
        "Закажите продвижение товара в топ поиска"
    ]
    
    return {
        "advice": random.choice(actions),
        "best_time_to_sell": "утренние часы (8:00-11:00)",
        "competitors_price": round(random.uniform(50, 500), 2)
    }

@router.get("/risks")
async def analyze_risks(
    region: str = "Tashkent",
    current_user: User = Depends(get_current_fermer)
):
    """Анализ рисков (погода, болезни)"""
    return {
        "weather_risk": random.choice(["низкий", "средний", "высокий"]),
        "pest_risk": random.choice(["низкий", "средний"]),
        "recommendations": [
            "Регулярно проверяйте растения на наличие вредителей",
            "Полив рекомендуется в утренние часы",
            "Используйте органические удобрения"
        ],
        "forecast": "Следующие 7 дней без осадков, температура +25..+30°C"
    }