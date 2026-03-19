"""Document management API: upload, list, get, delete, and re-upload."""

from __future__ import annotations

import os

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from app.core.supabase import get_service_client
from app.models.document import DocumentListResponse, DocumentResponse
from app.services.ingestion import delete_document_chunks, process_document

router = APIRouter(tags=["documents"])

# TODO(Phase 6): Replace with authenticated user from request
DEMO_USER_ID = "00000000-0000-0000-0000-000000000000"

_SUPPORTED_EXTENSIONS: dict[str, str] = {
    ".pdf": "pdf",
    ".xlsx": "xlsx",
    ".md": "md",
    ".txt": "txt",
}


def _detect_file_type(filename: str) -> str:
    """Map a filename extension to a valid file_type value.

    Raises:
        HTTPException: If the file extension is not supported.
    """
    _, ext = os.path.splitext(filename.lower())
    file_type = _SUPPORTED_EXTENSIONS.get(ext)
    if file_type is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext!r}. Supported: {', '.join(sorted(_SUPPORTED_EXTENSIONS))}",
        )
    return file_type


def _row_to_response(row: dict, chunk_count: int | None = None) -> DocumentResponse:
    """Convert a Supabase row dict to a DocumentResponse."""
    return DocumentResponse(
        id=row["id"],
        title=row["title"],
        file_name=row["file_name"],
        file_type=row["file_type"],
        file_size_bytes=row.get("file_size_bytes"),
        status=row["status"],
        purpose=row.get("purpose", "pitch"),
        metadata=row.get("metadata") or {},
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        chunk_count=chunk_count,
    )


@router.post("/documents", status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None),
    purpose: str = Form("pitch"),
):
    """Upload a document for ingestion."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_type = _detect_file_type(file.filename)

    if purpose not in ("pitch", "rag"):
        raise HTTPException(status_code=400, detail="purpose must be 'pitch' or 'rag'")

    # MUST read bytes before background task -- UploadFile closes after endpoint returns
    file_bytes = await file.read()

    if title is None:
        title = os.path.splitext(file.filename)[0]

    client = get_service_client()

    # Check for existing document with the same filename — replace instead of duplicating
    existing = (
        client.table("documents")
        .select("id")
        .eq("user_id", DEMO_USER_ID)
        .eq("file_name", file.filename)
        .execute()
    )

    if existing.data:
        # Re-use existing document row: delete old chunks and re-ingest
        doc_id = existing.data[0]["id"]
        await delete_document_chunks(doc_id)
        result = (
            client.table("documents")
            .update(
                {
                    "title": title,
                    "file_type": file_type,
                    "file_size_bytes": len(file_bytes),
                    "status": "pending",
                    "purpose": purpose,
                    "metadata": {},
                }
            )
            .eq("id", doc_id)
            .execute()
        )
    else:
        result = (
            client.table("documents")
            .insert(
                {
                    "user_id": DEMO_USER_ID,
                    "title": title,
                    "file_name": file.filename,
                    "file_type": file_type,
                    "file_size_bytes": len(file_bytes),
                    "status": "pending",
                    "purpose": purpose,
                }
            )
            .execute()
        )

    doc = result.data[0]
    doc_id = doc["id"]

    background_tasks.add_task(process_document, doc_id, file_bytes, file_type)

    return _row_to_response(doc)


@router.get("/documents")
async def list_documents():
    """List all documents ordered by creation date."""
    client = get_service_client()
    result = (
        client.table("documents")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    documents = []
    for row in result.data:
        chunk_result = (
            client.table("chunks")
            .select("id", count="exact")
            .eq("document_id", row["id"])
            .execute()
        )
        chunk_count = chunk_result.count
        documents.append(_row_to_response(row, chunk_count=chunk_count))

    return DocumentListResponse(documents=documents, total=len(documents))


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """Get a single document by ID (supports polling for status)."""
    client = get_service_client()
    try:
        result = (
            client.table("documents")
            .select("*")
            .eq("id", doc_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")

    row = result.data
    chunk_result = (
        client.table("chunks")
        .select("id", count="exact")
        .eq("document_id", doc_id)
        .execute()
    )
    return _row_to_response(row, chunk_count=chunk_result.count)


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(doc_id: str):
    """Delete a document and all its chunks (FK CASCADE)."""
    client = get_service_client()

    # Verify document exists
    result = (
        client.table("documents")
        .select("id")
        .eq("id", doc_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    client.table("documents").delete().eq("id", doc_id).execute()
    return None


@router.put("/documents/{doc_id}")
async def reupload_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Replace a document's file and re-run ingestion."""
    client = get_service_client()

    # Verify document exists
    result = (
        client.table("documents")
        .select("*")
        .eq("id", doc_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_type = _detect_file_type(file.filename)
    file_bytes = await file.read()

    # Delete old chunks before re-processing
    await delete_document_chunks(doc_id)

    # Update document record
    update_result = (
        client.table("documents")
        .update(
            {
                "status": "pending",
                "file_name": file.filename,
                "file_size_bytes": len(file_bytes),
                "file_type": file_type,
            }
        )
        .eq("id", doc_id)
        .execute()
    )

    background_tasks.add_task(process_document, doc_id, file_bytes, file_type)

    return _row_to_response(update_result.data[0])
