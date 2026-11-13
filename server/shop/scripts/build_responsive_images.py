"""Build local shop WebP candidates while preserving every original product image."""

import json
from pathlib import Path

from PIL import Image


SHOP_DIR = Path(__file__).resolve().parents[1]
SERVER_DIR = SHOP_DIR.parent
PRODUCTS_DIR = SHOP_DIR / "static" / "shop" / "products"
DESTINATION = PRODUCTS_DIR / "responsive"


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    sources = [
        *(SERVER_DIR / "assets" / "portfolio" / "online-shop" / "assets").glob("*.jpg"),
        *PRODUCTS_DIR.glob("*.webp"),
    ]
    manifest = {}
    for source in sorted(sources):
        static_path = (
            source.relative_to(SERVER_DIR / "assets")
            if source.is_relative_to(SERVER_DIR / "assets")
            else source.relative_to(SHOP_DIR / "static")
        )
        with Image.open(source) as image:
            image = image.convert("RGB")
            candidates = []
            for width in sorted({160, 320, 480, 640, image.width}):
                if width > image.width:
                    continue
                target = DESTINATION / f"{source.stem}-{width}.webp"
                height = round(image.height * width / image.width)
                candidate = image if width == image.width else image.resize(
                    (width, height), Image.Resampling.LANCZOS
                )
                candidate.save(target, "WEBP", quality=82, method=6)
                candidates.append({"path": f"shop/products/responsive/{target.name}", "width": width})
            manifest[f"/static/{static_path.as_posix()}"] = {
                "width": image.width, "height": image.height, "candidates": candidates,
            }
    (PRODUCTS_DIR / "responsive-images.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Generated responsive WebP candidates for {len(manifest)} product images.")


if __name__ == "__main__":
    main()
