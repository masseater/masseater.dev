import type { Run } from "@ocr-decide/measurements/schema";

const PERCENT = 100;

const COST_DIGITS = 5;

const SECOND_DIGITS = 1;

const NONE = 0;

export const percent = (rate: number): string => `${Math.round(rate * PERCENT)}%`;

export const seconds = (value: number): string => `${value.toFixed(SECOND_DIGITS)} 秒`;

export const dollars = (value: number): string => `$${value.toFixed(COST_DIGITS)}`;

export const rateIn = ({
  rates,
  id,
}: Readonly<{ rates: Readonly<Record<string, number>>; id: string }>): string =>
  percent(rates[id] ?? NONE);

export const keyOf = (run: Run): string => `${run.method} ${run.model}`;

export const wayOf = (run: Run): string => {
  if (run.method === "image-generation") {
    return `${run.model} に画像を渡す`;
  }
  if (run.method === "ocr-reread-decision") {
    return `OCR、読み直し、${run.model} が選ぶ`;
  }
  return `OCR してから ${run.model} が選ぶ`;
};
