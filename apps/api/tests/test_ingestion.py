"""Tests for the ingestion orchestrator service."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services.ingestion import delete_document_chunks, process_document


def _make_chainable_mock() -> MagicMock:
    """Create a mock Supabase client with chainable table operations."""
    client = MagicMock()

    # Each call to .table() returns a fresh chain so we can track
    # different operations (update vs insert vs delete) independently.
    table_chains: list[MagicMock] = []

    def _table(name: str) -> MagicMock:
        chain = MagicMock()
        chain._table_name = name
        # Make every method return the chain itself for fluent chaining
        chain.insert.return_value = chain
        chain.update.return_value = chain
        chain.delete.return_value = chain
        chain.eq.return_value = chain
        chain.execute.return_value = MagicMock(data=[])
        table_chains.append(chain)
        return chain

    client.table = MagicMock(side_effect=_table)
    client._table_chains = table_chains
    return client


SAMPLE_CHUNKS = [
    {
        "document_id": "doc-1",
        "content": f"Chunk {i}",
        "embedding": [0.0] * 1536,
        "section_number": i,
        "page_number": i,
        "chunk_type": "text",
        "metadata": {},
        "token_count": 10,
    }
    for i in range(3)
]


@pytest.mark.asyncio
@patch("app.services.ingestion.get_service_client")
@patch("app.services.ingestion.process_file")
async def test_process_document_success(mock_process_file, mock_get_client):
    """Successful ingestion transitions pending -> processing -> ready."""
    mock_client = _make_chainable_mock()
    mock_get_client.return_value = mock_client
    mock_process_file.return_value = SAMPLE_CHUNKS

    await process_document("doc-1", b"fake-bytes", "pdf")

    # Should have called table() 3 times: processing update, chunks insert, ready update
    assert mock_client.table.call_count == 3

    chains = mock_client._table_chains

    # First call: update status to processing
    assert chains[0]._table_name == "documents"
    chains[0].update.assert_called_once_with({"status": "processing"})

    # Second call: insert chunks
    assert chains[1]._table_name == "chunks"
    chains[1].insert.assert_called_once_with(SAMPLE_CHUNKS)

    # Third call: update status to ready with chunk count
    assert chains[2]._table_name == "documents"
    chains[2].update.assert_called_once_with(
        {"status": "ready", "metadata": {"chunk_count": 3}}
    )


@pytest.mark.asyncio
@patch("app.services.ingestion.get_service_client")
@patch("app.services.ingestion.process_file")
async def test_process_document_error(mock_process_file, mock_get_client):
    """Pipeline failure transitions to error status."""
    mock_client = _make_chainable_mock()
    mock_get_client.return_value = mock_client
    mock_process_file.side_effect = ValueError("bad file")

    await process_document("doc-1", b"fake-bytes", "pdf")

    chains = mock_client._table_chains

    # First call: update status to processing
    assert chains[0]._table_name == "documents"
    chains[0].update.assert_called_once_with({"status": "processing"})

    # Second call: update status to error with error message
    assert chains[1]._table_name == "documents"
    chains[1].update.assert_called_once_with(
        {"status": "error", "metadata": {"error": "bad file"}}
    )


@pytest.mark.asyncio
@patch("app.services.ingestion.get_service_client")
async def test_delete_document_chunks(mock_get_client):
    """delete_document_chunks calls Supabase delete with correct filter."""
    mock_client = _make_chainable_mock()
    mock_get_client.return_value = mock_client

    await delete_document_chunks("doc-1")

    assert mock_client.table.call_count == 1
    chain = mock_client._table_chains[0]
    assert chain._table_name == "chunks"
    chain.delete.assert_called_once()
    chain.eq.assert_called_once_with("document_id", "doc-1")
