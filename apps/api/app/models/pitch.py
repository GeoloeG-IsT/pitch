"""Pydantic models for the pitch viewer API response."""

from typing import Literal

from pydantic import BaseModel


class PitchChunk(BaseModel):
    id: str
    content: str
    section_number: int | None
    chunk_type: Literal["text", "table", "heading", "image_caption"]
    metadata: dict = {}


class PitchDocument(BaseModel):
    id: str
    title: str
    file_type: str
    chunks: list[PitchChunk]


class PitchResponse(BaseModel):
    documents: list[PitchDocument]
    total_chunks: int
