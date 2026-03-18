"""Markdown ingestion pipeline using LlamaIndex MarkdownNodeParser + SentenceSplitter + OpenAIEmbedding."""

from __future__ import annotations

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.core.schema import BaseNode
from llama_index.embeddings.openai import OpenAIEmbedding


async def run_markdown_pipeline(text: str) -> list[BaseNode]:
    """Parse markdown text into embedded LlamaIndex nodes.

    Headings are used as split boundaries. Large sections are sub-chunked
    at ~500 tokens with 50-token overlap.
    """
    doc = Document(text=text)

    pipeline = IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),
            SentenceSplitter(chunk_size=500, chunk_overlap=50),
            OpenAIEmbedding(model="text-embedding-3-small"),
        ]
    )

    nodes = await pipeline.arun(documents=[doc])
    return nodes
