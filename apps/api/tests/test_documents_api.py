"""Integration tests for the document management API endpoints."""

from __future__ import annotations

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

DOC_ROW = {
    "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "user_id": "00000000-0000-0000-0000-000000000000",
    "title": "test",
    "file_name": "test.txt",
    "file_type": "txt",
    "file_size_bytes": 12,
    "status": "pending",
    "metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}


def _make_mock_client(doc_rows: list[dict] | None = None) -> MagicMock:
    """Create a mock Supabase client with chainable operations."""
    client = MagicMock()
    rows = doc_rows if doc_rows is not None else [DOC_ROW]

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        chain._table_name = name

        # Make every method return the chain for fluent chaining
        for method in ("insert", "update", "delete", "select", "eq", "order", "single"):
            getattr(chain, method).return_value = chain

        # Default execute returns data
        if name == "documents":
            chain.execute.return_value = MagicMock(data=rows, count=len(rows))
        elif name == "chunks":
            chain.execute.return_value = MagicMock(data=[], count=0)
        else:
            chain.execute.return_value = MagicMock(data=[], count=0)

        return chain

    client.table = MagicMock(side_effect=_table)
    return client


@pytest.fixture
def mock_supabase():
    """Patch get_service_client to return a mock."""
    with patch("app.api.v1.documents.get_service_client") as mock_get:
        mock_client = _make_mock_client()
        mock_get.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_supabase_empty():
    """Patch get_service_client to return a mock with no documents."""
    with patch("app.api.v1.documents.get_service_client") as mock_get:
        mock_client = _make_mock_client(doc_rows=[])
        mock_get.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_process_document():
    """Patch process_document to be a no-op."""
    with patch("app.api.v1.documents.process_document", new_callable=AsyncMock) as mock_pd:
        yield mock_pd


@pytest.fixture
def mock_delete_chunks():
    """Patch delete_document_chunks to be a no-op."""
    with patch("app.api.v1.documents.delete_document_chunks", new_callable=AsyncMock) as mock_dc:
        yield mock_dc


@pytest.mark.asyncio
async def test_upload_document(mock_supabase, mock_process_document):
    """POST /api/v1/documents returns 201 with document record."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/documents",
            files={"file": ("test.txt", b"hello world!", "text/plain")},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == DOC_ROW["id"]
    assert data["status"] == "pending"
    assert data["file_name"] == "test.txt"


@pytest.mark.asyncio
async def test_list_documents(mock_supabase):
    """GET /api/v1/documents returns a list with total count."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/documents")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["documents"]) == 1
    assert data["documents"][0]["id"] == DOC_ROW["id"]


@pytest.mark.asyncio
async def test_get_document():
    """GET /api/v1/documents/{id} returns a single document."""
    with patch("app.api.v1.documents.get_service_client") as mock_get:
        mock_client = MagicMock()

        call_count = 0

        def _table(name: str) -> MagicMock:
            nonlocal call_count
            call_count += 1
            chain = MagicMock()
            for method in ("select", "eq", "order", "single"):
                getattr(chain, method).return_value = chain

            if name == "documents":
                # .single() returns data as a dict (not a list)
                chain.execute.return_value = MagicMock(data=DOC_ROW)
            elif name == "chunks":
                chain.execute.return_value = MagicMock(data=[], count=0)
            return chain

        mock_client.table = MagicMock(side_effect=_table)
        mock_get.return_value = mock_client

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/v1/documents/{DOC_ROW['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == DOC_ROW["id"]


@pytest.mark.asyncio
async def test_get_document_not_found():
    """GET /api/v1/documents/{id} returns 404 for nonexistent document."""
    # Create a mock that raises on .single() to simulate not found
    with patch("app.api.v1.documents.get_service_client") as mock_get:
        mock_client = MagicMock()
        chain = MagicMock()
        for method in ("select", "eq", "single"):
            getattr(chain, method).return_value = chain
        chain.execute.side_effect = Exception("No rows found")
        mock_client.table.return_value = chain
        mock_get.return_value = mock_client

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/documents/nonexistent-uuid")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_document(mock_supabase):
    """DELETE /api/v1/documents/{id} returns 204."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.delete(f"/api/v1/documents/{DOC_ROW['id']}")

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_document_not_found(mock_supabase_empty):
    """DELETE /api/v1/documents/{id} returns 404 if not found."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.delete("/api/v1/documents/nonexistent-uuid")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_reupload_document(mock_supabase, mock_process_document, mock_delete_chunks):
    """PUT /api/v1/documents/{id} resets status to pending."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.put(
            f"/api/v1/documents/{DOC_ROW['id']}",
            files={"file": ("updated.txt", b"new content", "text/plain")},
        )

    assert response.status_code == 200
    mock_delete_chunks.assert_awaited_once_with(DOC_ROW["id"])


@pytest.mark.asyncio
async def test_upload_unsupported_type(mock_supabase, mock_process_document):
    """POST /api/v1/documents with unsupported file type returns 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/documents",
            files={"file": ("photo.jpg", b"fake-image-data", "image/jpeg")},
        )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]
