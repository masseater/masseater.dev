import { Effect } from "effect";

import { writeFumx } from "#/entities/timeline/index.ts";
import type { Written } from "#/entities/timeline/index.ts";

import { readAlsDocument } from "./live-set.ts";
import { timelineOf } from "./timeline.ts";

export interface LiveSetFile {
  readonly bytes: Uint8Array;
  readonly title: string;
}

export interface Fumx extends Written {
  readonly offGrid: number;
}

export const alsToFumx = Effect.fn("alsToFumx")(function* convert(input: LiveSetFile) {
  const document = yield* readAlsDocument(input.bytes);
  const timeline = yield* Effect.sync(() => timelineOf(document.Ableton.LiveSet)).pipe(
    Effect.withSpan("timelineOf"),
  );
  const written = yield* Effect.sync(() => writeFumx({ timeline, title: input.title })).pipe(
    Effect.withSpan("writeFumx"),
  );
  yield* Effect.annotateCurrentSpan({
    creator: document.Ableton.Creator ?? "",
    parts: written.plan.parts.length,
    bars: written.bars.length,
  });
  const fumx: Fumx = { ...written, offGrid: timeline.offGrid };
  return fumx;
});
