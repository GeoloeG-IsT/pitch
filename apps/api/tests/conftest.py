"""Shared test fixtures for the zeee-api test suite."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Path to demo content (built by Phase 1)
_CONTENT_DIR = Path(__file__).resolve().parents[3] / "content" / "output"

EMBEDDING_DIM = 1536
ZERO_EMBEDDING = [0.0] * EMBEDDING_DIM


# ---------------------------------------------------------------------------
# Sample file fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def sample_pdf_bytes() -> bytes:
    """Return bytes of the demo pitch deck PDF."""
    pdf_path = _CONTENT_DIR / "pitch-deck.pdf"
    if not pdf_path.exists():
        pytest.skip(f"Demo PDF not found at {pdf_path}")
    return pdf_path.read_bytes()


@pytest.fixture(scope="session")
def sample_excel_bytes() -> bytes:
    """Return bytes of the demo financial model Excel file."""
    xlsx_path = _CONTENT_DIR / "financial-model.xlsx"
    if not xlsx_path.exists():
        pytest.skip(f"Demo Excel file not found at {xlsx_path}")
    return xlsx_path.read_bytes()


@pytest.fixture
def sample_markdown_text() -> str:
    """Return a deterministic markdown string for testing."""
    return """\
# Investment Memo: Zeee Pitch Zooo

## Executive Summary

Zeee Pitch Zooo is a SaaS platform that transforms how investors interact with
startup pitch materials. The platform uses retrieval-augmented generation (RAG)
to enable natural language Q&A over uploaded documents, delivering accurate,
source-cited answers in real time.

The founding team has deep experience in enterprise SaaS, machine learning
infrastructure, and financial technology. The go-to-market strategy focuses on
VC firms and angel investor networks as initial customers.

## Market Opportunity

The global venture capital market deployed over $300 billion in 2024. Investors
spend an average of 3 minutes and 44 seconds reviewing a pitch deck, yet make
decisions that allocate millions of dollars. There is a massive gap between the
information density of pitch materials and the time available to absorb them.

### Competitive Landscape

| Competitor | Approach | Weakness |
|------------|----------|----------|
| DocSend | Document sharing + analytics | No AI, no Q&A |
| Notion AI | General purpose AI assistant | Not specialized for pitch review |
| ChatPDF | Generic PDF Q&A | No multi-document, no financial data |

## Financial Projections

### Revenue Model

The platform uses a tiered SaaS subscription model:

- **Starter:** $50/month -- up to 10 pitch decks, basic Q&A
- **Professional:** $200/month -- unlimited decks, advanced analytics
- **Enterprise:** $500/month -- team features, API access, custom models

Year 1 target: $500K ARR with 200 paying customers.
Year 3 target: $5M ARR with 1,500 paying customers.

### Key Metrics

Monthly burn rate is projected at $80K, with 18 months of runway from the
seed round. Customer acquisition cost (CAC) is estimated at $500 through
direct sales and content marketing, with lifetime value (LTV) of $4,800.
"""


# ---------------------------------------------------------------------------
# Mock OpenAI fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_openai_embedding():
    """Monkeypatch OpenAIEmbedding to return zero vectors without API calls."""

    async def _fake_get_text_embedding(self, text: str) -> list[float]:
        return ZERO_EMBEDDING

    async def _fake_get_text_embedding_batch(
        self, texts: list[str], **kwargs
    ) -> list[list[float]]:
        return [ZERO_EMBEDDING for _ in texts]

    with (
        patch(
            "llama_index.embeddings.openai.OpenAIEmbedding.aget_text_embedding",
            new=_fake_get_text_embedding,
        ),
        patch(
            "llama_index.embeddings.openai.OpenAIEmbedding.aget_text_embedding_batch",
            new=_fake_get_text_embedding_batch,
        ),
    ):
        yield


@pytest.fixture
def mock_openai_chat():
    """Monkeypatch OpenAI chat completions to return a mock summary."""
    mock_message = MagicMock()
    mock_message.content = "Mock LLM summary of financial data"

    mock_choice = MagicMock()
    mock_choice.message = mock_message

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_create = MagicMock(return_value=mock_response)

    with patch("openai.OpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_client.chat.completions.create = mock_create
        mock_openai_cls.return_value = mock_client
        yield mock_create
