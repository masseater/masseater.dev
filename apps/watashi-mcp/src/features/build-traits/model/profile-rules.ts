import { Array as Arr, Number as Num, Option, Record as Rec, String as Str, pipe } from "effect";

import type { MergedValue, Rule, TraitInput } from "./profile-outline.ts";

const FIRST_ID = 1;

const NONE = 0;

type MergedRule = MergedValue["rules"][number];

type Weights = Readonly<Record<string, number>>;

type Seen = readonly number[];

type Claimed = Readonly<Omit<Rule, "id">>;

const weightOf =
  (weights: Weights) =>
  (refs: readonly number[]): number =>
    pipe(
      refs,
      Arr.map((ref) =>
        pipe(
          Rec.get(weights, String(ref)),
          Option.getOrElse(() => NONE),
        ),
      ),
      Num.sumAll,
    );

const isFresh =
  (weights: Weights, seen: Seen) =>
  (ref: number): boolean =>
    Rec.has(weights, String(ref)) && !pipe(seen, Arr.contains(ref));

const claim =
  (weights: Weights) =>
  (seen: Seen, rule: MergedRule): readonly [Seen, Option.Option<Claimed>] => {
    const refs = pipe(rule.refs, Arr.dedupe, Arr.filter(isFresh(weights, seen)));
    if (!Arr.isReadonlyArrayNonEmpty(refs)) {
      return [seen, Option.none()];
    }
    const claimed: Claimed = {
      section: rule.section,
      repo: Str.trim(rule.repo),
      rule: rule.rule,
      refs,
      weight: weightOf(weights)(refs),
    };
    return [[...seen, ...refs], Option.some(claimed)];
  };

const weightsOf = (traits: readonly TraitInput[]): Weights =>
  Rec.fromEntries(
    pipe(
      traits,
      Arr.map((trait) => [String(trait.ref), trait.supports - trait.contradicts] as const),
    ),
  );

const UNSEEN: Seen = [];

export const rulesOf = ({
  merged,
  traits,
}: Readonly<{ merged: MergedValue; traits: readonly TraitInput[] }>): readonly Rule[] => {
  const claimFrom = claim(weightsOf(traits));
  const [, claimed] = pipe(merged.rules, Arr.mapAccum(UNSEEN, claimFrom));
  return pipe(
    claimed,
    Arr.getSomes,
    Arr.map((rule, index) => ({ id: index + FIRST_ID, ...rule })),
  );
};

export const ruleKey = (id: number): string => `R${String(id)}`;

export type EditRule = Readonly<Omit<Rule, "refs" | "id"> & { id: string }>;

export const editInputOf = (rules: readonly Rule[]): readonly EditRule[] =>
  pipe(
    rules,
    Arr.map(({ id, section, repo, rule, weight }) => ({
      id: ruleKey(id),
      section,
      repo,
      rule,
      weight,
    })),
  );
