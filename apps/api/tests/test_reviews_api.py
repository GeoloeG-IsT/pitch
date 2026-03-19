"""Integration tests for the review API endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

PENDING_QUERY_ROW = {
    "id": "aaaa1111-2222-3333-4444-555555555555",
    "user_id": "00000000-0000-0000-0000-000000000000",
    "question": "What is the burn rate?",
    "answer": "The monthly burn rate is $80K.",
    "citations": [],
    "status": "queued",
    "confidence_score": 25.0,
    "confidence_tier": "low",
    "review_status": "pending_review",
    "founder_answer": None,
    "reviewed_by": None,
    "reviewed_at": None,
    "created_at": "2026-01-01T00:00:00Z",
    "metadata": {},
}


def _make_reviews_mock_client(
    query_rows: list[dict] | None = None,
    single_row: dict | None = None,
) -> MagicMock:
    """Create a mock Supabase client for review endpoints."""
    client = MagicMock()
    rows = query_rows if query_rows is not None else [PENDING_QUERY_ROW]
    single = single_row if single_row is not None else PENDING_QUERY_ROW

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        for method in (
            "insert", "update", "delete", "select", "eq", "order", "single",
        ):
            getattr(chain, method).return_value = chain

        if name == "queries":
            # select().eq().order().execute() -> list
            # select().eq().single().execute() -> single row
            # update().eq().execute() -> updated row list
            chain.execute.return_value = MagicMock(data=rows)
            # Override for single() path: after single() is called, execute returns single row
            single_chain = MagicMock()
            for method in ("select", "eq", "single"):
                getattr(single_chain, method).return_value = single_chain
            single_chain.execute.return_value = MagicMock(data=single)
            # When single() is called on chain, redirect
            chain.single.return_value = single_chain
        else:
            chain.execute.return_value = MagicMock(data=[], count=0)
        return chain

    client.table = MagicMock(side_effect=_table)
    return client


@pytest.mark.asyncio
async def test_list_pending_reviews():
    """GET /api/v1/reviews returns items with review_status=pending_review."""
    mock_client = _make_reviews_mock_client()
    mock_broadcast = AsyncMock()

    with (
        patch("app.api.v1.reviews.get_service_client", return_value=mock_client),
        patch("app.api.v1.reviews.broadcast_approved_answer", mock_broadcast),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/reviews?status=pending_review")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["query_id"] == PENDING_QUERY_ROW["id"]
    assert data[0]["review_status"] == "pending_review"


@pytest.mark.asyncio
async def test_approve_review():
    """PUT /api/v1/reviews/{id} with action=approve updates record."""
    mock_client = _make_reviews_mock_client()
    mock_broadcast = AsyncMock()

    with (
        patch("app.api.v1.reviews.get_service_client", return_value=mock_client),
        patch("app.api.v1.reviews.broadcast_approved_answer", mock_broadcast),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.put(
                f"/api/v1/reviews/{PENDING_QUERY_ROW['id']}",
                json={"action": "approve"},
            )

    assert response.status_code == 200
    mock_broadcast.assert_awaited_once()


@pytest.mark.asyncio
async def test_edit_review():
    """PUT /api/v1/reviews/{id} with action=edit and edited_answer updates record."""
    mock_client = _make_reviews_mock_client()
    mock_broadcast = AsyncMock()

    with (
        patch("app.api.v1.reviews.get_service_client", return_value=mock_client),
        patch("app.api.v1.reviews.broadcast_approved_answer", mock_broadcast),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.put(
                f"/api/v1/reviews/{PENDING_QUERY_ROW['id']}",
                json={"action": "edit", "edited_answer": "The burn rate is $80K/month with 18 months runway."},
            )

    assert response.status_code == 200
    mock_broadcast.assert_awaited_once()


@pytest.mark.asyncio
async def test_reject_requires_replacement():
    """PUT /api/v1/reviews/{id} with action=reject without edited_answer returns 422."""
    mock_client = _make_reviews_mock_client()
    mock_broadcast = AsyncMock()

    with (
        patch("app.api.v1.reviews.get_service_client", return_value=mock_client),
        patch("app.api.v1.reviews.broadcast_approved_answer", mock_broadcast),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.put(
                f"/api/v1/reviews/{PENDING_QUERY_ROW['id']}",
                json={"action": "reject"},
            )

    assert response.status_code == 422
