import type { Segment } from "#/entities/script/index.ts";
import { plainOf } from "#/entities/script/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { FIT } from "#/shared/config/index.ts";
import { innerWidth, twoLineSize } from "#/shared/ui/fit.ts";

export interface HeadlineSizeRequest {
  readonly segments: readonly Segment[];
  readonly format: Format;
  readonly slot: "heading" | "title";
}

export const headlineSize = ({ segments, format, slot }: HeadlineSizeRequest): number =>
  twoLineSize({
    text: plainOf(segments),
    width: innerWidth(format),
    max: FIT[format][slot],
    face: "impact",
  });
