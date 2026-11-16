import { Array as Arr, Match, Option, pipe } from "effect";

import { ticksOf } from "#/shared/lib/ticks.ts";
import { ratioOf } from "#/shared/lib/units.ts";
import type { Event, Rest, Sounding } from "#generated/langium/ast.ts";

import { nudgeOf } from "./attributes.ts";
import { headItemsOf } from "./heads.ts";
import type { Item, LineKind } from "./items.ts";
import { problemAt } from "./problem.ts";
import type { Combine, Compiled, From } from "./problem.ts";

const NONE = 0;
const FULL = 1;

export interface LineResult {
  readonly items: readonly Item[];
  readonly length: number;
}

export interface Scale {
  readonly times: number;
  readonly over: number;
}

export interface LineSetting {
  readonly kind: LineKind;
  readonly scale: Scale;
}

export const STRAIGHT: Scale = { times: FULL, over: FULL };

const EMPTY: Compiled<LineResult> = { value: { items: [], length: NONE }, problems: [] };

const durationOf =
  (scale: Scale): From<Sounding | Rest, Compiled<number>> =>
  (node) =>
    pipe(
      ticksOf(node.duration),
      Option.map((ticks) => (ticks * scale.over) / scale.times),
      Option.filter(Number.isInteger),
      Option.match({
        onNone: () => ({
          value: NONE,
          problems: [problemAt(node)("duration")(`${node.duration} は細かすぎて表せません`)],
        }),
        onSome: (ticks) => ({ value: ticks, problems: [] }),
      }),
    );

const append: Combine<Compiled<LineResult>> = (left, right) => ({
  value: {
    items: [
      ...left.value.items,
      ...pipe(
        right.value.items,
        Arr.map((item) => ({ ...item, offset: item.offset + left.value.length })),
      ),
    ],
    length: left.value.length + right.value.length,
  },
  problems: [...left.problems, ...right.problems],
});

const restOf =
  (scale: Scale): From<Rest, Compiled<LineResult>> =>
  (rest) => {
    const length = durationOf(scale)(rest);
    return { value: { items: [], length: length.value }, problems: length.problems };
  };

const soundingOf =
  (kind: LineKind, scale: Scale): From<Sounding, Compiled<LineResult>> =>
  (sounding) => {
    const length = durationOf(scale)(sounding);
    const items = headItemsOf({
      kind,
      placed: {
        offset: NONE,
        length: length.value,
        nudgeMilliseconds: nudgeOf(sounding.attributes),
      },
    })(sounding);
    return {
      value: { items: items.value, length: length.value },
      problems: [...length.problems, ...items.problems],
    };
  };

export const lineOf =
  ({ kind, scale }: LineSetting): From<readonly Event[], Compiled<LineResult>> =>
  (events) =>
    Arr.reduce(
      pipe(
        events,
        Arr.map((event) =>
          Match.value(event).pipe(
            Match.discriminatorsExhaustive("$type")({
              Rest: restOf(scale),
              Sounding: soundingOf(kind, scale),
              Tuplet: (tuplet) =>
                Option.match(ratioOf(tuplet.ratio), {
                  onNone: () => ({
                    value: { items: [], length: NONE },
                    problems: [
                      problemAt(tuplet)("ratio")(`${tuplet.ratio} は連符の比として読めません`),
                    ],
                  }),
                  onSome: (ratio) =>
                    lineOf({
                      kind,
                      scale: { times: scale.times * ratio.left, over: scale.over * ratio.right },
                    })(tuplet.events),
                }),
            }),
          ),
        ),
      ),
      EMPTY,
      append,
    );
