import { settled, settledAs } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { MarkSchema } from "@masseater.dev/shirushi-protocol";
import type { Mark, MarkInput } from "@masseater.dev/shirushi-protocol";
import { Effect, Option, Schema } from "effect";

import { commands } from "./generated/bindings.ts";

/** @internal */
export const fetchMarks: Effect.Effect<readonly Mark[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(MarkSchema)),
)(() => commands.listMarks());

/** @internal */
export const postMark =
  (still: Option.Option<string>) =>
  (input: MarkInput): Effect.Effect<void, ApiFailed> =>
    settled(() =>
      commands.saveMark(
        {
          ...input,
          song: { ...input.song, source: { ...input.song.source } },
          aspects: [...input.aspects],
        },
        Option.getOrNull(still),
      ),
    ).pipe(Effect.asVoid);

/** @internal */
export const deleteMark = (id: string): Effect.Effect<void, ApiFailed> =>
  settled(() => commands.removeMark(id)).pipe(Effect.asVoid);

/** @internal */
export const fetchStill = (id: string): Effect.Effect<Option.Option<string>, ApiFailed> =>
  settled(() => commands.getStill(id)).pipe(Effect.map(Option.fromNullishOr));
