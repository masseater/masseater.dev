import { Array as Arr, HashSet, Option, Record as Rec, String as Str, pipe } from "effect";

import type { KnownTraitValue, ObservationValue } from "#/features/mcp/model/trait-analysis";

import { isActive, keyText } from "./trait-state";
import type { BatchSource, Candidates, Checked, Step, TraitState } from "./trait-state";

type Checking = Step & Readonly<{ candidates: Candidates }>;

const MIN_QUOTE_LENGTH = 4;

const normalized = (text: string): string => pipe(text, Str.replaceAll(/\s+/gu, " "), Str.trim);

const knownOf = (trait: TraitState): KnownTraitValue => ({
  ref: keyText(trait.key),
  kind: trait.kind,
  statement: trait.statement,
});

const knownTraits = ({
  traits,
  wanted,
}: Readonly<{
  traits: readonly TraitState[];
  wanted: HashSet.HashSet<string>;
}>): readonly KnownTraitValue[] =>
  pipe(
    traits,
    Arr.filter(isActive),
    Arr.filter((trait) => HashSet.has(wanted, keyText(trait.key))),
    Arr.map(knownOf),
  );

const targetOf = (observation: ObservationValue): Option.Option<string> => {
  if (observation.action === "new") {
    return Option.none();
  }
  return Option.some(observation.trait);
};

const presentTexts = (batch: readonly BatchSource[]): Readonly<Record<string, string>> =>
  Rec.fromEntries(
    pipe(
      batch,
      Arr.filter((item) => item.present),
      Arr.map((item) => [item.source.ref, normalized(item.source.text)] as const),
    ),
  );

const isCandidate =
  (candidates: Candidates, source: string) =>
  (ref: string): boolean =>
    pipe(
      Rec.get(candidates, source),
      Option.exists((refs) => Arr.contains(refs, ref)),
    );

const validIn = ({ batch, candidates }: Omit<Checking, "observations" | "traits">) => {
  const texts = presentTexts(batch);
  return (observation: ObservationValue): boolean => {
    const quote = normalized(observation.quote);
    return (
      Str.length(quote) >= MIN_QUOTE_LENGTH &&
      pipe(Rec.get(texts, observation.source), Option.exists(Str.includes(quote))) &&
      Option.match(targetOf(observation), {
        onNone: () => true,
        onSome: isCandidate(candidates, observation.source),
      })
    );
  };
};

const checkObservations = (checking: Checking): Checked => {
  const accepted = pipe(checking.observations, Arr.filter(validIn(checking)));
  return { accepted, rejected: checking.observations.length - accepted.length };
};

export { checkObservations, knownTraits };
export type { Checking };
