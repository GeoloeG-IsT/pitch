"""Tests for PDF, Markdown, and Excel parsers, and pipeline dispatcher."""

from __future__ import annotations

import pytest

EMBEDDING_DIM = 1536


@pytest.mark.asyncio
async def test_pdf_pipeline_returns_embedded_nodes(sample_pdf_bytes, mock_openai_embedding):
    """run_pdf_pipeline with demo PDF -> list of nodes, each with 1536-dim embedding."""
    from app.services.parsers.pdf_pipeline import run_pdf_pipeline

    nodes = await run_pdf_pipeline(sample_pdf_bytes)

    assert len(nodes) > 0, "PDF pipeline should return at least one node"
    for node in nodes:
        assert node.embedding is not None, "Each node must have an embedding"
        assert len(node.embedding) == EMBEDDING_DIM
        # PyMuPDFReader uses "source" (page number) in current versions
        assert "source" in node.metadata or "page_label" in node.metadata


@pytest.mark.asyncio
async def test_markdown_pipeline_returns_embedded_nodes(sample_markdown_text, mock_openai_embedding):
    """run_markdown_pipeline with sample text -> nodes with embeddings, at least one per heading."""
    from app.services.parsers.markdown_pipeline import run_markdown_pipeline

    nodes = await run_markdown_pipeline(sample_markdown_text)

    assert len(nodes) > 0, "Markdown pipeline should return at least one node"
    for node in nodes:
        assert node.embedding is not None, "Each node must have an embedding"
        assert len(node.embedding) == EMBEDDING_DIM


@pytest.mark.asyncio
async def test_excel_parser_returns_chunk_dicts(
    sample_excel_bytes, mock_openai_embedding, mock_openai_chat
):
    """parse_excel with demo xlsx -> list of chunk dicts with table type and LLM summary."""
    from app.services.parsers.excel_parser import parse_excel

    chunks = await parse_excel(sample_excel_bytes)

    assert len(chunks) > 0, "Excel parser should return at least one chunk"
    for chunk in chunks:
        assert chunk["chunk_type"] == "table"
        assert isinstance(chunk["content"], str)
        assert len(chunk["content"]) > 0
        assert "sheet_name" in chunk["metadata"]
        assert "raw_data" in chunk["metadata"]
        assert isinstance(chunk["embedding"], list)
        assert len(chunk["embedding"]) == EMBEDDING_DIM


@pytest.mark.asyncio
async def test_process_file_dispatches_pdf(sample_pdf_bytes, mock_openai_embedding):
    """process_file with file_type='pdf' dispatches to run_pdf_pipeline."""
    from app.services.pipeline import process_file

    doc_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    chunks = await process_file(sample_pdf_bytes, "pdf", doc_id)

    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk["document_id"] == doc_id
        assert "content" in chunk
        assert "embedding" in chunk


@pytest.mark.asyncio
async def test_process_file_dispatches_md(sample_markdown_text, mock_openai_embedding):
    """process_file with file_type='md' dispatches to run_markdown_pipeline."""
    from app.services.pipeline import process_file

    doc_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    chunks = await process_file(sample_markdown_text.encode("utf-8"), "md", doc_id)

    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk["document_id"] == doc_id


@pytest.mark.asyncio
async def test_process_file_dispatches_xlsx(
    sample_excel_bytes, mock_openai_embedding, mock_openai_chat
):
    """process_file with file_type='xlsx' dispatches to parse_excel."""
    from app.services.pipeline import process_file

    doc_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    chunks = await process_file(sample_excel_bytes, "xlsx", doc_id)

    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk["document_id"] == doc_id
        assert chunk["chunk_type"] == "table"
