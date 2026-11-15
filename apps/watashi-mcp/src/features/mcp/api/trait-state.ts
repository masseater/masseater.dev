import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type {
  OwnerTraitJa,
  Stance,
  TraitKind,
  TraitStatus,
} from "#/features/mcp/model/owner-trait.table";
import type { ObservationValue, TraitSourceValue } from "#/features/mcp/model/trait-analysis";

export type Evidence = Readonly<{
  source: string;
  quote: string;
  stance: Stance;
  scope: string;
  observedAt: string;
}>;

export type TraitKey = Readonly<{ existing: number }> | Readonly<{ created: number }>;

export type TraitState = Readonly<{
  key: TraitKey;
  kind: TraitKind;
  scope: string;
  statement: string;
  why: string;
  status: TraitStatus;
  supersededBy: Option.Option<TraitKey>;
  evidence: readonly Evidence[];
}>;

export type BatchSource = Readonly<{ source: TraitSourceValue; present: boolean }>;

export type Checked = Readonly<{ accepted: readonly ObservationValue[]; rejected: number }>;

export type Plan = Readonly<{ touched: readonly TraitState[]; created: number; retracted: number }>;

export type Candidates = Readonly<Record<string, readonly string[]>>;

export type Step = Readonly<{
  traits: readonly TraitState[];
  batch: readonly BatchSource[];
  observations: readonly ObservationValue[];
}>;

export type Japanese = Readonly<{ statement: string; why: string }>;

export type JaRows = Readonly<Record<string, OwnerTraitJa>>;

export const TRAIT_PREFIX = "owner_trait:";

export const GLOBAL = "global";

export const traitRefOf = (id: number): string => `${TRAIT_PREFIX}${id}`;

export const keyText = (key: TraitKey): string => {
  if ("existing" in key) {
    return traitRefOf(key.existing);
  }
  return `new:${key.created}`;
};

export const isActive = (trait: TraitState): boolean => trait.status === "active";

export const idOf = (trait: TraitState): Option.Option<number> => {
  if ("existing" in trait.key) {
    return Option.some(trait.key.existing);
  }
  return Option.none();
};

export const japaneseOf =
  (rows: JaRows) =>
  (trait: TraitState): Option.Option<Japanese> =>
    pipe(
      idOf(trait),
      Option.flatMap((id) => Rec.get(rows, String(id))),
      Option.filter(
        (row) => row.sourceStatement === trait.statement && row.sourceWhy === trait.why,
      ),
      Option.map((row) => ({ statement: row.statement, why: row.why })),
    );

export const isCreated = (trait: TraitState): boolean => "created" in trait.key;

export const supportsOf = (trait: TraitState): readonly Evidence[] =>
  pipe(
    trait.evidence,
    Arr.filter((item) => item.stance === "supports"),
  );

export const sameKey =
  (key: TraitKey) =>
  (trait: TraitState): boolean =>
    keyText(trait.key) === keyText(key);

export const updateWhere =
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

export const withEvidence =
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
