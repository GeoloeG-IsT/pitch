#!/usr/bin/env python3
"""Build markdown documents to PDF."""
import pathlib
import markdown
import weasyprint

CONTENT_DIR = pathlib.Path(__file__).parent
OUTPUT_DIR = CONTENT_DIR / "output"

DOCS = [
    ("investment-memo/memo.md", "investment-memo.pdf"),
    ("technical-architecture/architecture.md", "technical-architecture.pdf"),
]

STYLE = """
@page { size: A4; margin: 2.5cm; }
body { font-family: Inter, system-ui, sans-serif; font-size: 14px; line-height: 1.7; color: #333; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
h2 { font-size: 22px; color: #1a1a2e; margin-top: 32px; page-break-after: avoid; }
h3 { font-size: 18px; color: #1a1a2e; margin-top: 24px; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background-color: #f8f9fa; font-weight: 600; }
code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
pre { background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #6366f1; padding-left: 16px; color: #555; margin: 16px 0; }
strong { color: #1a1a2e; }
"""


def build_docs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    css = weasyprint.CSS(string=STYLE)
    for src_path, out_name in DOCS:
        src = CONTENT_DIR / src_path
        if not src.exists():
            print(f"Skipping {src_path} (not found)")
            continue
        md_text = src.read_text()
        html = markdown.markdown(md_text, extensions=["tables", "fenced_code"])
        doc = weasyprint.HTML(string=html)
        output = OUTPUT_DIR / out_name
        doc.write_pdf(str(output), stylesheets=[css])
        print(f"Built: {output}")


if __name__ == "__main__":
    build_docs()
