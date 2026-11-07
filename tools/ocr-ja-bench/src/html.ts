import { Match, Array as Arr, pipe } from "effect";
import { escapeText } from "entities/escape";

import type { SyntheticPage } from "./page.ts";

const FONT_CSS: Readonly<Record<string, string>> = {
  "Noto Serif JP": import.meta.resolve("@fontsource/noto-serif-jp/400.css"),
  "Noto Sans JP": import.meta.resolve("@fontsource/noto-sans-jp/400.css"),
  "Klee One": import.meta.resolve("@fontsource/klee-one/400.css"),
  "Zen Kurenaido": import.meta.resolve("@fontsource/zen-kurenaido/400.css"),
};

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const NO_TILT = 0;

const WRITING_MODE = { horizontal: "horizontal-tb", vertical: "vertical-rl" } as const;

const conditionStyle = (page: SyntheticPage): string =>
  Match.value(page.condition).pipe(
    Match.when("clean", () => ".sheet { font-size: 20px; }"),
    Match.when("small", () => ".sheet { font-size: 10px; }"),
    Match.when(
      "degraded",
      () => `
    .sheet { font-size: 18px; transform: rotate(${page.tilt ?? NO_TILT}deg); filter: blur(0.8px) contrast(0.65) brightness(1.08); }
    body::after { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: 0.4; background-image: ${NOISE}; }`,
    ),
    Match.exhaustive,
  );

const htmlOf = (
  page: SyntheticPage,
): string => `<!doctype html><html lang="ja"><head><meta charset="utf-8">
  <link rel="stylesheet" href="${FONT_CSS[page.font] ?? ""}">
  <style>
    body { display: inline-block; margin: 0; padding: 24px; background: #f4f1ea; color: #222; }
    .sheet { background: #fff; padding: 28px; font-family: "${page.font}"; line-height: 1.8; writing-mode: ${WRITING_MODE[page.writing]}; }
    .line { white-space: pre; }
    ${conditionStyle(page)}
  </style></head><body><div class="sheet">${pipe(
    page.lines,
    Arr.map((line) => `<div class="line">${escapeText(line)}</div>`),
    Arr.join(""),
  )}</div></body></html>`;

export { htmlOf };
