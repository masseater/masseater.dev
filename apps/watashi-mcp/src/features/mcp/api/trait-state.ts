import { Array as Arr, Option, pipe } from "effect";

import type { Stance, TraitKind, TraitStatus } from "#/features/mcp/model/owner-trait.table";
import type { ObservationValue, TraitSourceValue } from "#/features/mcp/model/trait-analysis";

type Evidence = Readonly<{
  source: string;
  quote: string;
  stance: Stance;
  scope: string;
  observedAt: string;
}>;

type TraitKey = Readonly<{ existing: number }> | Readonly<{ created: number }>;

type TraitState = Readonly<{
  key: TraitKey;
  kind: TraitKind;
  scope: string;
  statement: string;
  why: string;
  status: TraitStatus;
  supersededBy: Option.Option<TraitKey>;
  evidence: readonly Evidence[];
}>;

type BatchSource = Readonly<{ source: TraitSourceValue; present: boolean }>;

type Checked = Readonly<{ accepted: readonly ObservationValue[]; rejected: number }>;

type Plan = Readonly<{ touched: readonly TraitState[]; created: number; retracted: number }>;

type Candidates = Readonly<Record<string, readonly string[]>>;

type Step = Readonly<{
  traits: readonly TraitState[];
  batch: readonly BatchSource[];
  observations: readonly ObservationValue[];
}>;

const TRAIT_PREFIX = "owner_trait:";

const GLOBAL = "global";

const traitRefOf = (id: number): string => `${TRAIT_PREFIX}${id}`;

const keyText = (key: TraitKey): string => {
  if ("existing" in key) {
    return traitRefOf(key.existing);
  }
  return `new:${key.created}`;
};

const isActive = (trait: TraitState): boolean => trait.status === "active";

const isCreated = (trait: TraitState): boolean => "created" in trait.key;

const supportsOf = (trait: TraitState): readonly Evidence[] =>
  pipe(
    trait.evidence,
    Arr.filter((item) => item.stance === "supports"),
  );

const sameKey =
  (key: TraitKey) =>
  (trait: TraitState): boolean =>
    keyText(trait.key) === keyText(key);

const updateWhere =
  ({
    matches,
    change,
  }: Readonly<{
    matches: (trait: TraitState) => boolean;
    change: (trait: TraitState) => TraitState;
  }>) =>
  (traits: readonly TraitState[]): readonly TraitState[] =>
    pipe(
      traits,
      Arr.map((trait) =>
        Option.match(Option.liftPredicate(trait, matches), {
          onNone: () => trait,
          onSome: change,
        }),
      ),
    );

const withEvidence =
  (evidence: Evidence) =>
  (trait: TraitState): TraitState => ({
    ...trait,
    evidence: [
      ...pipe(
        trait.evidence,
        Arr.filter((item) => item.source !== evidence.source),
      ),
      evidence,
    ],
  });

export {
  GLOBAL,
  TRAIT_PREFIX,
  isActive,
  isCreated,
  keyText,
  traitRefOf,
  sameKey,
  supportsOf,
  updateWhere,
  withEvidence,
};
export type { BatchSource, Candidates, Checked, Evidence, Plan, Step, TraitKey, TraitState };
