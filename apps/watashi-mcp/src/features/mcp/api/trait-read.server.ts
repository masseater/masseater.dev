import {
  Array as Arr,
  Effect,
  HashSet,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import { TRAIT_KINDS } from "#/features/mcp/model/owner-trait.table";
import { RecordNotFound } from "#/features/mcp/model/record-not-found";
import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { listHistory } from "./history-store.server";
import type { HistoryEntry } from "./history-store.server";
import type { Body } from "./life-record";
import { timeOut } from "./life-time";
import { GLOBAL, TRAIT_PREFIX, isActive, keyText } from "./trait-state";
import type { Evidence, TraitState } from "./trait-state";
import { loadTraitVectors, loadTraits } from "./trait-store.server";
import { relatedTo } from "./trait-vector";
import type { Vector } from "./trait-vector";

const HISTORY_LIMIT = 100;

const STORE = "memory";

const NONE = 0;

const TRAIT_REF = new RegExp(`^${TRAIT_PREFIX}(?<id>\\d+)$`, "u");

const fieldOf = <Value>(key: string, value: Option.Option<Value>): Body =>
  Option.match(value, { onNone: () => ({}), onSome: (present) => ({ [key]: present }) });

const textField = (key: string, value: string): Body =>
  fieldOf(key, Option.liftPredicate(value, Str.isNonEmpty));

const countOf =
  (stance: Evidence["stance"]) =>
  (trait: TraitState): number =>
    pipe(
      trait.evidence,
      Arr.filter((item) => item.stance === stance),
    ).length;

const lastSeenOf = (trait: TraitState): Option.Option<string> =>
  pipe(
    trait.evidence,
    Arr.map((item) => item.observedAt),
    Arr.filter(Str.isNonEmpty),
    Arr.sortWith((at: string) => at, Order.String),
    Arr.last,
  );

const summaryOf = (trait: TraitState): Body => ({
  ref: keyText(trait.key),
  store: STORE,
  scope: trait.scope,
  statement: trait.statement,
  ...textField("why", trait.why),
  supports: countOf("supports")(trait),
  ...fieldOf(
    "contradicts",
    Option.liftPredicate(countOf("contradicts")(trait), (count) => count > NONE),
  ),
  ...fieldOf("lastSeen", pipe(lastSeenOf(trait), Option.map(timeOut))),
});

const inScope =
  (scope: Option.Option<string>) =>
  (trait: TraitState): boolean =>
    Option.match(scope, {
      onNone: () => true,
      onSome: (wanted) => trait.scope === GLOBAL || trait.scope === wanted,
    });

const ofKind =
  (active: readonly TraitState[]) =>
  (kind: TraitState["kind"]): readonly [string, readonly Body[]] => [
    kind,
    pipe(
      active,
      Arr.filter((trait) => trait.kind === kind),
      Arr.map(summaryOf),
    ),
  ];

type Wanted = Readonly<{ scope: Option.Option<string>; topic: Option.Option<Vector> }>;

const inTopic =
  (related: Option.Option<HashSet.HashSet<string>>) =>
  (trait: TraitState): boolean =>
    Option.match(related, {
      onNone: () => true,
      onSome: (refs) => HashSet.has(refs, keyText(trait.key)),
    });

const grouped = (
  { scope }: Wanted,
  traits: readonly TraitState[],
  related: Option.Option<HashSet.HashSet<string>>,
): Readonly<Record<string, readonly Body[]>> => {
  const active = pipe(
    traits,
    Arr.filter(isActive),
    Arr.filter(inScope(scope)),
    Arr.filter(inTopic(related)),
    Arr.sortWith(countOf("supports"), Order.flip(Order.Number)),
  );
  return pipe(
    TRAIT_KINDS,
    Arr.map(ofKind(active)),
    Arr.filter(([, items]) => Arr.isReadonlyArrayNonEmpty(items)),
    Rec.fromEntries,
  );
};

const relatedOf = (
  traits: readonly TraitState[],
  topic: Option.Option<Vector>,
): Effect.Effect<Option.Option<HashSet.HashSet<string>>, StoreFailure> =>
  Option.match(topic, {
    onNone: () => Effect.succeedNone,
    onSome: (vector) =>
      loadTraitVectors.pipe(
        Effect.map((vectors) => Option.some(relatedTo({ traits, vectors, vector }))),
      ),
  });

const profileTraits = (
  wanted: Wanted,
): Effect.Effect<Readonly<Record<string, readonly Body[]>>, StoreFailure> =>
  Effect.gen(function* traitsOfOwner() {
    const traits = yield* loadTraits;
    const related = yield* relatedOf(traits, wanted.topic);
    return grouped(wanted, traits, related);
  });

const evidenceItem = (item: Evidence): Body => ({
  source: item.source,
  stance: item.stance,
  quote: item.quote,
  ...fieldOf(
    "at",
    pipe(Option.liftPredicate(item.observedAt, Str.isNonEmpty), Option.map(timeOut)),
  ),
});

const revisionItem = (entry: HistoryEntry): Body => ({
  rev: entry.rev,
  op: entry.op,
  actor: entry.actor,
  at: timeOut(entry.at),
});

const idOf = (ref: string): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(TRAIT_REF.exec(ref)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap((groups) => Rec.get(groups, "id")),
    Option.map(Number),
  );

const missing = (ref: string) => (): RecordNotFound => RecordNotFound.make({ ref });

const traitDetail = (ref: string): Effect.Effect<Body, StoreFailure> =>
  Effect.gen(function* readTraitDetail() {
    const id = yield* Effect.fromOption(idOf(ref)).pipe(Effect.mapError(missing(ref)));
    const traits = yield* loadTraits;
    const trait = yield* Effect.fromOption(
      Arr.findFirst(traits, (item) => keyText(item.key) === ref),
    ).pipe(Effect.mapError(missing(ref)));
    const history = yield* listHistory({ entity: "owner_trait", id, limit: HISTORY_LIMIT });
    return {
      ...summaryOf(trait),
      kind: trait.kind,
      status: trait.status,
      ...fieldOf("supersededBy", pipe(trait.supersededBy, Option.map(keyText))),
      evidence: pipe(trait.evidence, Arr.map(evidenceItem)),
      revisions: pipe(history, Arr.map(revisionItem)),
    };
  });

export { profileTraits, traitDetail };
export type { Wanted };
