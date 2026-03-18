"""PDF ingestion pipeline using LlamaIndex PyMuPDFReader + SentenceSplitter + OpenAIEmbedding."""

from __future__ import annotations

import os
import tempfile

from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import BaseNode
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.readers.file import PyMuPDFReader


async def run_pdf_pipeline(file_bytes: bytes) -> list[BaseNode]:
    """Parse a PDF from raw bytes into embedded LlamaIndex nodes.

    Each page becomes one or more nodes (sub-chunked if >500 tokens).
    Every node carries page_label in metadata and a 1536-dim embedding.
    """
    # PyMuPDFReader requires a file path on disk
    fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    try:
        os.write(fd, file_bytes)
        os.close(fd)

        reader = PyMuPDFReader()
        documents = reader.load_data(temp_path)

        pipeline = IngestionPipeline(
            transformations=[
                SentenceSplitter(chunk_size=500, chunk_overlap=50),
                OpenAIEmbedding(model="text-embedding-3-small"),
            ]
        )

        nodes = await pipeline.arun(documents=documents)
        return nodes
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
