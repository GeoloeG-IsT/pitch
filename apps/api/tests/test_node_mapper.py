"""Tests for node_to_chunk_record mapper."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.services.node_mapper import node_to_chunk_record

EMBEDDING_DIM = 1536
ZERO_EMBEDDING = [0.0] * EMBEDDING_DIM
DOC_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def _make_node(
    text: str = "Sample chunk content for testing.",
    metadata: dict | None = None,
    embedding: list[float] | None = None,
) -> MagicMock:
    """Create a mock LlamaIndex BaseNode."""
    node = MagicMock()
    node.get_content.return_value = text
    node.metadata = metadata or {}
    node.embedding = embedding
    return node


class TestNodeToChunkRecord:
    def test_pdf_node_with_page_label(self):
        """PDF node with page_label -> page_number=3, section_number=3, chunk_type='text'."""
        node = _make_node(
            text="Slide 3 content about market opportunity.",
            metadata={"page_label": "3", "file_path": "/tmp/deck.pdf", "file_name": "deck.pdf"},
            embedding=ZERO_EMBEDDING,
        )
        result = node_to_chunk_record(node, DOC_ID)

        assert result["document_id"] == DOC_ID
        assert result["page_number"] == 3
        assert result["section_number"] == 3
        assert result["chunk_type"] == "text"
        assert result["content"] == "Slide 3 content about market opportunity."
        assert result["token_count"] > 0

    def test_markdown_heading_node(self):
        """Markdown node with header_path -> chunk_type='heading'."""
        node = _make_node(
            text="This section covers the competitive landscape.",
            metadata={"header_path": "Market Opportunity/Competitive Landscape"},
            embedding=ZERO_EMBEDDING,
        )
        result = node_to_chunk_record(node, DOC_ID)

        assert result["chunk_type"] == "heading"

    def test_node_with_embedding(self):
        """Node with embedding -> dict contains list of 1536 floats."""
        node = _make_node(embedding=ZERO_EMBEDDING)
        result = node_to_chunk_record(node, DOC_ID)

        assert result["embedding"] is not None
        assert len(result["embedding"]) == EMBEDDING_DIM
        assert all(isinstance(v, float) for v in result["embedding"])

    def test_pdf_node_with_source_key(self):
        """Newer PyMuPDFReader uses 'source' instead of 'page_label'."""
        node = _make_node(
            text="Slide 5 content.",
            metadata={"source": "5", "file_path": "/tmp/deck.pdf", "total_pages": 13},
            embedding=ZERO_EMBEDDING,
        )
        result = node_to_chunk_record(node, DOC_ID)

        assert result["page_number"] == 5
        assert result["section_number"] == 5
        assert "source" not in result["metadata"]
        assert "total_pages" not in result["metadata"]

    def test_strips_internal_metadata_keys(self):
        """Output metadata should NOT contain file_path, file_name, page_label, source, total_pages."""
        node = _make_node(
            metadata={
                "page_label": "1",
                "file_path": "/tmp/deck.pdf",
                "file_name": "deck.pdf",
                "custom_key": "keep_me",
            },
            embedding=ZERO_EMBEDDING,
        )
        result = node_to_chunk_record(node, DOC_ID)

        assert "page_label" not in result["metadata"]
        assert "file_path" not in result["metadata"]
        assert "file_name" not in result["metadata"]
        assert result["metadata"]["custom_key"] == "keep_me"
