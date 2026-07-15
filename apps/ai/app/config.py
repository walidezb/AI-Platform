from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    DATABASE_URL: str = ""
    INTERNAL_SERVICE_SECRET: str = "change-me"
    API_URL: str = "http://localhost:3001"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Pinecone
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "learning-resources"
    PINECONE_ENVIRONMENT: str = "us-east-1"

    # Embedding model
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Google Search Settings
    GOOGLE_SEARCH_API_KEY: str = ""
    GOOGLE_SEARCH_ENGINE_ID: str = ""
    RESOURCE_VALIDATION_ENABLED: bool = True
    GOOGLE_SEARCH_ENABLED: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
