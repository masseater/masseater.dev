import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
from PIL import Image

REPOSITORY = "https://github.com/ndl-lab/ndlocr-lite"
COMMIT = "d001dad2013ceabb5736ff8d637474e443eb73c2"
SOURCE = Path(__file__).resolve().parents[2] / ".cache" / f"ndlocr-lite-{COMMIT}"


def checkout():
    if not SOURCE.exists():
        subprocess.run(["git", "init", "-q", str(SOURCE)], check=True)
        subprocess.run(["git", "-C", str(SOURCE), "fetch", "-q", "--depth", "1", REPOSITORY, COMMIT], check=True)
        subprocess.run(["git", "-C", str(SOURCE), "checkout", "-q", "FETCH_HEAD"], check=True)
    sys.path.insert(0, str(SOURCE / "src"))


def arguments(ocr, output):
    captured = {}
    sys.argv = ["ocr", "--output", output]
    original = ocr.process
    ocr.process = lambda args: captured.setdefault("args", args)
    ocr.main()
    ocr.process = original
    return captured["args"]


def main():
    checkout()
    import ocr

    with tempfile.TemporaryDirectory() as output:
        args = arguments(ocr, output)
        detector = ocr.get_detector(args)
        recognizer100 = ocr.get_recognizer(args=args)
        recognizer30 = ocr.get_recognizer(args=args, weights_path=args.rec_weights30)
        recognizer50 = ocr.get_recognizer(args=args, weights_path=args.rec_weights50)
        for line in sys.stdin:
            request = json.loads(line)
            image = np.array(Image.open(request["image"]).convert("RGB"))
            start = time.perf_counter()
            result = ocr._run_ocr_on_image_array(
                detector, recognizer30, recognizer50, recognizer100, Path(request["image"]).name, image, output
            )
            seconds = time.perf_counter() - start
            print(json.dumps({"id": request["id"], "text": result["text"], "seconds": seconds}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
