"""Map LlamaIndex BaseNode objects to the chunks table schema."""

from __future__ import annotations

import tiktoken
from llama_index.core.schema import BaseNode

_encoding = tiktoken.encoding_for_model("text-embedding-3-small")

# Metadata keys that become first-class columns and should not appear in
# the output metadata JSONB.
_STRIP_KEYS = frozenset({"page_label", "source", "file_path", "file_name", "chunk_type", "total_pages"})


def node_to_chunk_record(node: BaseNode, document_id: str) -> dict:
    """Convert a LlamaIndex node into a dict matching the chunks table schema.

    Returns a dict with keys: document_id, content, embedding, section_number,
    page_number, chunk_type, metadata, token_count.
    """
    metadata = node.metadata or {}
    text = node.get_content()

    # Extract page_number from PyMuPDFReader metadata.
    # Newer versions use "source" (1-based page string); older used "page_label".
    page_number: int | None = None
    raw_page = metadata.get("page_label") or metadata.get("source")
    if raw_page is not None:
        page_number = int(raw_page)

    # Determine chunk_type
    chunk_type = "text"
    if metadata.get("header_path") or metadata.get("heading"):
        chunk_type = "heading"
    elif "|" in text and "---" in text:
        # Heuristic: markdown table syntax
        chunk_type = "table"

    # Token count
    token_count = len(_encoding.encode(text))

    # Filter internal keys from output metadata
    filtered_metadata = {
        k: v for k, v in metadata.items() if k not in _STRIP_KEYS
    }

    return {
        "document_id": document_id,
        "content": text,
        "embedding": node.embedding,
        "section_number": metadata.get("section_number", page_number),
        "page_number": page_number,
        "chunk_type": chunk_type,
        "metadata": filtered_metadata,
        "token_count": token_count,
    }
