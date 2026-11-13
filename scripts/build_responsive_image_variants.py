"""Encode smaller WebP candidates without changing the original image."""

import argparse
from pathlib import Path

from PIL import Image


def build_variants(source, widths, *, missing_only=False):
    with Image.open(source) as image:
        for width in sorted(set(widths)):
            if width <= 0:
                raise ValueError("Image widths must be positive")
            if width >= image.width:
                continue
            target = source.with_name(f"{source.stem}-{width}.webp")
            if missing_only and target.exists():
                continue
            height = round(image.height * width / image.width)
            image.resize((width, height), Image.Resampling.LANCZOS).save(
                target, "WEBP", quality=82, method=6
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path, nargs="+")
    parser.add_argument("--widths", type=int, nargs="+", required=True)
    parser.add_argument("--missing-only", action="store_true")
    args = parser.parse_args()
    for source in args.sources:
        build_variants(source, args.widths, missing_only=args.missing_only)


if __name__ == "__main__":
    main()
