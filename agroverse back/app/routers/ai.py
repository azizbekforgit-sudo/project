from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.dependencies import get_current_fermer, get_current_user
from app.models import User
from app.config import settings
import random
import httpx

router = APIRouter(prefix="/api/ai", tags=["ai"])

GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROK_MODEL = "grok-3-mini"


class AIChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    messages: list[AIChatMessage] = Field(..., max_length=20)
    lang: str = "ru"


_SYSTEM_PROMPTS = {
    "uz": "Sen AgroVerse agromaydon platformasining AI yordamchisissan. Foydalanuvchilarga qishloq xo'jaligi mahsulotlarini sotish va sotib olish, narx belgilash, mavsumiy maslahatlar va platformadan foydalanish bo'yicha yordam berasan. Qisqa va foydali javoblar ber.",
    "ru": "Ты AI-ассистент платформы AgroVerse — агромаркетплейс для фермеров и покупателей. Помогаешь с вопросами о сельскохозяйственных товарах, ценах, сезонных советах, покупке и продаже, использовании платформы. Отвечай кратко и по делу.",
    "en": "You are the AI assistant of AgroVerse — an agricultural marketplace for farmers and buyers. Help with questions about farm products, pricing, seasonal tips, buying and selling, and using the platform. Be concise and helpful.",
}


@router.post("/chat")
async def ai_chat(
    data: AIChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Проксирует чат к Grok (xAI). Ключ хранится только на сервере."""
    if not settings.grok_api_key:
        raise HTTPException(500, "AI сервис временно не настроен")

    # Игнорируем любой 'system' от клиента — промпт задаётся только сервером
    history = [m for m in data.messages if m.role in ("user", "assistant")][-10:]
    system_prompt = _SYSTEM_PROMPTS.get(data.lang, _SYSTEM_PROMPTS["ru"])

    payload = {
        "model": GROK_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + [m.model_dump() for m in history],
        "temperature": 0.7,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROK_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.grok_api_key}",
                },
                json=payload,
            )
    except httpx.RequestError:
        raise HTTPException(502, "Не удалось связаться с AI сервисом")

    if resp.status_code != 200:
        raise HTTPException(502, "AI сервис вернул ошибку")

    result = resp.json()
    reply = (
        result.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    return {"reply": reply}

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