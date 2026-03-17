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

    # Financial model build (added in Task 2)
    fm_script = CONTENT_DIR / "financial-model" / "build.py"
    if fm_script.exists():
        run("financial-model/build.py")

    # Memo and architecture PDF builds (added in Task 2)
    try:
        from build_docs import build_docs
        build_docs()
    except ImportError:
        print("Skipping doc builds (build_docs not yet available)")

    print(f"\nAll content built successfully!")
    print(f"Output: {CONTENT_DIR / 'output'}")


if __name__ == "__main__":
    main()
