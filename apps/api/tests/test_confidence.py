"""Unit tests for the three-signal confidence scoring service."""

from __future__ import annotations

import pytest

from app.services.confidence import (
    compute_confidence_score,
    compute_coverage_signal,
    compute_retrieval_signal,
    extract_llm_confidence,
)


# ---------------------------------------------------------------------------
# compute_retrieval_signal
# ---------------------------------------------------------------------------


def test_retrieval_signal_top3_average():
    chunks = [
        {"relevance_score": 0.9},
        {"relevance_score": 0.8},
        {"relevance_score": 0.7},
        {"relevance_score": 0.3},
    ]
    result = compute_retrieval_signal(chunks)
    assert abs(result - 0.8) < 0.01  # avg of 0.9, 0.8, 0.7


def test_retrieval_signal_empty():
    assert compute_retrieval_signal([]) == 0.0


def test_retrieval_signal_uses_similarity_fallback():
    chunks = [{"similarity": 0.6}, {"similarity": 0.4}]
    result = compute_retrieval_signal(chunks)
    assert abs(result - 0.5) < 0.01  # avg of 0.6, 0.4


# ---------------------------------------------------------------------------
# compute_coverage_signal
# ---------------------------------------------------------------------------


def test_coverage_signal_matching_words():
    chunks = [
        {"content": "Our revenue grew 150% year-over-year to reach $2.5M ARR."},
    ]
    result = compute_coverage_signal("what is the revenue", chunks)
    # "what", "the", "revenue" are the 3+ char words; "revenue" matches -> 1/3
    assert result > 0.0
    # With more matching words the ratio increases
    result2 = compute_coverage_signal(
        "what revenue grew year over year", chunks
    )
    assert result2 > result


def test_coverage_signal_no_match():
    chunks = [
        {"content": "Our revenue grew 150% year-over-year."},
    ]
    result = compute_coverage_signal("what is quantum physics", chunks)
    assert result < 0.3


def test_coverage_signal_short_question():
    result = compute_coverage_signal("hi", [], {})
    assert result == 0.5


# ---------------------------------------------------------------------------
# compute_confidence_score — tier thresholds
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "retrieval,llm,coverage,expected_tier",
    [
        (0.9, 0.8, 0.7, "high"),       # ~82.5, high
        (0.5, 0.4, 0.3, "moderate"),    # ~41.5, moderate
        (0.1, 0.1, 0.1, "low"),         # ~10, low
    ],
)
def test_tier_thresholds(retrieval, llm, coverage, expected_tier):
    score, tier = compute_confidence_score(retrieval, llm, coverage)
    assert tier == expected_tier
    assert 0 <= score <= 100


# ---------------------------------------------------------------------------
# extract_llm_confidence
# ---------------------------------------------------------------------------


def test_extract_llm_confidence_present():
    text = "Answer text here\nCONFIDENCE: 0.85"
    clean, value = extract_llm_confidence(text)
    assert clean == "Answer text here"
    assert abs(value - 0.85) < 0.001


def test_extract_llm_confidence_missing():
    text = "Answer without confidence line"
    clean, value = extract_llm_confidence(text)
    assert clean == text
    assert value == 0.5


def test_extract_llm_confidence_clamps_above_one():
    text = "Some answer\nCONFIDENCE: 1.5"
    _, value = extract_llm_confidence(text)
    assert value == 1.0
