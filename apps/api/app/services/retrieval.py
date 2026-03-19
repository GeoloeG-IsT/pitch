"""Vector retrieval and Cohere reranking pipeline."""

from __future__ import annotations

import copy
import re

import cohere
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.supabase import get_service_client

# Keywords that signal financial-oriented questions
FINANCIAL_KEYWORDS = {
    "revenue", "cost", "profit", "margin", "arr", "burn", "runway",
    "valuation", "funding", "financial", "price", "subscription",
    "tam", "sam", "som",
}
TABLE_KEYWORDS = {
    "compare", "comparison", "table", "breakdown", "numbers", "data", "metrics",
}


async def get_query_embedding(question: str) -> list[float]:
    """Generate an embedding for the user question using the same model as ingestion."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=question,
    )
    return response.data[0].embedding


async def retrieve_chunks(
    query_embedding: list[float], match_count: int = 20
) -> list[dict]:
    """Call the match_chunks RPC to find similar chunks via pgvector."""
    client = get_service_client()
    result = client.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_threshold": 0.0,
            "match_count": match_count,
        },
    ).execute()
    return result.data


def apply_metadata_boost(chunks: list[dict], question: str) -> list[dict]:
    """Adjust similarity scores based on question keywords and chunk types."""
    words = set(re.findall(r"[a-z]+", question.lower()))
    should_boost_tables = bool(words & FINANCIAL_KEYWORDS) or bool(
        words & TABLE_KEYWORDS
    )

    boosted = copy.deepcopy(chunks)
    if should_boost_tables:
        for chunk in boosted:
            if chunk.get("chunk_type") == "table":
                chunk["similarity"] = chunk.get("similarity", 0) * 1.5

    boosted.sort(key=lambda c: c.get("similarity", 0), reverse=True)
    return boosted


async def rerank_chunks(
    chunks: list[dict], question: str, top_n: int = 10
) -> list[dict]:
    """Rerank chunks using Cohere, or fall back to similarity order."""
    if not chunks:
        return []
    if not settings.cohere_api_key:
        return chunks[:top_n]

    co = cohere.ClientV2(api_key=settings.cohere_api_key)
    rerank_results = co.rerank(
        model="rerank-v3.5",
        query=question,
        documents=[c["content"] for c in chunks],
        top_n=top_n,
    )

    reranked: list[dict] = []
    for result in rerank_results.results:
        if result.relevance_score > 0.01:
            chunk = copy.deepcopy(chunks[result.index])
            chunk["relevance_score"] = result.relevance_score
            reranked.append(chunk)

    return reranked


async def retrieve_and_rerank(question: str) -> list[dict]:
    """Full retrieval pipeline: embed -> search -> boost -> rerank."""
    embedding = await get_query_embedding(question)
    chunks = await retrieve_chunks(embedding, match_count=20)
    boosted = apply_metadata_boost(chunks, question)
    reranked = await rerank_chunks(boosted, question, top_n=10)
    return reranked
