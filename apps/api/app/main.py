from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.documents import router as documents_router
from app.api.v1.health import router as health_router

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
app.include_router(documents_router, prefix="/api/v1")
