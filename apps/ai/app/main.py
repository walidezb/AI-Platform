import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, assessment, path, search, exercise, evaluation

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="LearnPath AI Service",
    description="AI agents for learning path generation and assessment",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
)

from app.middleware.auth import verify_internal_secret

app.middleware('http')(verify_internal_secret)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(assessment.router)
app.include_router(path.router)
app.include_router(search.router)
app.include_router(exercise.router)
app.include_router(evaluation.router)

@app.on_event("startup")
async def startup():
    logging.getLogger(__name__).info("AI Service started successfully")
