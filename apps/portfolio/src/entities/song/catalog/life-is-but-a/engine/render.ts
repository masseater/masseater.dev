import { reached } from "@masseater.dev/fumx-studio/studio/breathe";
import type { Progressing } from "@masseater.dev/fumx-studio/studio/breathe";
import type { Ledger } from "@masseater.dev/fumx-studio/studio/placement";
import { Effect } from "effect";
import type { Option } from "effect";

import type { SampleTableEntry, Sink } from "./context.ts";
import { lifeOf } from "./life.ts";
import { melodyPass } from "./melody-pass.ts";
import { mixPass } from "./mix-pass.ts";
import { returnPass } from "./return-pass.ts";
import { rhythmPass } from "./rhythm-pass.ts";

export interface Rendering {
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly table: Readonly<Record<string, SampleTableEntry>>;
  readonly log: Option.Option<Ledger>;
  readonly tape: Option.Option<Sink>;
  readonly progress: Progressing;
}

export const render = Effect.fn("life.render")(function* render({ progress, ...setup }: Rendering) {
  const life = lifeOf(setup);
  const pass = { life, main: life.studio.bus({}), reach: reached(progress) };
  const duck = yield* rhythmPass(pass);
  yield* melodyPass({ ...pass, duck });
  yield* returnPass({ ...pass, duck });
  return yield* mixPass(pass);
});
