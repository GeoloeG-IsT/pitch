"""Pydantic models for RAG query pipeline."""

from __future__ import annotations

from pydantic import BaseModel


class Citation(BaseModel):
    document_id: str
    document_title: str
    section_number: int | None
    section_label: str | None  # heading text if available, else "Section {n}"
    chunk_id: str
    relevance_score: float


class QueryCreate(BaseModel):
    question: str


class QueryResponse(BaseModel):
    query_id: str
    question: str
    answer: str | None = None
    citations: list[Citation] = []
    status: str = "pending"
    created_at: str | None = None
