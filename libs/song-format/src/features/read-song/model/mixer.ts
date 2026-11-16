import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Mixer } from "#/entities/song/index.ts";
import { decibelsOf, shareOf } from "#/shared/lib/units.ts";
import { isAutomation } from "#generated/langium/ast.ts";
import type {
  Amount,
  Automation,
  Bus,
  Song as SongNode,
  Track as TrackNode,
} from "#generated/langium/ast.ts";

import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";

export type Mixable = Bus | TrackNode;

const UNITY = 0;
const CENTER = 0;

const UNIT_OF: Readonly<Record<string, string>> = { volume: "dB", pan: "%" };

export const mixerOf: From<Mixable, Mixer> = (node) => ({
  volumeDecibels: pipe(
    Option.fromNullishOr(node.volume),
    Option.match({ onNone: () => UNITY, onSome: decibelsOf }),
  ),
  pan: pipe(
    Option.fromNullishOr(node.pan),
    Option.match({ onNone: () => CENTER, onSome: shareOf }),
  ),
  muted: node.muted,
});

const parametersOf: From<Mixable, readonly string[]> = (node) => [
  ...Rec.keys(UNIT_OF),
  ...pipe(
    Option.fromNullishOr(node.fx),
    Option.match({
      onNone: () => [],
      onSome: (chain) =>
        pipe(
          chain.effects,
          Arr.map((effect) => Str.toLowerCase(effect.$type)),
          Arr.dedupe,
        ),
    }),
  ),
];

const unitProblemsOf: From<Automation, readonly Problem[]> = (automation) =>
  pipe(
    Rec.get(UNIT_OF, automation.parameter),
    Option.match({
      onNone: () => [],
      onSome: (unit) =>
        pipe(
          [
            ["from", automation.from],
            ["to", automation.to],
          ] as const,
          Arr.filter(
            ([, amount]: readonly [string, Amount]) => !Str.endsWith(unit)(String(amount.value)),
          ),
          Arr.map(([property]) =>
            problemAt(automation)(property)(`${automation.parameter} は ${unit} で書きます`),
          ),
        ),
    }),
  );

const automationProblemsOf: From<Automation, readonly Problem[]> = (automation) =>
  pipe(
    Option.fromNullishOr(automation.target.ref),
    Option.match({
      onNone: () => [],
      onSome: (target) => {
        const parameters = parametersOf(target);
        if (Arr.contains(parameters, automation.parameter)) {
          return unitProblemsOf(automation);
        }
        return [
          problemAt(automation)("parameter")(
            `${target.name} の ${automation.parameter} は自動化できません。できるのは ${Arr.join(parameters, ", ")} です`,
          ),
        ];
      },
    }),
  );

export const automationsProblemsOf: From<SongNode, readonly Problem[]> = (song) =>
  pipe(
    song.bars,
    Arr.flatMap((bar) => bar.lines),
    Arr.filter(isAutomation),
    Arr.flatMap(automationProblemsOf),
  );
