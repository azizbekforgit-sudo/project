from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator
import os
import hashlib

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/agroverse"
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200 # 30 days default
    refresh_token_expire_days: int = 30
    upload_dir: str = "uploads"
    grok_api_key: str = ""
    # Google Gemini: ключ задаётся ТОЛЬКО переменной окружения GEMINI_API_KEY на сервере
    gemini_api_key: str = ""
    # Groq (ключ вида gsk_...): только переменной окружения GROQ_API_KEY на сервере
    groq_api_key: str = ""
    groq_models: str = "llama-3.3-70b-versatile,openai/gpt-oss-120b,llama-3.1-8b-instant"
    gemini_models: str = "gemini-flash-latest,gemini-3.8-flash,gemini-3.5-flash-lite,gemini-2.5-flash"
    # Вход через Google: OAuth Client ID (Web) из Google Cloud Console
    google_client_id: str = ""
    # СМС-коды через Eskiz.uz
    eskiz_email: str = ""
    eskiz_password: str = ""
    eskiz_from: str = "4546"
    google_maps_key: str = ""
    admin_phone: str = "+998000000000"
    admin_password: str = "admin123"

    def model_post_init(self, __context):
        if not self.secret_key:
            # Deterministic key from database_url — survives Railway restarts
            self.secret_key = hashlib.sha256(
                (self.database_url + "agroverse-salt-2024").encode()
            ).hexdigest()

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        if not v:
            return v
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()