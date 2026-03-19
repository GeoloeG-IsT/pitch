"""Vector retrieval and Cohere reranking pipeline."""

from __future__ import annotations


async def get_query_embedding(question: str) -> list[float]:
    raise NotImplementedError


async def retrieve_chunks(query_embedding: list[float], match_count: int = 20) -> list[dict]:
    raise NotImplementedError


def apply_metadata_boost(chunks: list[dict], question: str) -> list[dict]:
    raise NotImplementedError


async def rerank_chunks(chunks: list[dict], question: str, top_n: int = 10) -> list[dict]:
    raise NotImplementedError


async def retrieve_and_rerank(question: str) -> list[dict]:
    raise NotImplementedError
