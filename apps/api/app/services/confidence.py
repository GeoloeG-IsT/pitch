"""Three-signal confidence scoring for RAG answers."""

from __future__ import annotations

import re


def compute_retrieval_signal(chunks: list[dict]) -> float:
    """Average relevance_score of top-3 chunks. Returns 0.0 for empty list."""
    if not chunks:
        return 0.0
    scores = [
        c.get("relevance_score", c.get("similarity", 0.0)) for c in chunks
    ]
    top3 = sorted(scores, reverse=True)[:3]
    return sum(top3) / len(top3)


def compute_coverage_signal(
    question: str,
    chunks: list[dict],
    document_titles: dict[str, str] | None = None,
) -> float:
    """Ratio of question words (3+ chars) found in chunk content and doc titles."""
    words = set(re.findall(r"[a-z]{3,}", question.lower()))
    if not words:
        return 0.5

    corpus = " ".join(c.get("content", "") for c in chunks).lower()
    if document_titles:
        corpus += " " + " ".join(document_titles.values()).lower()

    matched = sum(1 for w in words if w in corpus)
    return matched / len(words)


def compute_confidence_score(
    retrieval: float, llm: float, coverage: float
) -> tuple[float, str]:
    """Weighted confidence score (0-100) and tier assignment.

    Weights: retrieval 0.40, llm 0.35, coverage 0.25.
    Tiers: >=70 high, >=40 moderate, <40 low.
    """
    raw = retrieval * 0.40 + llm * 0.35 + coverage * 0.25
    score = round(max(0.0, min(100.0, raw * 100)), 1)

    if score >= 70:
        tier = "high"
    elif score >= 40:
        tier = "moderate"
    else:
        tier = "low"

    return score, tier


def extract_llm_confidence(full_response: str) -> tuple[str, float]:
    """Extract CONFIDENCE: line from LLM response.

    Returns (clean_answer, confidence_value). Default 0.5 if not found.
    """
    pattern = r"\nCONFIDENCE:\s*([0-9]*\.?[0-9]+)\s*$"
    match = re.search(pattern, full_response)

    if match:
        value = float(match.group(1))
        value = max(0.0, min(1.0, value))
        clean = full_response[: match.start()]
        return clean, value

    return full_response, 0.5
