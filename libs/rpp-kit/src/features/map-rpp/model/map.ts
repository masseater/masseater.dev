import { parseRpp, outlineSong, renderSegments, segmentsOf } from "#/entities/song/index.ts";
import type { ParseError } from "#/entities/song/index.ts";

export type Mapped =
  | Readonly<{ status: "ok"; code: string }>
  | Readonly<{ status: "error"; error: ParseError }>;

export const mapRpp = (content: string): Mapped => {
  const parsed = parseRpp(content);
  if (parsed.status === "error") {
    return { status: "error", error: parsed.error };
  }
  const segments = segmentsOf({ outline: outlineSong(parsed.root), missing: [] });
  return { status: "ok", code: renderSegments({ content, segments }) };
};
