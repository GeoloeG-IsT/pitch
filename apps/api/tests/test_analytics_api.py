"""Integration tests for analytics API endpoints."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

FOUNDER_ID = "f0000000-0000-0000-0000-000000000001"
USER_ID = "u0000000-0000-0000-0000-000000000001"
SHARE_TOKEN_ID = "st000000-0000-0000-0000-000000000001"
SESSION_ID = "sess-abc-123"


def _beacon_payload(
    user_id: str | None = None,
    share_token_id: str | None = None,
    scroll_depth: int | None = None,
) -> dict:
    return {
        "session_id": SESSION_ID,
        "user_id": user_id,
        "share_token_id": share_token_id,
        "founder_id": FOUNDER_ID,
        "events": [
            {"section_id": "section-1", "duration_ms": 5000},
            {"section_id": "section-2", "duration_ms": 3000},
        ],
        "scroll_depth": scroll_depth,
        "session_start": 1700000000000,
        "session_end": 1700000008000,
    }


def _make_chainable_mock(**execute_kwargs) -> MagicMock:
    """Create a chainable mock where every method returns self, and execute() returns given data."""
    chain = MagicMock()
    for method in (
        "insert", "update", "delete", "select", "eq", "gte",
        "order", "single", "in_", "limit", "neq",
    ):
        getattr(chain, method).return_value = chain
    chain.execute.return_value = MagicMock(**execute_kwargs)
    return chain


def _make_analytics_mock_client(
    existing_page_open_count: int = 0,
    share_token_row: dict | None = None,
) -> tuple[MagicMock, dict[str, list[MagicMock]]]:
    """Create a mock Supabase client for analytics endpoints.

    Returns (client, table_calls) where table_calls maps table names to
    the list of chain mocks returned for each .table(name) call.
    """
    client = MagicMock()
    table_calls: dict[str, list[MagicMock]] = {}

    def _table(name: str) -> MagicMock:
        if name == "analytics_events":
            chain = _make_chainable_mock(
                data=[{"id": "x"}] * existing_page_open_count,
                count=existing_page_open_count,
            )
            # insert().execute() should also work
            chain.insert.return_value = chain
        elif name == "share_tokens":
            st_data = share_token_row or {
                "id": SHARE_TOKEN_ID,
                "investor_email": "investor@example.com",
                "token": "abcd1234efgh5678",
            }
            chain = _make_chainable_mock(data=st_data)
        elif name == "queries":
            chain = _make_chainable_mock(data=[])
        elif name == "documents":
            chain = _make_chainable_mock(data=[])
        elif name == "chunks":
            chain = _make_chainable_mock(data=[])
        elif name == "users":
            chain = _make_chainable_mock(data={"id": USER_ID, "email": "user@example.com"})
        else:
            chain = _make_chainable_mock(data=[])

        table_calls.setdefault(name, []).append(chain)
        return chain

    client.table = MagicMock(side_effect=_table)
    return client, table_calls


# Override auth dependency for protected endpoints
async def _fake_get_current_user():
    return {"sub": FOUNDER_ID, "email": "founder@example.com", "role": "founder"}


@pytest.mark.asyncio
async def test_ingest_events():
    """POST /api/v1/analytics/events ingests beacon payload and returns 204."""
    mock_client, table_calls = _make_analytics_mock_client(existing_page_open_count=2)

    with patch("app.api.v1.analytics.get_service_client", return_value=mock_client):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = _beacon_payload(user_id=USER_ID)
            response = await ac.post(
                "/api/v1/analytics/events",
                content=json.dumps(payload),
                headers={"Content-Type": "text/plain"},
            )

    assert response.status_code == 204
    # The first analytics_events call should be the insert
    ae_chains = table_calls["analytics_events"]
    assert len(ae_chains) >= 1
    insert_call = ae_chains[0].insert
    assert insert_call.called
    rows = insert_call.call_args[0][0]
    event_types = [r["event_type"] for r in rows]
    assert "page_open" in event_types
    assert "page_close" in event_types
    assert "section_time" in event_types


@pytest.mark.asyncio
async def test_ingest_events_with_scroll_depth():
    """POST with scroll_depth creates a scroll_depth event row."""
    mock_client, table_calls = _make_analytics_mock_client(existing_page_open_count=2)

    with patch("app.api.v1.analytics.get_service_client", return_value=mock_client):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = _beacon_payload(user_id=USER_ID, scroll_depth=75)
            response = await ac.post(
                "/api/v1/analytics/events",
                content=json.dumps(payload),
            )

    assert response.status_code == 204
    rows = table_calls["analytics_events"][0].insert.call_args[0][0]
    scroll_rows = [r for r in rows if r["event_type"] == "scroll_depth"]
    assert len(scroll_rows) == 1
    assert scroll_rows[0]["scroll_depth"] == 75


@pytest.mark.asyncio
async def test_investor_list():
    """GET /api/v1/analytics/summary returns investor list."""
    mock_client = MagicMock()

    events_data = [
        {
            "user_id": USER_ID,
            "share_token_id": None,
            "founder_id": FOUNDER_ID,
            "session_id": "s1",
            "event_type": "section_time",
            "section_id": "sec-1",
            "duration_ms": 10000,
            "scroll_depth": None,
            "created_at": "2026-03-19T12:00:00Z",
        },
        {
            "user_id": USER_ID,
            "share_token_id": None,
            "founder_id": FOUNDER_ID,
            "session_id": "s1",
            "event_type": "page_open",
            "section_id": None,
            "duration_ms": None,
            "scroll_depth": None,
            "created_at": "2026-03-19T12:00:00Z",
        },
    ]

    def _table(name: str) -> MagicMock:
        if name == "analytics_events":
            return _make_chainable_mock(data=events_data)
        elif name == "queries":
            return _make_chainable_mock(data=[])
        elif name == "documents":
            return _make_chainable_mock(data=[])
        elif name == "users":
            return _make_chainable_mock(data={"id": USER_ID, "email": "investor@test.com"})
        return _make_chainable_mock(data=[])

    mock_client.table = MagicMock(side_effect=_table)

    from app.core.auth import get_current_user

    with patch("app.api.v1.analytics.get_service_client", return_value=mock_client):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get("/api/v1/analytics/summary")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert "investors" in data
    assert len(data["investors"]) == 1
    assert data["investors"][0]["investor_key"] == USER_ID
    assert data["investors"][0]["total_time_ms"] == 10000


@pytest.mark.asyncio
async def test_section_times():
    """GET /api/v1/analytics/investor/{key} returns per-section aggregation."""
    mock_client = MagicMock()

    section_events = [
        {"section_id": "sec-1", "duration_ms": 5000},
        {"section_id": "sec-1", "duration_ms": 3000},
        {"section_id": "sec-2", "duration_ms": 2000},
    ]

    def _table(name: str) -> MagicMock:
        if name == "analytics_events":
            return _make_chainable_mock(data=section_events)
        elif name == "queries":
            return _make_chainable_mock(data=[])
        elif name == "users":
            return _make_chainable_mock(data={"id": USER_ID, "email": "user@test.com"})
        return _make_chainable_mock(data=[])

    mock_client.table = MagicMock(side_effect=_table)

    from app.core.auth import get_current_user

    with patch("app.api.v1.analytics.get_service_client", return_value=mock_client):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get(f"/api/v1/analytics/investor/{USER_ID}")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["investor_key"] == USER_ID
    sections = {s["section_id"]: s["duration_ms"] for s in data["sections"]}
    assert sections["sec-1"] == 8000
    assert sections["sec-2"] == 2000


@pytest.mark.asyncio
async def test_question_log():
    """GET /api/v1/analytics/investor/{key} returns question log."""
    mock_client = MagicMock()

    questions_data = [
        {"question": "What is the ARR?", "created_at": "2026-03-19T12:00:00Z"},
        {"question": "What is the burn rate?", "created_at": "2026-03-19T12:01:00Z"},
    ]

    def _table(name: str) -> MagicMock:
        if name == "analytics_events":
            return _make_chainable_mock(data=[])
        elif name == "queries":
            return _make_chainable_mock(data=questions_data)
        elif name == "users":
            return _make_chainable_mock(data={"id": USER_ID, "email": "user@test.com"})
        return _make_chainable_mock(data=[])

    mock_client.table = MagicMock(side_effect=_table)

    from app.core.auth import get_current_user

    with patch("app.api.v1.analytics.get_service_client", return_value=mock_client):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get(f"/api/v1/analytics/investor/{USER_ID}")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) == 2
    assert data["questions"][0]["question"] == "What is the ARR?"


@pytest.mark.asyncio
async def test_engagement_scoring():
    """Investor with financials_time >= 5min should be scored as 'hot'."""
    mock_client = MagicMock()

    events_data = [
        {
            "user_id": USER_ID,
            "share_token_id": None,
            "founder_id": FOUNDER_ID,
            "session_id": "s1",
            "event_type": "section_time",
            "section_id": "42",
            "duration_ms": 360000,  # 6 minutes
            "scroll_depth": None,
            "created_at": "2026-03-19T12:00:00Z",
        },
        {
            "user_id": USER_ID,
            "share_token_id": None,
            "founder_id": FOUNDER_ID,
            "session_id": "s1",
            "event_type": "page_open",
            "section_id": None,
            "duration_ms": None,
            "scroll_depth": None,
            "created_at": "2026-03-19T12:00:00Z",
        },
    ]

    def _table(name: str) -> MagicMock:
        if name == "analytics_events":
            return _make_chainable_mock(data=events_data)
        elif name == "queries":
            return _make_chainable_mock(data=[])
        elif name == "documents":
            return _make_chainable_mock(data=[{"id": "doc-xlsx-1"}])
        elif name == "chunks":
            return _make_chainable_mock(data=[{"section_number": 42}])
        elif name == "users":
            return _make_chainable_mock(data={"id": USER_ID, "email": "investor@test.com"})
        return _make_chainable_mock(data=[])

    mock_client.table = MagicMock(side_effect=_table)

    from app.core.auth import get_current_user

    with patch("app.api.v1.analytics.get_service_client", return_value=mock_client):
        app.dependency_overrides[get_current_user] = _fake_get_current_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get("/api/v1/analytics/summary")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert len(data["investors"]) == 1
    assert data["investors"][0]["engagement"] == "hot"
    assert data["investors"][0]["financials_time_ms"] == 360000


@pytest.mark.asyncio
async def test_first_view_notification():
    """First beacon for a share_token triggers notify_founder; second does not."""
    # First view: count=1 (just inserted)
    mock_client_first, _ = _make_analytics_mock_client(
        existing_page_open_count=1,
        share_token_row={
            "id": SHARE_TOKEN_ID,
            "investor_email": "new-investor@example.com",
            "token": "abcd1234efgh5678",
        },
    )
    mock_notify = AsyncMock()

    with (
        patch("app.api.v1.analytics.get_service_client", return_value=mock_client_first),
        patch("app.api.v1.notifications.notify_founder", mock_notify),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = _beacon_payload(share_token_id=SHARE_TOKEN_ID)
            response = await ac.post(
                "/api/v1/analytics/events",
                content=json.dumps(payload),
            )

    assert response.status_code == 204
    mock_notify.assert_awaited_once()
    call_args = mock_notify.call_args
    assert call_args[0][0] == FOUNDER_ID
    assert call_args[0][1]["type"] == "pitch_opened"
    assert call_args[0][1]["investor"] == "new-investor@example.com"

    # Second view: count=2 (return visit)
    mock_client_second, _ = _make_analytics_mock_client(existing_page_open_count=2)
    mock_notify_2 = AsyncMock()

    with (
        patch("app.api.v1.analytics.get_service_client", return_value=mock_client_second),
        patch("app.api.v1.notifications.notify_founder", mock_notify_2),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = _beacon_payload(share_token_id=SHARE_TOKEN_ID)
            response = await ac.post(
                "/api/v1/analytics/events",
                content=json.dumps(payload),
            )

    assert response.status_code == 204
    mock_notify_2.assert_not_awaited()
