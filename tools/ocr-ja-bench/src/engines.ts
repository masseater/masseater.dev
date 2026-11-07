import { String as Str } from "effect";

type Engine =
  | Readonly<{ kind: "process"; id: string; label: string; project: string }>
  | Readonly<{ kind: "tesseract"; id: string; label: string }>
  | Readonly<{ kind: "vlm"; id: string; label: string }>;

const ENGINES: readonly Engine[] = [
  { kind: "process", id: "indra-ocr", label: "Indra OCR 1.1", project: "indra" },
  { kind: "process", id: "ndlocr-lite", label: "NDLOCR-Lite 1.3", project: "ndlocr-lite" },
  { kind: "process", id: "paddleocr", label: "PaddleOCR 3.7（PP-OCRv6）", project: "paddleocr" },
  { kind: "process", id: "surya", label: "Surya OCR 2", project: "surya" },
  { kind: "tesseract", id: "tesseract", label: "Tesseract 5（tesseract.js）" },
  { kind: "vlm", id: "google/gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  { kind: "vlm", id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { kind: "vlm", id: "qwen/qwen3.8-flash", label: "Qwen3.8 Flash" },
  { kind: "vlm", id: "openai/gpt-6-luna", label: "GPT-6 Luna" },
  { kind: "vlm", id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5" },
];

const fileNameOf = (id: string): string => `${Str.replaceAll("/", "__")(id)}.json`;

export { ENGINES, fileNameOf };
export type { Engine };
