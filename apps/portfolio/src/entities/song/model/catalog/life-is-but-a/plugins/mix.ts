import type { MixPlugin, MixRequest } from "@masseater.dev/fumx-studio/plugin/plugin";
import { breathe } from "@masseater.dev/fumx-studio/studio/breathe";
import { Effect } from "effect";

import { masterPass, returnPass } from "./mix/finish.ts";
import { lifeOf } from "./mix/life.ts";
import { melodyPass, rhythmPass } from "./mix/passes.ts";

const PROGRESS = {
  rhythm: 0.1,
  melody: 0.4,
  returns: 0.7,
  master: 0.9,
} as const;

const reached =
  (request: MixRequest) =>
  (label: keyof typeof PROGRESS): Effect.Effect<void> =>
    Effect.andThen(
      Effect.sync(() => {
        request.progress(PROGRESS[label], label);
      }),
      breathe,
    );

const mixed = Effect.fn("life.mix")(function* mixed(request: MixRequest) {
  const reach = reached(request);
  const session = lifeOf(request);
  const pass = { session, main: session.life.studio.bus({}) };
  yield* reach("rhythm");
  const duck = rhythmPass(pass);
  yield* Effect.andThen(
    reach("melody"),
    Effect.sync(() => {
      melodyPass(pass)(duck);
    }),
  );
  yield* Effect.andThen(
    reach("returns"),
    Effect.sync(() => {
      returnPass(pass)(duck);
    }),
  );
  yield* reach("master");
  return masterPass(pass);
});

export const plugin: MixPlugin = { kind: "mix", mix: mixed };
