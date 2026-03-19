from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from project root (two levels up from this file)
_root = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    openai_api_key: str = ""
    cohere_api_key: str = ""
    supabase_jwt_secret: str = ""
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=str(_root / ".env"), extra="ignore")


settings = Settings()
