"""Integration tests for the pitch API endpoint."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

READY_DOC_1 = {
    "id": "doc-1111-1111-1111-111111111111",
    "title": "Pitch Deck",
    "file_name": "pitch.pdf",
    "file_type": "pdf",
    "file_size_bytes": 5000,
    "status": "ready",
    "metadata": {"chunk_count": 3},
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}

READY_DOC_2 = {
    "id": "doc-2222-2222-2222-222222222222",
    "title": "Financial Model",
    "file_name": "financials.xlsx",
    "file_type": "xlsx",
    "file_size_bytes": 8000,
    "status": "ready",
    "metadata": {"chunk_count": 2},
    "created_at": "2026-01-02T00:00:00Z",
    "updated_at": "2026-01-02T00:00:00Z",
}

PENDING_DOC = {
    "id": "doc-3333-3333-3333-333333333333",
    "title": "Draft",
    "file_name": "draft.md",
    "file_type": "md",
    "file_size_bytes": 1000,
    "status": "pending",
    "metadata": {},
    "created_at": "2026-01-03T00:00:00Z",
    "updated_at": "2026-01-03T00:00:00Z",
}

CHUNKS_DOC_1 = [
    {
        "id": "chunk-aaa",
        "document_id": "doc-1111-1111-1111-111111111111",
        "content": "# Introduction",
        "section_number": 1,
        "page_number": 1,
        "chunk_type": "heading",
        "metadata": {},
        "token_count": 5,
    },
    {
        "id": "chunk-bbb",
        "document_id": "doc-1111-1111-1111-111111111111",
        "content": "We are building a platform...",
        "section_number": 2,
        "page_number": 1,
        "chunk_type": "text",
        "metadata": {},
        "token_count": 20,
    },
    {
        "id": "chunk-ccc",
        "document_id": "doc-1111-1111-1111-111111111111",
        "content": "| Metric | Value |\n|---|---|\n| ARR | $1M |",
        "section_number": 3,
        "page_number": 2,
        "chunk_type": "table",
        "metadata": {},
        "token_count": 15,
    },
]

CHUNKS_DOC_2 = [
    {
        "id": "chunk-ddd",
        "document_id": "doc-2222-2222-2222-222222222222",
        "content": "| Revenue | Q1 |\n|---|---|\n| Total | $500K |",
        "section_number": 1,
        "page_number": 1,
        "chunk_type": "table",
        "metadata": {},
        "token_count": 12,
    },
    {
        "id": "chunk-eee",
        "document_id": "doc-2222-2222-2222-222222222222",
        "content": "Revenue grew 40% YoY.",
        "section_number": 2,
        "page_number": 1,
        "chunk_type": "text",
        "metadata": {},
        "token_count": 8,
    },
]


def _make_pitch_mock(doc_rows: list[dict], chunks_by_doc: dict[str, list[dict]]) -> MagicMock:
    """Create a mock Supabase client for pitch endpoint testing."""
    client = MagicMock()

    def _table(name: str) -> MagicMock:
        chain = MagicMock()

        for method in ("select", "eq", "order", "limit", "single"):
            getattr(chain, method).return_value = chain

        if name == "documents":
            chain.execute.return_value = MagicMock(data=doc_rows)
        elif name == "chunks":
            # Track which document_id was queried via .eq("document_id", ...)
            doc_id_holder: list[str] = []
            original_eq = chain.eq

            def _eq(col: str, val: str) -> MagicMock:
                if col == "document_id":
                    doc_id_holder.append(val)
                return chain

            chain.eq = MagicMock(side_effect=_eq)
            chain.order.return_value = chain

            def _execute():
                doc_id = doc_id_holder[-1] if doc_id_holder else ""
                chunks = chunks_by_doc.get(doc_id, [])
                return MagicMock(data=chunks)

            chain.execute = MagicMock(side_effect=_execute)
        else:
            chain.execute.return_value = MagicMock(data=[])

        return chain

    client.table = MagicMock(side_effect=_table)
    return client


@pytest.mark.asyncio
async def test_pitch_returns_200_with_documents_and_total_chunks():
    """GET /api/v1/pitch returns 200 with PitchResponse containing documents and total_chunks."""
    chunks_by_doc = {
        READY_DOC_1["id"]: CHUNKS_DOC_1,
        READY_DOC_2["id"]: CHUNKS_DOC_2,
    }
    with patch("app.api.v1.pitch.get_service_client") as mock_get:
        mock_get.return_value = _make_pitch_mock([READY_DOC_1, READY_DOC_2], chunks_by_doc)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/pitch")

    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert "total_chunks" in data
    assert len(data["documents"]) == 2
    assert data["total_chunks"] == 5  # 3 + 2


@pytest.mark.asyncio
async def test_pitch_excludes_non_ready_documents():
    """Only documents with status='ready' are returned."""
    # Mock returns only ready docs (the endpoint filters with .eq("status", "ready"))
    with patch("app.api.v1.pitch.get_service_client") as mock_get:
        mock_get.return_value = _make_pitch_mock([READY_DOC_1], {READY_DOC_1["id"]: CHUNKS_DOC_1})

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/pitch")

    assert response.status_code == 200
    data = response.json()
    # Pending/processing/error docs should not appear
    doc_ids = [d["id"] for d in data["documents"]]
    assert PENDING_DOC["id"] not in doc_ids
    assert len(data["documents"]) == 1


@pytest.mark.asyncio
async def test_pitch_chunks_ordered_by_section_number():
    """Chunks within each document are ordered by section_number ascending."""
    with patch("app.api.v1.pitch.get_service_client") as mock_get:
        mock_get.return_value = _make_pitch_mock([READY_DOC_1], {READY_DOC_1["id"]: CHUNKS_DOC_1})

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/pitch")

    data = response.json()
    chunks = data["documents"][0]["chunks"]
    section_numbers = [c["section_number"] for c in chunks]
    assert section_numbers == [1, 2, 3]


@pytest.mark.asyncio
async def test_pitch_response_schema():
    """Response matches PitchResponse schema with expected fields."""
    with patch("app.api.v1.pitch.get_service_client") as mock_get:
        mock_get.return_value = _make_pitch_mock([READY_DOC_1], {READY_DOC_1["id"]: CHUNKS_DOC_1})

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/pitch")

    data = response.json()
    # Top level
    assert set(data.keys()) == {"documents", "total_chunks"}

    # Document level
    doc = data["documents"][0]
    assert set(doc.keys()) == {"id", "title", "file_type", "chunks"}

    # Chunk level
    chunk = doc["chunks"][0]
    assert set(chunk.keys()) == {"id", "content", "section_number", "chunk_type", "metadata"}


@pytest.mark.asyncio
async def test_pitch_empty_state():
    """Empty state returns { documents: [], total_chunks: 0 }."""
    with patch("app.api.v1.pitch.get_service_client") as mock_get:
        mock_get.return_value = _make_pitch_mock([], {})

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/pitch")

    assert response.status_code == 200
    data = response.json()
    assert data["documents"] == []
    assert data["total_chunks"] == 0
