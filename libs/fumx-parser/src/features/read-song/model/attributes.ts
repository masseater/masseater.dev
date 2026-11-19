import { Array as Arr, Option, pipe } from "effect";
import type { AstNode } from "langium";

import type { Edit, Lyric, PlayParam } from "#/entities/song/index.ts";
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
  isReleaseVelocity,
  isTie,
  isVelocity,
} from "#generated/langium/ast.ts";
import type { Attribute } from "#generated/langium/ast.ts";

import type { NoteFields } from "./items.ts";
import { playParamOf } from "./params.ts";
import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";

export type Attributes = readonly Attribute[];

const FULL = 1;
const NONE = 0;

export const velocityOf: From<Attributes, number> = (attributes) =>
  Option.match(Arr.findFirst(attributes, isVelocity), {
    onNone: () => FULL,
    onSome: (velocity) => velocity.value ?? FULL,
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
  isReleaseVelocity(attribute) ||
  isLyric(attribute) ||
  isBend(attribute) ||
  isGateLength(attribute) ||
  isArticulation(attribute);

const isEditOnly: From<Attribute, boolean> = (attribute) => isEvery(attribute) || isFade(attribute);

const isAbove = (low: number, value: number): boolean => value > low && value <= FULL;
const isWithin = (low: number, value: number): boolean => value >= low && value <= FULL;

const rangeProblemOf: From<Attribute, Option.Option<Problem>> = (attribute) => {
  if (
    isVelocity(attribute) &&
    Option.exists(Option.fromUndefinedOr(attribute.value), (value) => !isAbove(NONE, value))
  ) {
    return Option.some(problemAt(attribute)("value")("vel は 0 より大きく 1 以下で書きます"));
  }
  if (isReleaseVelocity(attribute) && !isWithin(NONE, attribute.value)) {
    return Option.some(problemAt(attribute)("value")("off は 0 から 1 で書きます"));
  }
  if (isGateLength(attribute) && !isAbove(NONE, shareOf(attribute.amount))) {
    return Option.some(problemAt(attribute)("amount")("gate は 0% より大きく 100% 以下で書きます"));
  }
  return Option.none();
};

const misplacedOf =
  (allowed: From<Attribute, boolean>, what: string): From<Attributes, readonly Problem[]> =>
  (attributes) => [
    ...pipe(
      attributes,
      Arr.filter((attribute) => !allowed(attribute)),
      Arr.map((attribute) => problemAt(attribute)("$type")(`${what}にはこの指定を書けません`)),
    ),
    ...pipe(attributes, Arr.map(rangeProblemOf), Arr.getSomes),
  ];

export const misplacedOnNote = misplacedOf((attribute) => !isEditOnly(attribute), "音符");

export const misplacedOnSound = misplacedOf(
  (attribute) => !isNoteOnly(attribute) && !isEditOnly(attribute),
  "この音",
);

export const misplacedOnHit = misplacedOf(
  (attribute) =>
    isTie(attribute) ||
    isReleaseVelocity(attribute) ||
    (!isNoteOnly(attribute) && !isEditOnly(attribute)),
  "この音",
);

export const releaseVelocityOf: From<Attributes, Option.Option<number>> = (attributes) =>
  pipe(
    Arr.findFirst(attributes, isReleaseVelocity),
    Option.map((node) => node.value),
  );

export const tieOf: From<Attributes, Option.Option<AstNode>> = (attributes) =>
  Arr.findFirst(attributes, isTie);

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
  releaseVelocity: releaseVelocityOf(attributes),
  gate: gateOf(attributes),
  articulation: pipe(
    Arr.findFirst(attributes, isArticulation),
    Option.map((node) => node.kind),
  ),
  lyric: lyricOf(attributes),
  bend: bendOf(attributes),
  params: paramsOf(attributes),
  tie: tieOf(attributes),
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
