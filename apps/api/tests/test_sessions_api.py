"""Integration tests for live session API endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

FOUNDER_ID = "f0000000-0000-0000-0000-000000000001"
SESSION_ID = "s0000000-0000-0000-0000-000000000001"
QUERY_ID = "q0000000-0000-0000-0000-000000000001"


def _make_chainable_mock(**execute_kwargs) -> MagicMock:
    """Create a chainable mock where every method returns self, and execute() returns given data."""
    chain = MagicMock()
    for method in (
        "insert", "update", "delete", "select", "eq", "gte",
        "order", "single", "in_", "limit", "neq", "is_",
    ):
        getattr(chain, method).return_value = chain
    chain.execute.return_value = MagicMock(**execute_kwargs)
    return chain


async def _fake_get_current_user():
    return {"sub": FOUNDER_ID, "email": "founder@example.com", "role": "founder"}


@pytest.fixture(autouse=True)
def _clear_active_sessions():
    """Clear the in-memory session cache before each test."""
    from app.api.v1.sessions import _active_sessions
    _active_sessions.clear()
    yield
    _active_sessions.clear()


@pytest.mark.asyncio
async def test_create_session():
    """POST /api/v1/sessions creates a new session and returns 201."""
    mock_client = MagicMock()
    insert_chain = _make_chainable_mock(
        data=[{
            "id": SESSION_ID,
            "founder_id": FOUNDER_ID,
            "started_at": "2026-03-20T10:00:00Z",
            "ended_at": None,
        }]
    )
    mock_client.table.return_value = insert_chain

    mock_broadcast = AsyncMock()

    from app.core.auth import get_current_user

    with (
        patch("app.api.v1.sessions.get_service_client", return_value=mock_client),
        patch("app.api.v1.sessions.broadcast_session_event", mock_broadcast),
    ):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post("/api/v1/sessions")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 201
    data = response.json()
    assert data["session_id"] == SESSION_ID
    assert data["is_active"] is True
    mock_broadcast.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_session_conflict():
    """POST /api/v1/sessions returns 409 when session already active."""
    from app.api.v1.sessions import _active_sessions
    _active_sessions[FOUNDER_ID] = {"id": SESSION_ID, "started_at": "2026-03-20T10:00:00Z"}

    from app.core.auth import get_current_user

    app.dependency_overrides[get_current_user] = _fake_get_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/api/v1/sessions")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_end_session():
    """DELETE /api/v1/sessions/{session_id} ends the session."""
    from app.api.v1.sessions import _active_sessions
    _active_sessions[FOUNDER_ID] = {"id": SESSION_ID, "started_at": "2026-03-20T10:00:00Z"}

    mock_client = MagicMock()

    # First call: select for session fetch
    select_chain = _make_chainable_mock(
        data={
            "id": SESSION_ID,
            "founder_id": FOUNDER_ID,
            "started_at": "2026-03-20T10:00:00Z",
            "ended_at": None,
        }
    )
    # Second call: update
    update_chain = _make_chainable_mock(data=[])

    mock_client.table.side_effect = [select_chain, update_chain]

    mock_broadcast = AsyncMock()

    from app.core.auth import get_current_user

    with (
        patch("app.api.v1.sessions.get_service_client", return_value=mock_client),
        patch("app.api.v1.sessions.broadcast_session_event", mock_broadcast),
    ):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.delete(f"/api/v1/sessions/{SESSION_ID}")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["ended_at"] is not None
    assert FOUNDER_ID not in _active_sessions


@pytest.mark.asyncio
async def test_get_active_session():
    """GET /api/v1/sessions/active returns session when active, null when not."""
    from app.core.auth import get_current_user

    # No active session
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/sessions/active")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"session": None}

    # With active session
    from app.api.v1.sessions import _active_sessions
    _active_sessions[FOUNDER_ID] = {"id": SESSION_ID, "started_at": "2026-03-20T10:00:00Z"}

    app.dependency_overrides[get_current_user] = _fake_get_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/sessions/active")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == SESSION_ID
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_live_question_approve():
    """PUT approve action sets review_status=approved and broadcasts."""
    from app.api.v1.sessions import _active_sessions
    _active_sessions[FOUNDER_ID] = {"id": SESSION_ID, "started_at": "2026-03-20T10:00:00Z"}

    mock_client = MagicMock()

    query_row = {
        "id": QUERY_ID,
        "question": "What is your revenue?",
        "answer": "AI draft answer",
        "citations": [],
        "confidence_score": 0.8,
        "confidence_tier": "high",
        "review_status": "pending_review",
        "founder_answer": None,
        "created_at": "2026-03-20T10:01:00Z",
        "live_session_id": SESSION_ID,
    }

    # First call: select query
    select_chain = _make_chainable_mock(data=query_row)
    # Second call: update query
    updated_row = {**query_row, "review_status": "approved", "status": "complete"}
    update_chain = _make_chainable_mock(data=[updated_row])

    mock_client.table.side_effect = [select_chain, update_chain]

    mock_broadcast = AsyncMock()

    from app.core.auth import get_current_user

    with (
        patch("app.api.v1.sessions.get_service_client", return_value=mock_client),
        patch("app.api.v1.sessions.broadcast_approved_answer", mock_broadcast),
    ):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.put(
                    f"/api/v1/sessions/{SESSION_ID}/questions/{QUERY_ID}",
                    json={"action": "approve"},
                )
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["review_status"] == "approved"
    mock_broadcast.assert_awaited_once()


@pytest.mark.asyncio
async def test_live_question_dismiss():
    """PUT dismiss action sets review_status=dismissed."""
    from app.api.v1.sessions import _active_sessions
    _active_sessions[FOUNDER_ID] = {"id": SESSION_ID, "started_at": "2026-03-20T10:00:00Z"}

    mock_client = MagicMock()

    query_row = {
        "id": QUERY_ID,
        "question": "Irrelevant question",
        "answer": "AI draft",
        "citations": [],
        "confidence_score": 0.5,
        "confidence_tier": "moderate",
        "review_status": "pending_review",
        "founder_answer": None,
        "created_at": "2026-03-20T10:01:00Z",
        "live_session_id": SESSION_ID,
    }

    select_chain = _make_chainable_mock(data=query_row)
    updated_row = {**query_row, "review_status": "dismissed", "status": "complete"}
    update_chain = _make_chainable_mock(data=[updated_row])

    mock_client.table.side_effect = [select_chain, update_chain]

    mock_dismiss = AsyncMock()

    from app.core.auth import get_current_user

    with (
        patch("app.api.v1.sessions.get_service_client", return_value=mock_client),
        patch("app.api.v1.sessions.broadcast_dismissed_question", mock_dismiss),
    ):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.put(
                    f"/api/v1/sessions/{SESSION_ID}/questions/{QUERY_ID}",
                    json={"action": "dismiss"},
                )
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["review_status"] == "dismissed"
    mock_dismiss.assert_awaited_once_with(QUERY_ID)


@pytest.mark.asyncio
async def test_live_question_override():
    """PUT override action updates answer with edited_answer."""
    from app.api.v1.sessions import _active_sessions
    _active_sessions[FOUNDER_ID] = {"id": SESSION_ID, "started_at": "2026-03-20T10:00:00Z"}

    mock_client = MagicMock()

    query_row = {
        "id": QUERY_ID,
        "question": "What is your revenue?",
        "answer": "AI draft answer",
        "citations": [],
        "confidence_score": 0.8,
        "confidence_tier": "high",
        "review_status": "pending_review",
        "founder_answer": None,
        "created_at": "2026-03-20T10:01:00Z",
        "live_session_id": SESSION_ID,
    }

    select_chain = _make_chainable_mock(data=query_row)
    override_answer = "Actually, our revenue is $5M ARR"
    updated_row = {
        **query_row,
        "review_status": "edited",
        "status": "complete",
        "founder_answer": override_answer,
        "answer": override_answer,
    }
    update_chain = _make_chainable_mock(data=[updated_row])

    mock_client.table.side_effect = [select_chain, update_chain]

    mock_broadcast = AsyncMock()

    from app.core.auth import get_current_user

    with (
        patch("app.api.v1.sessions.get_service_client", return_value=mock_client),
        patch("app.api.v1.sessions.broadcast_approved_answer", mock_broadcast),
    ):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.put(
                    f"/api/v1/sessions/{SESSION_ID}/questions/{QUERY_ID}",
                    json={"action": "override", "edited_answer": override_answer},
                )
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == override_answer
    assert data["founder_answer"] == override_answer
    assert data["review_status"] == "edited"
    mock_broadcast.assert_awaited_once()
