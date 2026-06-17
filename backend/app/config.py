from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Banco
    database_url: str
    database_url_async: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 horas

    # Groq
    groq_api_key: str = ""

    # App
    debug: bool = False


settings = Settings()
