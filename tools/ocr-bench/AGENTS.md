# @ocr-decide/bench

このワークスペースはOCRを測定する。invoice-*コマンドは`ocr-decide`がサンプル請求書をどれだけ読み取れるかを測定する。ja-*コマンドはOCRエンジンが日本語をどれだけ読み取れるかを測定する。結果は`libs/ocr-measurements`に書き、デモアプリがそれを表示する。

Indra OCR、NDLOCR-Lite、PaddleOCR、SuryaはPythonでしか動作しないため、もはや測定されていない。`results/`内のレコードのみが残っている。
