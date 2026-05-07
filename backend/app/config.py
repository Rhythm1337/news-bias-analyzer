from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://newsbias:devpassword@localhost:5432/newsbias"
    cors_origin: str = "http://localhost:3000"

    ai_provider: str = "gemini"
    gemini_api_key: str | None = None
    openai_api_key: str | None = None

    debug: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origin.split(",") if o.strip()]


settings = Settings()
