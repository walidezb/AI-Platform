from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    DATABASE_URL: str = ""
    INTERNAL_SERVICE_SECRET: str = "change-me"
    API_URL: str = "http://localhost:3001"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
