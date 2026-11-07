import json
import os
import sys
import time

os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

from paddleocr import PaddleOCR


def main():
    ocr = PaddleOCR(lang="japan", enable_mkldnn=False)
    for line in sys.stdin:
        request = json.loads(line)
        start = time.perf_counter()
        text = "\n".join("\n".join(result["rec_texts"]) for result in ocr.predict(request["image"]))
        seconds = time.perf_counter() - start
        print(json.dumps({"id": request["id"], "text": text, "seconds": seconds}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
