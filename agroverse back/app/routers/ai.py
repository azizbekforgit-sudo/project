from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.dependencies import get_current_fermer, get_current_user
from app.models import User
from app.config import settings
import asyncio
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
    "uz": "Sen AgroVerse — O'zbekiston fermerlari bozori platformasining yordamchisisan. Ko'p foydalanuvchilar keksa yoshdagi odamlar. O'zbek tilida, oddiy so'zlar bilan, qisqa javob ber (6 gapgacha yoki qisqa ro'yxat). Hosil, parvarish, narxlar, O'zbekistondagi mavsumlar va saytdan foydalanish bo'yicha yordam ber: mahsulot «Sotish» tugmasi bilan qo'shiladi, «Bozor»da sotib olinadi, buyurtma fermerga boradi, ular telefonda gaplashadi, fermer «Sotildi» yoki «Rad etish»ni bosadi. Agar odam saytda adashsa yoki muammo bo'lsa, qo'llab-quvvatlash raqamini ayt: +998 50 900 25 41.",
    "ru": "Ты помощник платформы AgroVerse — рынка фермеров Узбекистана. Многие пользователи — люди старшего возраста. Отвечай по-русски, простыми словами, коротко (до 6 предложений или короткий список). Помогай с урожаем, уходом за растениями, ценами, сезонами в Узбекистане и с тем, как пользоваться сайтом: товар добавляют кнопкой «Продать», покупают на «Рынке», заказ приходит фермеру, стороны созваниваются, фермер отмечает «Продано» или «Отклонить». Если человек запутался или что-то не работает, дай номер поддержки: +998 50 900 25 41.",
    "en": "You are the AI assistant of AgroVerse — an agricultural marketplace for farmers and buyers. Help with questions about farm products, pricing, seasonal tips, buying and selling, and using the platform. Be concise and helpful. If someone is stuck or something doesn't work, give the support phone: +998 50 900 25 41.",
}


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


async def _ask_gemini(system_prompt: str, history: list) -> str:
    """Спрашиваем Gemini. Модели перебираются по очереди: если одна перегружена
    (503/429) или снята (404) — пробуем следующую."""
    contents = [
        {"role": "model" if m.role == "assistant" else "user", "parts": [{"text": m.content[:4000]}]}
        for m in history
    ]
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.6, "maxOutputTokens": 800},
    }
    models = [m.strip() for m in settings.gemini_models.split(",") if m.strip()]
    last_status = None
    async with httpx.AsyncClient(timeout=40.0) as client:
        for model in models:
            for attempt in range(2):
                try:
                    resp = await client.post(
                        GEMINI_URL.format(model=model),
                        headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"},
                        json=payload,
                    )
                except httpx.RequestError:
                    last_status = "network"
                    break
                last_status = resp.status_code
                if resp.status_code == 200:
                    data = resp.json()
                    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
                    text = "".join(p.get("text", "") for p in parts).strip()
                    if text:
                        return text
                    break  # пустой ответ (фильтр) — пробуем другую модель
                if resp.status_code in (429, 500, 503) and attempt == 0:
                    await asyncio.sleep(1.5)
                    continue
                if resp.status_code in (401, 403):
                    raise HTTPException(502, "Ключ ИИ не принят. Проверьте GEMINI_API_KEY на сервере.")
                break  # 404 и прочее — следующая модель
    if last_status in (429, 503):
        raise HTTPException(503, "Помощник сейчас перегружен. Попробуйте через минуту.")
    raise HTTPException(502, "Не удалось получить ответ помощника. Попробуйте ещё раз.")


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def _ask_groq(system_prompt: str, history: list) -> str:
    """Спрашиваем Groq (OpenAI-совместимый API). Модели — по очереди, как у Gemini:
    перегружена (429/503) или снята (404/400) — пробуем следующую."""
    messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content[:4000]} for m in history
    ]
    models = [m.strip() for m in settings.groq_models.split(",") if m.strip()]
    last_status = None
    async with httpx.AsyncClient(timeout=40.0) as client:
        for model in models:
            for attempt in range(2):
                try:
                    resp = await client.post(
                        GROQ_URL,
                        headers={"Authorization": f"Bearer {settings.groq_api_key}", "Content-Type": "application/json"},
                        json={"model": model, "messages": messages, "temperature": 0.6, "max_tokens": 800},
                    )
                except httpx.RequestError:
                    last_status = "network"
                    break
                last_status = resp.status_code
                if resp.status_code == 200:
                    text = (resp.json().get("choices") or [{}])[0].get("message", {}).get("content", "")
                    text = (text or "").strip()
                    if text:
                        return text
                    break
                if resp.status_code in (429, 500, 503) and attempt == 0:
                    await asyncio.sleep(1.5)
                    continue
                if resp.status_code in (401, 403):
                    raise HTTPException(502, "Ключ ИИ не принят. Проверьте GROQ_API_KEY на сервере.")
                break
    if last_status in (429, 503):
        raise HTTPException(503, "Помощник сейчас перегружен. Попробуйте через минуту.")
    raise HTTPException(502, "Не удалось получить ответ помощника. Попробуйте ещё раз.")


async def _ask_grok(system_prompt: str, history: list) -> str:
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
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {settings.grok_api_key}"},
                json=payload,
            )
    except httpx.RequestError:
        raise HTTPException(502, "Не удалось связаться с AI сервисом")
    if resp.status_code != 200:
        raise HTTPException(502, "AI сервис вернул ошибку")
    return resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")


@router.post("/chat")
async def ai_chat(
    data: AIChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Чат с помощником. Ключи хранятся только на сервере: GROQ_API_KEY, GEMINI_API_KEY или GROK_API_KEY.
    Если заданы несколько — сначала Groq, при его сбое — Gemini."""
    # Игнорируем любой 'system' от клиента — промпт задаётся только сервером
    history = [m for m in data.messages if m.role in ("user", "assistant")][-10:]
    if not history:
        raise HTTPException(400, "Пустой вопрос")
    system_prompt = _SYSTEM_PROMPTS.get(data.lang, _SYSTEM_PROMPTS["ru"])

    if settings.groq_api_key:
        try:
            reply = await _ask_groq(system_prompt, history)
        except HTTPException:
            if not settings.gemini_api_key:
                raise
            reply = await _ask_gemini(system_prompt, history)
    elif settings.gemini_api_key:
        reply = await _ask_gemini(system_prompt, history)
    elif settings.grok_api_key:
        reply = await _ask_grok(system_prompt, history)
    else:
        raise HTTPException(503, "Помощник ещё не настроен: добавьте GROQ_API_KEY или GEMINI_API_KEY на сервере")
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