import { Effect, Option, Schema, Predicate } from "effect";
import { parseMidi } from "midi-file";

import { writeFumx } from "#/entities/timeline/index.ts";
import type { Written } from "#/entities/timeline/index.ts";

import { timelineOf } from "./timeline.ts";

const taggedError = Schema.TaggedError;

export class UnreadableMidi extends taggedError<
  UnreadableMidi,
  { readonly brand: unique symbol }
>()("UnreadableMidi", { message: Schema.String }, { identifier: "UnreadableMidi" }) {}

export interface MidiFile {
  readonly bytes: Uint8Array;
  readonly title: string;
}

export interface Fumx extends Written {
  readonly offGrid: number;
}

export const midiToFumx = Effect.fn("midiToFumx")(function* convert(input: MidiFile) {
  const midi = yield* Effect.try({
    try: () => parseMidi(input.bytes),
    catch: (cause) => UnreadableMidi.make({ message: String(cause) }),
  });
  if (Predicate.isUndefined(midi.header.ticksPerBeat)) {
    return yield* UnreadableMidi.make({ message: "SMPTE time division is not supported" });
  }
  const timeline = yield* Effect.sync(() => timelineOf(midi)).pipe(Effect.withSpan("timelineOf"));
  const written = yield* Effect.sync(() =>
    writeFumx({ timeline, title: Option.getOrElse(timeline.title, () => input.title) }),
  ).pipe(Effect.withSpan("writeFumx"));
  yield* Effect.annotateCurrentSpan({
    parts: written.plan.parts.length,
    bars: written.bars.length,
  });
  const fumx: Fumx = { ...written, offGrid: timeline.offGrid };
  return fumx;
});
