import json
import sys
import time
from html.parser import HTMLParser

from surya.inference import SuryaInferenceManager
from surya.input.load import load_image
from surya.recognition import RecognitionPredictor

BREAKS = {"br", "p", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6"}


class TextOf(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in BREAKS:
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)


def text_of(page):
    blocks = sorted((block for block in page.blocks if not block.skipped), key=lambda block: block.reading_order)
    parser = TextOf()
    for block in blocks:
        parser.feed(block.html)
        parser.parts.append("\n")
    return "".join(parser.parts).strip()


def main():
    manager = SuryaInferenceManager()
    manager.start()
    predictor = RecognitionPredictor(manager)
    for line in sys.stdin:
        request = json.loads(line)
        images, _ = load_image(request["image"])
        start = time.perf_counter()
        pages = predictor(images, full_page=True)
        seconds = time.perf_counter() - start
        text = "\n".join(text_of(page) for page in pages)
        print(json.dumps({"id": request["id"], "text": text, "seconds": seconds}, ensure_ascii=False), flush=True)
    manager.stop()


if __name__ == "__main__":
    main()
