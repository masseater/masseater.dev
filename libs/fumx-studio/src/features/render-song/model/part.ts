import type { Song } from "@r_masseater/fumx-parser";
import { Effect } from "effect";

import type { Session } from "./context.ts";
import { contextOf } from "./render.ts";
import { pluggedPart } from "./request.ts";
import { Unplayable } from "./unplayable.ts";

export const renderPart = Effect.fn("fumx.part")(function* renderPart(
  song: Song,
  session: Session,
  key: string,
) {
  const use = yield* Effect.mapError(Effect.fromOption(song.mix), () =>
    Unplayable.make({ part: `part ${key}` }),
  );
  return yield* pluggedPart(contextOf(song)(session))(use)(key);
});
