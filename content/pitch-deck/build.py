#!/usr/bin/env python3
"""Build pitch deck PDF from markdown source."""
import pathlib
import markdown
import weasyprint

SCRIPT_DIR = pathlib.Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output"
SOURCE = SCRIPT_DIR / "slides.md"
STYLE = SCRIPT_DIR / "style.css"
OUTPUT = OUTPUT_DIR / "pitch-deck.pdf"


def build():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    md_text = SOURCE.read_text()
    html = markdown.markdown(md_text, extensions=["tables", "fenced_code"])
    css = weasyprint.CSS(filename=str(STYLE))
    doc = weasyprint.HTML(string=html)
    doc.write_pdf(str(OUTPUT), stylesheets=[css])
    print(f"Built: {OUTPUT}")


if __name__ == "__main__":
    build()
