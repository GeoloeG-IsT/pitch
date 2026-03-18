from typing import Literal

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str
    file_name: str
    file_type: Literal["pdf", "xlsx", "md", "txt"]
    file_size_bytes: int
    user_id: str


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_name: str
    file_type: str
    file_size_bytes: int | None
    status: str
    metadata: dict
    created_at: str
    updated_at: str
    chunk_count: int | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
