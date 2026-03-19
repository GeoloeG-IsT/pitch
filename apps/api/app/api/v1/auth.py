"""Auth API: share token CRUD and validation."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user, validate_share_token
from app.core.supabase import get_service_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])

# Default token expiry: 14 days
DEFAULT_EXPIRY_DAYS = 14


class ShareTokenCreate(BaseModel):
    expiry_days: int = DEFAULT_EXPIRY_DAYS
    investor_email: str | None = None


class ShareTokenResponse(BaseModel):
    id: str
    token: str
    investor_email: str | None
    expires_at: str
    revoked_at: str | None
    created_at: str


@router.post("/auth/share-tokens", status_code=201)
async def create_share_token(
    body: ShareTokenCreate,
    user: dict = Depends(get_current_user),
) -> ShareTokenResponse:
    """Create a new share token for investor access."""
    token = secrets.token_urlsafe(16)

    expires_at = datetime.now(timezone.utc) + timedelta(days=body.expiry_days)

    client = get_service_client()
    result = client.table("share_tokens").insert({
        "token": token,
        "founder_id": user["sub"],
        "investor_email": body.investor_email,
        "expires_at": expires_at.isoformat(),
    }).execute()

    row = result.data[0]
    return ShareTokenResponse(**row)


@router.get("/auth/share-tokens")
async def list_share_tokens(
    user: dict = Depends(get_current_user),
) -> list[ShareTokenResponse]:
    """List all share tokens for the current founder."""
    client = get_service_client()
    result = (
        client.table("share_tokens")
        .select("*")
        .eq("founder_id", user["sub"])
        .order("created_at", desc=True)
        .execute()
    )
    return [ShareTokenResponse(**row) for row in result.data]


@router.delete("/auth/share-tokens/{token_id}")
async def revoke_share_token(
    token_id: str,
    user: dict = Depends(get_current_user),
):
    """Revoke a share token (soft delete via revoked_at timestamp)."""
    client = get_service_client()

    # Verify the token belongs to this founder
    existing = (
        client.table("share_tokens")
        .select("founder_id")
        .eq("id", token_id)
        .single()
        .execute()
    )
    if not existing.data or existing.data["founder_id"] != user["sub"]:
        raise HTTPException(status_code=404, detail="Token not found")

    client.table("share_tokens").update({
        "revoked_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", token_id).execute()

    return {"status": "revoked"}


@router.get("/auth/validate-token")
async def validate_token_endpoint(token: str):
    """Validate a share token for anonymous pitch access. Public endpoint."""
    result = await validate_share_token(token)
    if not result:
        return {"valid": False}
    return {"valid": True, "token_id": result["id"], "founder_id": result["founder_id"]}
