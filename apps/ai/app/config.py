import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

# ── LangSmith Tracing Setup (Optional) ──
# Must run BEFORE any LangChain modules are imported
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY")
if LANGSMITH_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = LANGSMITH_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = os.getenv(
        "LANGCHAIN_PROJECT", "learnai-production"
    )
    os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
    print(
        f"[Config] LangSmith tracing ENABLED — project: {os.environ['LANGCHAIN_PROJECT']}"
    )
else:
    os.environ.pop("LANGCHAIN_TRACING_V2", None)
    os.environ.pop("LANGCHAIN_API_KEY", None)
    print("[Config] LangSmith tracing DISABLED (no API key)")

class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    DATABASE_URL: str = ""
    INTERNAL_SERVICE_SECRET: str = "change-me"
    API_URL: str = "http://localhost:3001"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # LangSmith Tracing
    LANGSMITH_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "learnai-production"

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
