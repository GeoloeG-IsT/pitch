"""Tests for the RAG retrieval pipeline."""

from __future__ import annotations

import copy

import pytest

from tests.conftest import SAMPLE_CHUNKS, ZERO_EMBEDDING


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_query_embedding(mock_async_openai_embedding):
    from app.services.retrieval import get_query_embedding

    result = await get_query_embedding("What is the revenue?")
    assert isinstance(result, list)
    assert len(result) == 1536
    assert all(isinstance(v, float) for v in result)


# ---------------------------------------------------------------------------
# Vector retrieval
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_retrieve_chunks(mock_supabase_rpc):
    from app.services.retrieval import retrieve_chunks

    embedding = ZERO_EMBEDDING
    chunks = await retrieve_chunks(embedding, match_count=20)
    assert len(chunks) == 3
    mock_supabase_rpc.rpc.assert_called_once_with(
        "match_chunks",
        {"query_embedding": embedding, "match_threshold": 0.0, "match_count": 20},
    )


# ---------------------------------------------------------------------------
# Cohere reranking
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rerank_with_cohere(mock_cohere_rerank):
    from app.services.retrieval import rerank_chunks

    chunks = copy.deepcopy(SAMPLE_CHUNKS)

    # Patch settings to have a cohere key
    from unittest.mock import patch

    with patch("app.services.retrieval.settings") as mock_settings:
        mock_settings.cohere_api_key = "test-key"
        result = await rerank_chunks(chunks, "What is the revenue?", top_n=10)

    # Cohere reorders: index 2 first (0.95), index 0 second (0.80), index 1 third (0.30)
    assert len(result) == 3
    # First result should be original chunk at index 2 (chunk-ccc)
    assert result[0]["id"] == "chunk-ccc"
    assert result[0]["relevance_score"] == 0.95
    # Second result should be original chunk at index 0 (chunk-aaa)
    assert result[1]["id"] == "chunk-aaa"
    assert result[1]["relevance_score"] == 0.80


@pytest.mark.asyncio
async def test_rerank_without_cohere_key():
    from app.services.retrieval import rerank_chunks

    chunks = copy.deepcopy(SAMPLE_CHUNKS)

    from unittest.mock import patch

    with patch("app.services.retrieval.settings") as mock_settings:
        mock_settings.cohere_api_key = ""
        result = await rerank_chunks(chunks, "What is the revenue?", top_n=2)

    # Graceful degradation: returns first top_n chunks in original order
    assert len(result) == 2
    assert result[0]["id"] == "chunk-aaa"
    assert result[1]["id"] == "chunk-bbb"


# ---------------------------------------------------------------------------
# Metadata boosting
# ---------------------------------------------------------------------------


def test_metadata_boost_financial():
    from app.services.retrieval import apply_metadata_boost

    chunks = copy.deepcopy(SAMPLE_CHUNKS)
    result = apply_metadata_boost(chunks, "What is the revenue?")

    # Table chunk (chunk-bbb) should be boosted and appear higher
    # Original order: chunk-aaa (0.85), chunk-bbb (0.80 table), chunk-ccc (0.70)
    # After boost: chunk-aaa (0.85), chunk-bbb (0.80*1.5=1.20), chunk-ccc (0.70)
    # Sorted: chunk-bbb (1.20), chunk-aaa (0.85), chunk-ccc (0.70)
    assert result[0]["id"] == "chunk-bbb"
    assert result[0]["chunk_type"] == "table"


def test_metadata_boost_no_boost():
    from app.services.retrieval import apply_metadata_boost

    chunks = copy.deepcopy(SAMPLE_CHUNKS)
    result = apply_metadata_boost(chunks, "What is the team background?")

    # No financial keywords, table chunk should NOT be boosted
    # Order stays: chunk-aaa (0.85), chunk-bbb (0.80), chunk-ccc (0.70)
    assert result[0]["id"] == "chunk-aaa"
    assert result[1]["id"] == "chunk-bbb"


# ---------------------------------------------------------------------------
# Context prompt building
# ---------------------------------------------------------------------------


def test_build_context_prompt_token_budget():
    from app.services.query_engine import build_context_prompt

    # Create chunks that exceed budget
    large_chunks = []
    for i in range(15):
        large_chunks.append(
            {
                "id": f"chunk-{i}",
                "document_id": "doc-111",
                "content": f"This is chunk number {i} with some content. " * 50,
                "section_number": i + 1,
                "page_number": i + 1,
                "chunk_type": "text",
                "metadata": {},
                "token_count": 600,  # 15 * 600 = 9000 > 6000 budget
                "similarity": 0.9 - i * 0.01,
            }
        )
    doc_titles = {"doc-111": "Pitch Deck"}
    result = build_context_prompt(large_chunks, doc_titles)

    # Should have included only 10 chunks (6000/600 = 10)
    assert result.count("[Pitch Deck, Section") == 10


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_retrieve_and_rerank_max_10(
    mock_async_openai_embedding, mock_supabase_rpc
):
    from app.services.retrieval import retrieve_and_rerank

    # With no cohere key, graceful degradation returns top_n (10) but we only
    # have 3 sample chunks, so we get 3
    from unittest.mock import patch

    with patch("app.services.retrieval.settings") as mock_settings:
        mock_settings.cohere_api_key = ""
        mock_settings.openai_api_key = "test-key"
        result = await retrieve_and_rerank("What is the revenue?")

    assert len(result) <= 10
    assert len(result) == 3  # We only have 3 sample chunks
