"""Integration tests for the query API endpoints."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.query import Citation

QUERY_ROW = {
    "id": "qqqqqqqq-1111-2222-3333-444444444444",
    "user_id": "00000000-0000-0000-0000-000000000000",
    "question": "What is the TAM?",
    "answer": None,
    "citations": [],
    "status": "pending",
    "metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
}

SAMPLE_CITATIONS = [
    Citation(
        document_id="doc-111",
        document_title="Pitch Deck",
        section_number=3,
        section_label="Section 3",
        chunk_id="chunk-aaa",
        relevance_score=0.85,
    ),
]


def _make_mock_client(query_rows: list[dict] | None = None) -> MagicMock:
    """Create a mock Supabase client with chainable operations."""
    client = MagicMock()
    rows = query_rows if query_rows is not None else [QUERY_ROW]

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        chain._table_name = name

        for method in ("insert", "update", "delete", "select", "eq", "order", "single"):
            getattr(chain, method).return_value = chain

        if name == "queries":
            chain.execute.return_value = MagicMock(data=rows if isinstance(rows, list) and len(rows) > 0 else rows, count=len(rows) if isinstance(rows, list) else 0)
        else:
            chain.execute.return_value = MagicMock(data=[], count=0)

        return chain

    client.table = MagicMock(side_effect=_table)
    return client


@pytest.fixture
def mock_supabase_query():
    """Patch get_service_client in the query module."""
    with patch("app.api.v1.query.get_service_client") as mock_get:
        mock_client = _make_mock_client()
        mock_get.return_value = mock_client
        yield mock_client


@pytest.mark.asyncio
async def test_create_query(mock_supabase_query):
    """POST /api/v1/query returns 201 with query record."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/query",
            json={"question": "What is the TAM?"},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["query_id"] == QUERY_ROW["id"]
    assert data["question"] == "What is the TAM?"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_create_query_empty_question(mock_supabase_query):
    """POST /api/v1/query with empty question should still work."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/query",
            json={"question": ""},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["query_id"] == QUERY_ROW["id"]


def test_websocket_stream_tokens():
    """WebSocket /api/v1/query/{id}/stream delivers tokens incrementally."""
    mock_client = MagicMock()

    # Track table calls to return appropriate data
    call_count = {"queries": 0}

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        for method in ("insert", "update", "delete", "select", "eq", "order", "single"):
            getattr(chain, method).return_value = chain

        if name == "queries":
            call_count["queries"] += 1
            # First call: select query (returns pending query)
            # Subsequent calls: updates
            chain.execute.return_value = MagicMock(data=QUERY_ROW)
        else:
            chain.execute.return_value = MagicMock(data=[], count=0)
        return chain

    mock_client.table = MagicMock(side_effect=_table)

    async def mock_run_pipeline(question: str, query_id: str, send_message) -> tuple[str, list[Citation]]:
        """Simulate the query pipeline sending messages."""
        await send_message({"type": "status", "status": "retrieving"})
        await send_message({"type": "status", "status": "generating"})
        await send_message({"type": "token", "content": "The "})
        await send_message({"type": "token", "content": "answer "})
        await send_message({"type": "token", "content": "is 42."})
        await send_message({"type": "citations", "citations": [c.model_dump() for c in SAMPLE_CITATIONS]})
        return ("The answer is 42.", SAMPLE_CITATIONS)

    from starlette.testclient import TestClient

    with (
        patch("app.api.v1.query.get_service_client", return_value=mock_client),
        patch("app.api.v1.query.run_query_pipeline", side_effect=mock_run_pipeline),
    ):
        client = TestClient(app)
        with client.websocket_connect(f"/api/v1/query/{QUERY_ROW['id']}/stream") as ws:
            # 1. Retrieving status
            msg = ws.receive_json()
            assert msg["type"] == "status"
            assert msg["status"] == "retrieving"

            # 2. Generating status
            msg = ws.receive_json()
            assert msg["type"] == "status"
            assert msg["status"] == "generating"

            # 3. Token messages
            msg = ws.receive_json()
            assert msg["type"] == "token"
            assert msg["content"] == "The "

            msg = ws.receive_json()
            assert msg["type"] == "token"
            assert msg["content"] == "answer "

            msg = ws.receive_json()
            assert msg["type"] == "token"
            assert msg["content"] == "is 42."

            # 4. Citations
            msg = ws.receive_json()
            assert msg["type"] == "citations"
            assert len(msg["citations"]) == 1
            assert msg["citations"][0]["document_title"] == "Pitch Deck"

            # 5. Done
            msg = ws.receive_json()
            assert msg["type"] == "done"
            assert msg["query_id"] == QUERY_ROW["id"]


def test_websocket_query_not_found():
    """WebSocket connection to non-existent query returns error."""
    mock_client = MagicMock()

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        for method in ("select", "eq", "single"):
            getattr(chain, method).return_value = chain
        # Simulate not found by raising exception
        chain.execute.side_effect = Exception("No rows found")
        return chain

    mock_client.table = MagicMock(side_effect=_table)

    from starlette.testclient import TestClient

    with patch("app.api.v1.query.get_service_client", return_value=mock_client):
        client = TestClient(app)
        with client.websocket_connect("/api/v1/query/nonexistent-uuid/stream") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert "not found" in msg["message"].lower()


def test_websocket_query_already_complete():
    """WebSocket connection to completed query returns error."""
    complete_row = {**QUERY_ROW, "status": "complete"}
    mock_client = MagicMock()

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        for method in ("select", "eq", "single"):
            getattr(chain, method).return_value = chain
        chain.execute.return_value = MagicMock(data=complete_row)
        return chain

    mock_client.table = MagicMock(side_effect=_table)

    from starlette.testclient import TestClient

    with patch("app.api.v1.query.get_service_client", return_value=mock_client):
        client = TestClient(app)
        with client.websocket_connect(f"/api/v1/query/{QUERY_ROW['id']}/stream") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert "already" in msg["message"].lower()
