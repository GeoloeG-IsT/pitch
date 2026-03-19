"""Query engine orchestrator: retrieval -> prompt -> LLM stream."""

from __future__ import annotations

from typing import Callable

from app.models.query import Citation

TOKEN_BUDGET = 6000

SYSTEM_PROMPT = """You are a knowledgeable investment analyst assistant for Zeee Pitch Zooo.
You answer investor due diligence questions based ONLY on the provided source materials.

INSTRUCTIONS:
- Be professional, direct, and concise -- like a well-prepared CFO answering due diligence questions.
- Default to 2-4 sentences. Expand for complex multi-document questions.
- Weave source citations naturally using [Document Name, Section] format.
- When information spans multiple documents, cross-reference and synthesize.
- If the materials don't contain the answer, say so clearly and suggest related information that IS available.
- Never hallucinate or invent information not in the sources.

SOURCE MATERIALS:
{context}

Answer the following question:"""


def build_context_prompt(chunks: list[dict], document_titles: dict[str, str]) -> str:
    raise NotImplementedError


async def lookup_document_titles(document_ids: list[str]) -> dict[str, str]:
    raise NotImplementedError


def extract_citations(chunks: list[dict], document_titles: dict[str, str]) -> list[Citation]:
    raise NotImplementedError


async def run_query_pipeline(
    question: str, query_id: str, send_message: Callable
) -> tuple[str, list[Citation]]:
    raise NotImplementedError
