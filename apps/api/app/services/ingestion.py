"""Ingestion orchestrator: process documents via LlamaIndex pipeline and store chunks."""

from __future__ import annotations

import logging

from app.core.supabase import get_service_client
from app.services.pipeline import process_file

logger = logging.getLogger(__name__)


async def process_document(doc_id: str, file_bytes: bytes, file_type: str) -> None:
    """Run the full ingestion pipeline for a document.

    Transitions the document through pending -> processing -> ready (or error).
    Calls the parsing pipeline, then batch-inserts the resulting chunks into
    Supabase.
    """
    client = get_service_client()

    # Mark as processing
    client.table("documents").update({"status": "processing"}).eq("id", doc_id).execute()

    try:
        chunks = await process_file(file_bytes, file_type, doc_id)

        # Batch insert chunks (groups of 50 to avoid payload limits)
        batch_size = 50
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            client.table("chunks").insert(batch).execute()

        # Mark as ready with chunk count metadata
        client.table("documents").update(
            {"status": "ready", "metadata": {"chunk_count": len(chunks)}}
        ).eq("id", doc_id).execute()

    except Exception as e:
        logger.exception(f"Failed to process document {doc_id}")
        client.table("documents").update(
            {"status": "error", "metadata": {"error": str(e)}}
        ).eq("id", doc_id).execute()


async def delete_document_chunks(doc_id: str) -> None:
    """Delete all chunks belonging to a document."""
    client = get_service_client()
    client.table("chunks").delete().eq("document_id", doc_id).execute()
