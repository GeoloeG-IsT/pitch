"""Pydantic models for RAG query pipeline."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator


class Citation(BaseModel):
    document_id: str
    document_title: str
    section_number: int | None
    section_label: str | None  # heading text if available, else "Section {n}"
    chunk_id: str
    relevance_score: float


class QueryCreate(BaseModel):
    question: str
    share_token_id: str | None = None


class QueryResponse(BaseModel):
    query_id: str
    question: str
    answer: str | None = None
    citations: list[Citation] = []
    status: str = "pending"
    created_at: str | None = None
    confidence_score: float | None = None
    confidence_tier: str | None = None
    review_status: str = "auto_published"
    founder_answer: str | None = None


class ReviewAction(BaseModel):
    action: Literal["approve", "edit", "reject", "dismiss", "override"]
    edited_answer: str | None = None

    @model_validator(mode="after")
    def require_edited_answer(self) -> ReviewAction:
        if self.action in ("edit", "reject", "override") and not self.edited_answer:
            raise ValueError(
                f"edited_answer is required when action is '{self.action}'"
            )
        return self


class ReviewItem(BaseModel):
    query_id: str
    question: str
    answer: str | None = None
    citations: list[Citation] = []
    confidence_score: float | None = None
    confidence_tier: str | None = None
    review_status: str = "pending_review"
    founder_answer: str | None = None
    created_at: str | None = None
    section_context: str | None = None
