from typing import Literal

from pydantic import BaseModel


class ChunkRecord(BaseModel):
    document_id: str
    content: str
    embedding: list[float]
    section_number: int | None
    page_number: int | None
    chunk_type: Literal["text", "table", "heading", "image_caption"] = "text"
    metadata: dict = {}
    token_count: int
