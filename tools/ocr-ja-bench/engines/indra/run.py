import json
import sys
import time

import indra_ocr


def main():
    converter = indra_ocr.load()
    for line in sys.stdin:
        request = json.loads(line)
        start = time.perf_counter()
        text = "\n".join(page.text for _, page in converter.convert(request["image"]))
        seconds = time.perf_counter() - start
        print(json.dumps({"id": request["id"], "text": text, "seconds": seconds}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
