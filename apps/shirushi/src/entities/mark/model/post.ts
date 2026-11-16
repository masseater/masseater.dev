import type { Opened } from "@masseater.dev/media-notes-protocol";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import type { MarkInput } from "@masseater.dev/shirushi-protocol";
import { Effect } from "effect";

import { postMark } from "#/shared/api/index.ts";
import { stillOf } from "#/shared/lib/index.ts";

/** @internal */
export const posted =
  (opened: Opened) =>
  (input: MarkInput): Effect.Effect<void, ApiFailed> =>
    stillOf(input)(opened).pipe(Effect.flatMap((still) => postMark(still)(input)));
