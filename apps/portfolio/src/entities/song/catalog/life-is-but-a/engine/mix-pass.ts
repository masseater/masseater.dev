import { Array as Arr, Effect } from "effect";

import form from "#/entities/song/catalog/life-is-but-a/score/form.json";

import { cutUp } from "./cuts.ts";
import { chordOf } from "./harmony.ts";
import { mastered } from "./master.ts";
import { mixedDown } from "./mixdown.ts";
import type { Rendered } from "./rendered.ts";
import { STAGES } from "./stages.ts";
import type { Pass } from "./stages.ts";

export const mixPass = Effect.fn("life.mix")(function* mixPass({ life, main, reach }: Pass) {
  yield* reach(STAGES.mixdown);
  const automation = mixedDown(life)(main);
  yield* reach(STAGES.cuts);
  cutUp({ grid: life.grid, studio: life.studio, bus: main });
  yield* reach(STAGES.master);
  const out = mastered(life)(main);
  yield* reach(STAGES.done);
  const rendered: Rendered = {
    ...out,
    automation,
    roots: Arr.makeBy(form.BARS, (bar) => chordOf(bar).root),
  };
  return rendered;
});
