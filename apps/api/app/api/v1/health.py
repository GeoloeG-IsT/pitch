from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    database_status = "unreachable"

    try:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_key)
        # Simple connectivity check -- query the health of the connection
        client.table("users").select("id", count="exact").limit(0).execute()
        database_status = "ok"
    except Exception:
        database_status = "unreachable"

    return {
        "status": "ok",
        "service": "zeee-pitch-zooo-api",
        "version": "0.1.0",
        "database": database_status,
    }
