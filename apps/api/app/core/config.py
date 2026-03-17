from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_key: str = ""
    environment: str = "development"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
