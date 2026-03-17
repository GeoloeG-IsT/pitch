#!/usr/bin/env python3
"""Build all demo content."""
import subprocess
import sys
import pathlib

CONTENT_DIR = pathlib.Path(__file__).parent


def run(script: str):
    result = subprocess.run(
        [sys.executable, str(CONTENT_DIR / script)],
        cwd=str(CONTENT_DIR),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"FAILED: {script}")
        print(result.stderr)
        sys.exit(1)
    print(result.stdout, end="")


def main():
    run("pitch-deck/build.py")
    run("financial-model/build.py")

    from build_docs import build_docs
    build_docs()

    # Verify all outputs exist
    output_dir = CONTENT_DIR / "output"
    expected = [
        "pitch-deck.pdf",
        "financial-model.xlsx",
        "investment-memo.pdf",
        "technical-architecture.pdf",
    ]
    missing = [f for f in expected if not (output_dir / f).exists()]
    if missing:
        print(f"\nERROR: Missing outputs: {missing}")
        sys.exit(1)

    print(f"\nAll content built successfully!")
    print(f"Output directory: {output_dir}")
    for f in expected:
        size = (output_dir / f).stat().st_size
        print(f"  {f}: {size:,} bytes")


if __name__ == "__main__":
    main()
