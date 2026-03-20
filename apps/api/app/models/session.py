"""Pydantic models for live pitch session API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator


class SessionResponse(BaseModel):
    session_id: str
    founder_id: str
    started_at: str
    ended_at: str | None = None
    is_active: bool = True


class LiveQuestionEvent(BaseModel):
    query_id: str
    question: str
    investor_label: str
    ai_draft: str | None = None
    citations: list = []
    created_at: str | None = None


class SessionAction(BaseModel):
    action: Literal["approve", "edit", "override", "dismiss"]
    edited_answer: str | None = None

    @model_validator(mode="after")
    def require_edited_answer(self) -> SessionAction:
        if self.action in ("edit", "override") and not self.edited_answer:
            raise ValueError(
                f"edited_answer is required when action is '{self.action}'"
            )
        return self
