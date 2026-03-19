"""Query engine orchestrator: retrieval -> prompt -> LLM stream."""

from __future__ import annotations

from typing import Callable

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.supabase import get_service_client
from app.models.query import Citation
from app.services.confidence import (
    compute_confidence_score,
    compute_coverage_signal,
    compute_retrieval_signal,
    extract_llm_confidence,
)
from app.services.retrieval import retrieve_and_rerank

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

CONFIDENCE_SUFFIX = """

After your answer, on a new line, output EXACTLY:
CONFIDENCE: [0.0-1.0]
where the number reflects how well the source materials support your answer.
- 1.0 = sources directly and completely answer the question
- 0.7 = sources mostly answer the question with minor gaps
- 0.4 = sources partially relevant but significant gaps
- 0.1 = sources barely relevant, answer is mostly inference
- 0.0 = no relevant information in sources

This confidence line will be removed before showing to users."""


def build_context_prompt(
    chunks: list[dict], document_titles: dict[str, str]
) -> str:
    """Build a context string from chunks, respecting the token budget."""
    parts: list[str] = []
    tokens_used = 0

    for chunk in chunks:
        token_count = chunk.get("token_count", 0)
        if tokens_used + token_count > TOKEN_BUDGET:
            break

        doc_id = str(chunk.get("document_id", ""))
        title = document_titles.get(doc_id, "Unknown Document")
        section = chunk.get("section_number", "?")
        chunk_type = chunk.get("chunk_type", "text")
        content = chunk.get("content", "")

        parts.append(f"[{title}, Section {section}] ({chunk_type})\n{content}")
        tokens_used += token_count

    return "\n\n".join(parts)


async def lookup_document_titles(document_ids: list[str]) -> dict[str, str]:
    """Query documents table for titles by IDs."""
    client = get_service_client()
    result = (
        client.table("documents")
        .select("id, title")
        .in_("id", document_ids)
        .execute()
    )
    return {row["id"]: row["title"] for row in result.data}


def extract_citations(
    chunks: list[dict], document_titles: dict[str, str]
) -> list[Citation]:
    """Map chunks to Citation objects."""
    citations: list[Citation] = []
    for chunk in chunks:
        doc_id = str(chunk.get("document_id", ""))
        title = document_titles.get(doc_id, "Unknown Document")
        section_number = chunk.get("section_number")
        page_number = chunk.get("page_number")

        if section_number is not None:
            section_label = f"Section {section_number}"
        elif page_number is not None:
            section_label = f"Page {page_number}"
        else:
            section_label = None

        citations.append(
            Citation(
                document_id=doc_id,
                document_title=title,
                section_number=section_number,
                section_label=section_label,
                chunk_id=str(chunk.get("id", "")),
                relevance_score=chunk.get("relevance_score", chunk.get("similarity", 0.0)),
            )
        )
    return citations


async def run_query_pipeline(
    question: str, query_id: str, send_message: Callable
) -> tuple[str, list[Citation], float, str]:
    """Orchestrate the full RAG pipeline: retrieve, build prompt, stream LLM.

    Returns (clean_answer, citations, confidence_score, confidence_tier).
    """
    try:
        # 1. Retrieve and rerank chunks
        await send_message({"type": "status", "status": "retrieving"})
        chunks = await retrieve_and_rerank(question)

        if not chunks:
            no_docs_msg = "I don't have any source documents to reference yet. Please upload documents first, then try your question again."
            await send_message({"type": "token", "content": no_docs_msg})
            await send_message({"type": "citations", "citations": []})
            return (no_docs_msg, [], 0.0, "low")

        # 2. Look up document titles
        doc_ids = list(set(str(c["document_id"]) for c in chunks))
        doc_titles = await lookup_document_titles(doc_ids)

        # 3. Build context and citations
        context = build_context_prompt(chunks, doc_titles)
        citations = extract_citations(chunks, doc_titles)

        # 3b. Compute retrieval and coverage signals early
        retrieval_signal = compute_retrieval_signal(chunks)
        coverage_signal = compute_coverage_signal(question, chunks, doc_titles)

        # 4. Stream LLM response (with confidence suffix appended to prompt)
        await send_message({"type": "status", "status": "generating"})

        system_content = SYSTEM_PROMPT.format(context=context) + CONFIDENCE_SUFFIX
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question},
        ]

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True,
            temperature=0.3,
        )

        full_response = ""
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_response += delta
                await send_message({"type": "token", "content": delta})

        # 5. Extract LLM confidence and compute final score
        clean_answer, llm_signal = extract_llm_confidence(full_response)
        confidence_score, confidence_tier = compute_confidence_score(
            retrieval_signal, llm_signal, coverage_signal
        )

        # 6. Send clean answer replacement (strips CONFIDENCE: line from stream)
        if clean_answer != full_response:
            await send_message({"type": "replace_answer", "answer": clean_answer})

        # 7. Send citations
        await send_message(
            {"type": "citations", "citations": [c.model_dump() for c in citations]}
        )

        return (clean_answer, citations, confidence_score, confidence_tier)

    except Exception as e:
        await send_message({"type": "error", "message": str(e)})
        raise
