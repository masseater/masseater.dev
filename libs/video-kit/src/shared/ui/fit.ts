import { fitText } from "@remotion/layout-utils";
import { Schema, String as Str } from "effect";

import type { Face, Format } from "#/shared/config/index.ts";
import { FIT_FLOOR, FONT, FRAMES, NOTHING } from "#/shared/config/index.ts";

const taggedError = Schema.TaggedError;

export class FitError extends taggedError<FitError, { readonly brand: unique symbol }>()(
  "FitError",
  {
    text: Schema.String,
    width: Schema.Finite,
  },
) {}

const WEIGHT: Readonly<Record<Face, string>> = {
  impact: "400",
  pop: "400",
  text: "800",
  code: "500",
};

const HALF = 2;

export const innerWidth = (format: Format): number => {
  const { width, safe } = FRAMES[format];
  return width - safe.left - safe.right;
};

export interface FitRequest {
  readonly text: string;
  readonly width: number;
  readonly max: number;
  readonly face: Face;
}

export const fitSize = ({ text, width, max, face }: FitRequest): number => {
  const { fontSize } = fitText({
    text,
    withinWidth: width,
    fontFamily: `"${FONT[face]}"`,
    fontWeight: WEIGHT[face],
  });
  const size = Math.min(max, fontSize);
  if (size < max * FIT_FLOOR) {
    throw FitError.make({ text, width });
  }
  return size;
};

export const twoLineSize = (request: FitRequest): number =>
  fitSize({
    ...request,
    text: Str.slice(NOTHING, Math.ceil(request.text.length / HALF))(request.text),
  });
