import { Effect, Schema } from "effect";

import { FONT } from "#/shared/config/index.ts";

const taggedError = Schema.TaggedError;

export class FontError extends taggedError<FontError, { readonly brand: unique symbol }>()(
  "FontError",
  {
    face: Schema.String,
    reason: Schema.Unknown,
  },
) {}

const FACES = [
  `400 64px "${FONT.impact}"`,
  `400 64px "${FONT.pop}"`,
  `500 64px "${FONT.text}"`,
  `800 64px "${FONT.text}"`,
  `500 64px "${FONT.code}"`,
] as const;

const loadFace = (face: string, text: string): Effect.Effect<readonly FontFace[], FontError> =>
  Effect.tryPromise({
    try: () => document.fonts.load(face, text),
    catch: (reason) => FontError.make({ face, reason }),
  });

export const loadFonts = (text: string): Effect.Effect<void, FontError> =>
  Effect.forEach(FACES, (face) => loadFace(face, text), { concurrency: "unbounded" }).pipe(
    Effect.asVoid,
  );
