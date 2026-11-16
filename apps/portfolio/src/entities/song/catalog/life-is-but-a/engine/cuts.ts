import { Match, Schema } from "effect";

import automation from "#/entities/song/catalog/life-is-but-a/score/automation.json";
import type { Bus } from "#/entities/song/lib/studio/bus.ts";
import { fieldOf } from "#/entities/song/lib/studio/field.ts";
import { mute } from "#/entities/song/lib/studio/mute.ts";
import { scoreOf } from "#/entities/song/lib/studio/score.ts";
import type { Studio } from "#/entities/song/lib/studio/studio.ts";
import type { Grid } from "#/entities/song/lib/studio/timing.ts";

const { Finite } = Schema;
const Place = Schema.Struct({ bar: Finite, step: Finite });

const CutSchema = Schema.Union([
  Schema.Struct({ edit: Schema.Literal("mute"), from: Place, to: Place, fade: Finite }),
  Schema.Struct({ edit: Schema.Literal("tapeStop"), from: Place, to: Place, endRate: Finite }),
  Schema.Struct({
    edit: Schema.Literal("repeat"),
    at: Place,
    sixteenths: Finite,
    count: Finite,
    pitch: Schema.optionalKey(Finite),
  }),
  Schema.Struct({ edit: Schema.Literal("reverse"), at: Place, sixteenths: Finite }),
  Schema.Struct({
    edit: Schema.Literal("tail"),
    at: Place,
    after: Finite,
    seconds: Finite,
    fade: Finite,
  }),
]);

type Cut = typeof CutSchema.Type;
type Placed = typeof Place.Type;

const CUTS = scoreOf(Schema.Array(CutSchema))("edits", automation.edits);

export interface Cutting {
  readonly grid: Grid;
  readonly studio: Studio;
  readonly bus: Bus;
}

const spanOf = (
  grid: Grid,
  from: Placed,
  to: Placed,
): Readonly<{ time: number; seconds: number }> => {
  const time = grid.at(from.bar, from.step);
  return { time, seconds: grid.at(to.bar, to.step) - time };
};

const cutterOf = ({ grid, studio, bus }: Cutting): ((cut: Cut) => void) =>
  Match.type<Cut>().pipe(
    Match.discriminatorsExhaustive("edit")({
      mute: ({ from, to, fade }) => {
        mute(studio.desk)({ bus, ...spanOf(grid, from, to), fade });
      },
      tapeStop: ({ from, to, endRate }) => {
        studio.tapeStop({ bus, ...spanOf(grid, from, to), endRate });
      },
      repeat: ({ at, sixteenths, count, pitch }) => {
        studio.repeat({
          bus,
          time: grid.at(at.bar, at.step),
          seconds: grid.sixteenth * sixteenths,
          count,
          ...fieldOf("pitch")(pitch),
        });
      },
      reverse: ({ at, sixteenths }) => {
        studio.reverse({
          bus,
          time: grid.at(at.bar, at.step),
          seconds: grid.sixteenth * sixteenths,
        });
      },
      tail: ({ at, after, seconds, fade }) => {
        mute(studio.desk)({ bus, time: grid.at(at.bar, at.step) + after, seconds, fade });
      },
    }),
  );

export const cutUp = (cutting: Cutting): void => {
  const cut = cutterOf(cutting);
  for (const edit of CUTS) {
    cut(edit);
  }
};
