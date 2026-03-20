"""Pydantic models for analytics event ingestion and aggregation."""

from __future__ import annotations

from pydantic import BaseModel


class SectionTimeEvent(BaseModel):
    section_id: str
    duration_ms: int


class BeaconPayload(BaseModel):
    session_id: str
    user_id: str | None = None
    share_token_id: str | None = None
    founder_id: str
    events: list[SectionTimeEvent]
    scroll_depth: int | None = None
    session_start: int  # Unix timestamp ms
    session_end: int  # Unix timestamp ms


class InvestorSummary(BaseModel):
    investor_key: str  # user_id or share_token_id
    investor_label: str  # email or "Anonymous (...last4)"
    last_viewed: str | None = None
    total_time_ms: int = 0
    question_count: int = 0
    session_count: int = 0
    max_scroll_depth: int = 0
    financials_time_ms: int = 0
    engagement: str = "viewed"  # "hot" | "active" | "viewed"


class SectionTime(BaseModel):
    section_id: str
    duration_ms: int


class QuestionEntry(BaseModel):
    question: str
    created_at: str


class InvestorDetail(BaseModel):
    investor_key: str
    sections: list[SectionTime]
    questions: list[QuestionEntry]


class AnalyticsSummaryResponse(BaseModel):
    investors: list[InvestorSummary]


class NewViewCountResponse(BaseModel):
    count: int
