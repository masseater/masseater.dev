import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type {
  OwnerTraitJa,
  Stance,
  TraitKind,
  TraitStatus,
} from "#/features/mcp/model/owner-trait.table";
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

type Japanese = Readonly<{ statement: string; why: string }>;

type JaRows = Readonly<Record<string, OwnerTraitJa>>;

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

const idOf = (trait: TraitState): Option.Option<number> => {
  if ("existing" in trait.key) {
    return Option.some(trait.key.existing);
  }
  return Option.none();
};

const japaneseOf =
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
  idOf,
  isActive,
  isCreated,
  japaneseOf,
  keyText,
  traitRefOf,
  sameKey,
  supportsOf,
  updateWhere,
  withEvidence,
};
export type {
  BatchSource,
  Candidates,
  Checked,
  Evidence,
  JaRows,
  Japanese,
  Plan,
  Step,
  TraitKey,
  TraitState,
};
