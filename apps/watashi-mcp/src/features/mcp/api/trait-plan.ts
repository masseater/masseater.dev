import { Array as Arr, HashSet, Match, Option, Record as Rec, pipe } from "effect";

import type { Stance } from "#/features/mcp/model/owner-trait.table";
import type { ObservationValue, TraitSourceValue } from "#/features/mcp/model/trait-analysis";

import {
  GLOBAL,
  isActive,
  isCreated,
  keyText,
  sameKey,
  supportsOf,
  updateWhere,
  withEvidence,
} from "./trait-state";
import type { BatchSource, Evidence, Plan, Step, TraitKey, TraitState } from "./trait-state";

type Drafted = Extract<ObservationValue, Readonly<{ action: "new" | "replace" }>>;

type Linked = Extract<ObservationValue, Readonly<{ action: Stance }>>;

type Placed = Readonly<{ traits: readonly TraitState[]; key: TraitKey }>;

type SourceOf = (ref: string) => Option.Option<TraitSourceValue>;

const NO_EVIDENCE = 0;

const FIELD = "\u0001";

const ITEM = "\u0002";

const sourceOf =
  (batch: readonly BatchSource[]): SourceOf =>
  (ref) =>
    pipe(
      batch,
      Arr.findFirst((item) => item.source.ref === ref),
      Option.map((item) => item.source),
    );

const sameDraft =
  (observation: Drafted) =>
  (trait: TraitState): boolean =>
    isCreated(trait) &&
    trait.kind === observation.kind &&
    trait.statement === observation.statement;

const draftScope = (observation: Drafted, evidence: Evidence): string => {
  if (observation.limited) {
    return evidence.scope;
  }
  return GLOBAL;
};

const createdFrom = (observation: Drafted, evidence: Evidence, index: number): TraitState => ({
  key: { created: index },
  kind: observation.kind,
  scope: draftScope(observation, evidence),
  statement: observation.statement,
  why: observation.why,
  status: "active",
  supersededBy: Option.none(),
  evidence: [evidence],
});

const placeDraft =
  (observation: Drafted, evidence: Evidence) =>
  (traits: readonly TraitState[]): Placed =>
    Option.match(Arr.findFirst(traits, sameDraft(observation)), {
      onSome: (found) => ({
        traits: updateWhere({ matches: sameKey(found.key), change: withEvidence(evidence) })(
          traits,
        ),
        key: found.key,
      }),
      onNone: () => {
        const created = createdFrom(observation, evidence, traits.length);
        return { traits: [...traits, created], key: created.key };
      },
    });

const supersede =
  (ref: string, placed: Placed) =>
  (trait: TraitState): TraitState =>
    Option.match(
      Option.liftPredicate(trait, (item) => keyText(item.key) === ref),
      {
        onNone: () => trait,
        onSome: (replaced) => ({
          ...replaced,
          status: "superseded",
          supersededBy: Option.some(placed.key),
        }),
      },
    );

const evidenceOf =
  (source: SourceOf) =>
  (observation: ObservationValue): Evidence => {
    const found = source(observation.source);
    return {
      source: observation.source,
      quote: observation.quote,
      stance: Match.value(observation.action).pipe(
        Match.when("contradicts", (): Stance => "contradicts"),
        Match.orElse((): Stance => "supports"),
      ),
      scope: Option.match(found, { onNone: () => GLOBAL, onSome: (item) => item.scope }),
      observedAt: Option.match(found, { onNone: () => "", onSome: (item) => item.at }),
    };
  };

const applyObservation =
  (source: SourceOf) =>
  (traits: readonly TraitState[], observation: ObservationValue): readonly TraitState[] => {
    const evidence = evidenceOf(source)(observation);
    return Match.value(observation).pipe(
      Match.when({ action: "new" }, (drafted) => placeDraft(drafted, evidence)(traits).traits),
      Match.when({ action: "replace" }, (drafted) => {
        const placed = placeDraft(drafted, evidence)(traits);
        return pipe(placed.traits, Arr.map(supersede(drafted.trait, placed)));
      }),
      Match.orElse((linked: Linked) =>
        updateWhere({
          matches: (trait) => keyText(trait.key) === linked.trait,
          change: withEvidence(evidence),
        })(traits),
      ),
    );
  };

const withoutSources =
  (sources: HashSet.HashSet<string>) =>
  (trait: TraitState): TraitState => ({
    ...trait,
    evidence: pipe(
      trait.evidence,
      Arr.filter((item) => !HashSet.has(sources, item.source)),
    ),
  });

const retractUnsupported = (trait: TraitState): TraitState => {
  if (isActive(trait) && supportsOf(trait).length === NO_EVIDENCE) {
    return { ...trait, status: "retracted" };
  }
  return trait;
};

const rescoped = (trait: TraitState): TraitState => {
  const elsewhere = pipe(
    supportsOf(trait),
    Arr.some((item) => item.scope !== GLOBAL && item.scope !== trait.scope),
  );
  if (trait.scope !== GLOBAL && elsewhere) {
    return { ...trait, scope: GLOBAL };
  }
  return trait;
};

const evidenceText = (item: Evidence): string =>
  pipe([item.source, item.quote, item.stance, item.scope, item.observedAt], Arr.join(FIELD));

const stateText = (trait: TraitState): string =>
  pipe(
    [
      trait.kind,
      trait.scope,
      trait.statement,
      trait.why,
      trait.status,
      Option.match(trait.supersededBy, { onNone: () => "", onSome: keyText }),
      pipe(trait.evidence, Arr.map(evidenceText), Arr.join(ITEM)),
    ],
    Arr.join(FIELD),
  );

const changedFrom = (traits: readonly TraitState[]): ((trait: TraitState) => boolean) => {
  const before = Rec.fromEntries(
    pipe(
      traits,
      Arr.map((trait) => [keyText(trait.key), stateText(trait)] as const),
    ),
  );
  return (trait: TraitState): boolean =>
    Option.match(Rec.get(before, keyText(trait.key)), {
      onNone: () => true,
      onSome: (text) => text !== stateText(trait),
    });
};

const activeKeys = (traits: readonly TraitState[]): HashSet.HashSet<string> =>
  HashSet.fromIterable(
    pipe(
      traits,
      Arr.filter(isActive),
      Arr.map((trait) => keyText(trait.key)),
    ),
  );

const planTraits = ({ traits, batch, observations }: Step): Plan => {
  const sources = HashSet.fromIterable(
    pipe(
      batch,
      Arr.map((item) => item.source.ref),
    ),
  );
  const cleared = pipe(traits, Arr.map(withoutSources(sources)));
  const observed = Arr.reduce(observations, cleared, applyObservation(sourceOf(batch)));
  const touched = pipe(
    observed,
    Arr.map(retractUnsupported),
    Arr.map(rescoped),
    Arr.filter(changedFrom(traits)),
  );
  const wasActive = activeKeys(traits);
  return {
    touched,
    created: pipe(touched, Arr.filter(isCreated)).length,
    retracted: pipe(
      touched,
      Arr.filter(
        (trait) => trait.status === "retracted" && HashSet.has(wasActive, keyText(trait.key)),
      ),
    ).length,
  };
};

export { planTraits };
