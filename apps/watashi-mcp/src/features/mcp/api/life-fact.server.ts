import { Array as Arr, Effect, Option, pipe } from "effect";

import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import type { ItemResult } from "./life-checks";
import { plainInsert } from "./life-create.server";
import type { Creator } from "./life-create.server";
import { NONE, SELF, columnsOf, refOf, stringAt, textAt } from "./life-record";
import type { Body } from "./life-record";
import { scanAll } from "./life-store.server";
import type { LifeEntry } from "./life-store.server";
import { todayJst } from "./life-time";
import type { Notice } from "./life-vocabulary.server";
import { snapshotOf, succeedRecord } from "./life-writer.server";
import type { NewRecord, Writer } from "./life-writer.server";

type FactKey = Readonly<{ about: string; topic: string; start: string }>;

type Successor = Readonly<{ writer: Writer; input: NewRecord; until: string }>;

const isReplaceable =
  ({ about, topic, start }: FactKey) =>
  (entry: LifeEntry): boolean =>
    entry.row.about === about &&
    entry.row.label === topic &&
    entry.row.dayEnd === NONE &&
    entry.row.dayStart <= start;

const currentFact = (key: FactKey): Effect.Effect<Option.Option<LifeEntry>, StorageFailed> => {
  const replaceable = isReplaceable(key);
  return scanAll(["profile_fact"]).pipe(Effect.map(Arr.findFirst(replaceable)));
};

const isOpen = (body: Body): boolean => columnsOf("profile_fact")(body).dayEnd === NONE;

const factToEnd = (
  body: Body,
  key: FactKey,
): Effect.Effect<Option.Option<LifeEntry>, StorageFailed> => {
  if (isOpen(body)) {
    return currentFact(key);
  }
  return Effect.succeedNone;
};

const replacedNotice = (entry: LifeEntry, until: string): Notice => ({
  type: "replaced",
  ref: refOf(entry.row),
  statement: textAt("statement")(entry.body),
  note: `The previous fact now ends at ${until}.`,
});

const succeedFact =
  ({ writer, input, until }: Successor) =>
  (entry: LifeEntry): Effect.Effect<ItemResult, StorageFailed> =>
    succeedRecord(writer)({
      ended: {
        entry,
        snapshot: { ...snapshotOf(entry), body: { ...entry.body, until } },
        op: "update",
      },
      created: input,
    }).pipe(
      Effect.map((id) => ({
        ref: refOf({ record: input.record, id }),
        notices: [replacedNotice(entry, until)],
      })),
    );

const scheduledNotices =
  (start: string, today: string) =>
  (ref: string): readonly Notice[] => {
    if (start > today) {
      return [{ type: "scheduled", ref, note: "since is in the future, so it is kept as a plan." }];
    }
    return [];
  };

const startOrToday = (body: Body, today: string): string => {
  const start = columnsOf("profile_fact")(body).dayStart;
  if (start === NONE) {
    return today;
  }
  return start;
};

const createFact: Creator = (writer) => (input) =>
  Effect.gen(function* createProfileFact() {
    const today = yield* todayJst;
    const start = startOrToday(input.body, today);
    const about = textAt("about")(input.body) || SELF;
    const until = pipe(
      stringAt("since")(input.body),
      Option.getOrElse(() => today),
    );
    const current = yield* factToEnd(input.body, {
      about,
      topic: textAt("topic")(input.body),
      start,
    });
    const { ref, notices } = yield* Option.match(current, {
      onNone: () => plainInsert(writer)(input),
      onSome: succeedFact({ writer, input, until }),
    });
    return { ref, notices: [...notices, ...scheduledNotices(start, today)(ref)] };
  });

export { createFact };
