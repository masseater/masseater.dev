import { Effect, Option } from "effect";

import { SONG } from "./fixture.test.support.ts";
import type { RenderSession, Rendered, Song } from "./index.ts";

export interface PendingFixture {
  readonly song: Song;
  readonly rendering: () => boolean;
  readonly aborted: () => boolean;
}

export const pendingFixtureOf = (): PendingFixture => {
  const asked = { signal: Option.none<AbortSignal>() };
  const render = (session: RenderSession): Promise<Rendered> => {
    asked.signal = Option.some(session.signal);
    return Effect.runPromise(Effect.never);
  };
  return {
    song: { ...SONG, samples: {}, render },
    rendering: () => Option.isSome(asked.signal),
    aborted: () => Option.exists(asked.signal, (signal) => signal.aborted),
  };
};
