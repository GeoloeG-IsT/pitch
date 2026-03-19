"""JWT validation dependency for FastAPI endpoints."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.core.config import settings
from app.core.supabase import get_service_client

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Validate Supabase JWT and return user claims.

    Returns dict with at minimum 'sub' (user UUID), 'email', 'role'.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Like get_current_user but returns None instead of 401 for unauthenticated requests."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def validate_share_token(token: str) -> dict | None:
    """Validate a share token against the database. Returns token row or None."""
    from datetime import datetime, timezone

    client = get_service_client()
    result = (
        client.table("share_tokens")
        .select("*")
        .eq("token", token)
        .is_("revoked_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        return None

    expires_at = datetime.fromisoformat(result.data["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        return None

    return result.data
