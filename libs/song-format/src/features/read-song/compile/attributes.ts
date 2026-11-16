import { Array as Arr, Option, pipe } from "effect";

import type { Edit, Lyric } from "#/entities/song/events.ts";
import type { PlayParam } from "#/entities/song/sound.ts";
import { ticksOf } from "#/shared/lib/ticks.ts";
import { countOf, millisecondsOf, semitonesOf, shareOf } from "#/shared/lib/units.ts";
import {
  isArticulation,
  isBend,
  isEvery,
  isFade,
  isGateLength,
  isLyric,
  isNudge,
  isPlayParam,
  isTie,
  isVelocity,
} from "#generated/langium/ast.ts";
import type { Attribute } from "#generated/langium/ast.ts";

import type { NoteFields } from "./items.ts";
import { playParamOf } from "./params.ts";
import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";

type Attributes = readonly Attribute[];

const FULL = 1;
const NONE = 0;

export const velocityOf: From<Attributes, number> = (attributes) =>
  Option.match(Arr.findFirst(attributes, isVelocity), {
    onNone: () => FULL,
    onSome: (velocity) => velocity.value,
  });

export const nudgeOf: From<Attributes, number> = (attributes) =>
  Option.match(Arr.findFirst(attributes, isNudge), {
    onNone: () => NONE,
    onSome: (nudge) => millisecondsOf(nudge.time),
  });

export const paramsOf: From<Attributes, readonly PlayParam[]> = (attributes) =>
  pipe(attributes, Arr.filter(isPlayParam), Arr.map(playParamOf));

const isNoteOnly: From<Attribute, boolean> = (attribute) =>
  isTie(attribute) ||
  isLyric(attribute) ||
  isBend(attribute) ||
  isGateLength(attribute) ||
  isArticulation(attribute);

const isEditOnly: From<Attribute, boolean> = (attribute) => isEvery(attribute) || isFade(attribute);

const misplacedOf =
  (allowed: From<Attribute, boolean>, what: string): From<Attributes, readonly Problem[]> =>
  (attributes) =>
    pipe(
      attributes,
      Arr.filter((attribute) => !allowed(attribute)),
      Arr.map((attribute) => problemAt(attribute)("$type")(`${what}にはこの指定を書けません`)),
    );

export const misplacedOnNote = misplacedOf((attribute) => !isEditOnly(attribute), "音符");

export const misplacedOnSound = misplacedOf(
  (attribute) => !isNoteOnly(attribute) && !isEditOnly(attribute),
  "この音",
);

export const misplacedOnEdit = misplacedOf(
  (attribute) => isEditOnly(attribute) || isNudge(attribute),
  "編集",
);

const lyricOf: From<Attributes, Option.Option<Lyric>> = (attributes) =>
  pipe(
    Arr.findFirst(attributes, isLyric),
    Option.map((node): Lyric => {
      if (node.melisma) {
        return { kind: "melisma" };
      }
      return { kind: "syllable", text: node.text ?? "" };
    }),
  );

const gateOf: From<Attributes, number> = (attributes) =>
  Option.match(Arr.findFirst(attributes, isGateLength), {
    onNone: () => FULL,
    onSome: (gate) => shareOf(gate.amount),
  });

const bendOf: From<Attributes, NoteFields["bend"]> = (attributes) =>
  Option.match(Arr.findFirst(attributes, isBend), {
    onNone: () => [],
    onSome: (bend) =>
      pipe(
        bend.points,
        Arr.map((point) => ({
          milliseconds: millisecondsOf(point.at),
          semitones: semitonesOf(point.amount),
        })),
      ),
  });

export const noteFieldsOf: From<Attributes, NoteFields> = (attributes) => ({
  velocity: velocityOf(attributes),
  gate: gateOf(attributes),
  articulation: pipe(
    Arr.findFirst(attributes, isArticulation),
    Option.map((node) => node.kind),
  ),
  lyric: lyricOf(attributes),
  bend: bendOf(attributes),
  params: paramsOf(attributes),
  tie: Arr.findFirst(attributes, isTie),
});

export const everyOf: From<Attributes, Edit["every"]> = (attributes) =>
  pipe(
    Arr.findFirst(attributes, isEvery),
    Option.flatMap((every) =>
      pipe(
        ticksOf(every.slice),
        Option.map((ticks) => ({
          ticks,
          count: pipe(Option.fromNullishOr(every.count), Option.map(countOf)),
        })),
      ),
    ),
  );

export const fadeOf: From<Attributes, Edit["fadeMilliseconds"]> = (attributes) =>
  pipe(
    Arr.findFirst(attributes, isFade),
    Option.map((fade) => millisecondsOf(fade.time)),
  );
