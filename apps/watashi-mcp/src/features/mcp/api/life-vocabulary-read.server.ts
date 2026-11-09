import { Array as Arr, Effect, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { stringsAt } from "./life-filter";
import type { Entry } from "./life-filter";
import { refOf, textAt } from "./life-record";
import type { Body } from "./life-record";
import { scanAll } from "./life-store.server";
import { countOf, usageOf } from "./life-usage";
import type { Usage } from "./life-usage";
import { metricKeysOf } from "./life-vocabulary.server";

const NO_USE: Usage = { count: 0, first: "", last: "" };

const ofRecord =
  (record: string) =>
  (entry: Entry): boolean =>
    entry.row.record === record;

const definitionOf =
  (usage: Readonly<Record<string, Usage>>) =>
  (entry: Entry): Body => ({
    ref: refOf(entry.row),
    ...entry.body,
    ...pipe(
      Rec.get(usage, entry.row.label),
      Option.getOrElse(() => NO_USE),
    ),
  });

const labelOf = (entry: Entry): string => entry.row.label;

const listOf = (
  definitions: readonly Entry[],
  usage: Readonly<Record<string, Usage>>,
): readonly Body[] =>
  pipe(definitions, Arr.sortWith(labelOf, Order.String), Arr.map(definitionOf(usage)));

const labelKeys = (entry: Entry): readonly string[] => [entry.row.label];

const metricKeys = (entry: Entry): readonly string[] => metricKeysOf(entry.body);

const placeKeys = (entry: Entry): readonly string[] =>
  pipe([textAt("place")(entry.body)], Arr.filter(Str.isNonEmpty));

const vocabularyOf = (entries: readonly Entry[]): Body => {
  const events = pipe(entries, Arr.filter(ofRecord("life_event")));
  const facts = pipe(entries, Arr.filter(ofRecord("profile_fact")));
  const kinds = pipe(entries, Arr.filter(ofRecord("event_kind")));
  const metrics = pipe(entries, Arr.filter(ofRecord("metric_definition")));
  return {
    kinds: listOf(kinds, usageOf(labelKeys)(events)),
    metrics: listOf(metrics, usageOf(metricKeys)(events)),
    people: usageOf(stringsAt("people"))(events),
    places: usageOf(placeKeys)(events),
    tags: usageOf(stringsAt("tags"))(entries),
    topics: countOf(labelOf)(facts),
  };
};

const readVocabulary: Effect.Effect<Body, StorageFailed> = scanAll([
  "event_kind",
  "metric_definition",
  "life_event",
  "profile_fact",
  "media_item",
]).pipe(Effect.map(vocabularyOf));

export { readVocabulary };
