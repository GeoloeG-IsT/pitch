import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.analytics import router as analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.pitch import router as pitch_router
from app.api.v1.query import router as query_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.sessions import load_active_sessions, router as sessions_router
from app.core.config import settings

# Expose OpenAI key to libraries that read os.environ directly (e.g. LlamaIndex)
if settings.openai_api_key:
    os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)

app = FastAPI(
    title="Zeee Pitch Zooo API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")
app.include_router(pitch_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    await load_active_sessions()
