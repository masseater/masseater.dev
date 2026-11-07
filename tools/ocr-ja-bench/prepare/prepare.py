import io
import json
import sys
from pathlib import Path

import pyarrow.parquet as pq
from huggingface_hub import hf_hub_download
from PIL import Image, ImageOps

REPO = "llm-jp/jawildtext"
REVISION = "627ca7ea7c224ffe1accff8737991fc2240784fa"
LONG_EDGE = 2048
SUBSETS = [
    ("handwriting_ocr/train-00000-of-00006.parquet", "handwriting-horizontal", "horizontal", 20),
    ("handwriting_ocr/train-00000-of-00006.parquet", "handwriting-vertical", "vertical", 20),
    ("receipt_kie/train-00000-of-00008.parquet", "receipt-photo", None, 20),
]


def direction_of(polygons):
    directions = {polygon["direction"] for polygon in polygons}
    return directions.pop() if len(directions) == 1 else None


def png_of(data):
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    image.thumbnail((LONG_EDGE, LONG_EDGE))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def main():
    images = Path(sys.argv[1])
    manifest = Path(sys.argv[2])
    images.mkdir(parents=True, exist_ok=True)
    pages = []
    for filename, category, direction, count in SUBSETS:
        path = hf_hub_download(REPO, filename, repo_type="dataset", revision=REVISION)
        rows = pq.read_table(path, columns=["image_id", "polygons", "image"]).to_pylist()
        rows.sort(key=lambda row: int(row["image_id"]))
        picked = [row for row in rows if direction_of(row["polygons"]) == direction][:count]
        for row in picked:
            page_id = f"jawildtext-{category}-{row['image_id']}"
            (images / f"{page_id}.png").write_bytes(png_of(row["image"]["bytes"]))
            pages.append(
                {
                    "id": page_id,
                    "category": category,
                    "truth": "\n".join(polygon["text"] for polygon in row["polygons"]),
                }
            )
    manifest.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
