"""Pipeline factory and dispatch by file type."""

from __future__ import annotations

from app.services.node_mapper import node_to_chunk_record
from app.services.parsers.excel_parser import parse_excel
from app.services.parsers.markdown_pipeline import run_markdown_pipeline
from app.services.parsers.pdf_pipeline import run_pdf_pipeline


async def process_file(
    file_bytes: bytes, file_type: str, document_id: str
) -> list[dict]:
    """Route a file to the appropriate parser and return chunk dicts.

    Args:
        file_bytes: Raw file content.
        file_type: One of "pdf", "xlsx", "md", "txt".
        document_id: UUID of the parent document record.

    Returns:
        List of dicts matching the chunks table schema.

    Raises:
        ValueError: If file_type is not supported.
    """
    if file_type == "xlsx":
        chunks = await parse_excel(file_bytes)
        for chunk in chunks:
            chunk["document_id"] = document_id
        return chunks

    if file_type == "pdf":
        nodes = await run_pdf_pipeline(file_bytes)
        return [node_to_chunk_record(node, document_id) for node in nodes]

    if file_type in ("md", "txt"):
        text = file_bytes.decode("utf-8")
        nodes = await run_markdown_pipeline(text)
        return [node_to_chunk_record(node, document_id) for node in nodes]

    raise ValueError(f"Unsupported file type: {file_type!r}")
