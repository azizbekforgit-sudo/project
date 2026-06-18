from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator
import os

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/agroverse"
    secret_key: str = "agroverse-super-secret-key-2024-default-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200 # 30 days default
    refresh_token_expire_days: int = 30
    upload_dir: str = "uploads"
    grok_api_key: str = ""

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        if not v:
            return v
        # Railway дает postgresql://, но asyncpg требует +asyncpg
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()