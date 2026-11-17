# @ocr-decide/bench

This workspace measures OCR. The `invoice-*` commands measure how well `ocr-decide` reads the sample invoices. The `ja-*` commands measure how well OCR engines read Japanese. Results go to `libs/ocr-measurements`, and the demo app shows them.

Indra OCR, NDLOCR-Lite, PaddleOCR and Surya run only in Python, so they are no longer measured. Only their records in `results/` remain.
