"""Pitch viewer API: returns all ready documents with grouped, ordered chunks."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.supabase import get_service_client
from app.models.pitch import PitchChunk, PitchDocument, PitchResponse

router = APIRouter(tags=["pitch"])


@router.get("/pitch")
async def get_pitch() -> PitchResponse:
    """Return all ready documents with their chunks ordered by section_number."""
    client = get_service_client()

    # Fetch only documents that have finished processing successfully
    doc_result = (
        client.table("documents")
        .select("id, title, file_type")
        .eq("status", "ready")
        .eq("purpose", "pitch")
        .order("created_at")
        .execute()
    )

    documents: list[PitchDocument] = []
    total_chunks = 0

    for row in doc_result.data:
        # Fetch chunks for this document, ordered by section_number ascending
        chunk_result = (
            client.table("chunks")
            .select("id, content, section_number, chunk_type, metadata")
            .eq("document_id", row["id"])
            .order("section_number")
            .execute()
        )

        chunks = [
            PitchChunk(
                id=c["id"],
                content=c["content"],
                section_number=c.get("section_number"),
                chunk_type=c.get("chunk_type", "text"),
                metadata=c.get("metadata") or {},
            )
            for c in chunk_result.data
        ]

        documents.append(
            PitchDocument(
                id=row["id"],
                title=row["title"],
                file_type=row["file_type"],
                chunks=chunks,
            )
        )
        total_chunks += len(chunks)

    return PitchResponse(documents=documents, total_chunks=total_chunks)
