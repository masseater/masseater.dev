import { Array as Arr, Effect, Option, Order, pipe } from "effect";

import type { Memory } from "#/features/mcp/model/memory.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { contains } from "./life-filter";
import type { Entry } from "./life-filter";
import { itemOf } from "./life-item";
import { SCAN_LIMIT, scanRecords } from "./life-store.server";
import { todayJst } from "./life-time";
import { DEFAULT_MEMORY_LIMIT } from "./memory-input";
import type { WatashiSearchValue } from "./memory-input";
import { memoryItem, searchMemories } from "./memory-store.server";
import { termsOf } from "./storage.server";

type Body = Readonly<Record<string, unknown>>;

type Scored = Readonly<{ score: number; item: Body }>;

const SEARCHED_RECORDS = [
  "life_event",
  "media_item",
  "profile_fact",
  "metric_goal",
  "owner_reflection",
  "todo",
] as const;

const scoreText =
  (terms: readonly string[]) =>
  (text: string): number =>
    pipe(
      terms,
      Arr.filter((term) => contains(term)(text)),
      Arr.length,
    );

const lifeScored =
  (terms: readonly string[], today: string) =>
  (entry: Entry): Scored => ({
    score: scoreText(terms)(entry.row.searchText),
    item: { store: "life", ...itemOf(today)(entry) },
  });

const memoryScored =
  (terms: readonly string[]) =>
  (row: Memory): Scored => ({
    score: scoreText(terms)(`${row.name} ${row.description} ${row.content}`),
    item: memoryItem(row),
  });

const scoreOf = (scored: Scored): number => scored.score;

const itemOfScored = (scored: Scored): Body => scored.item;

const watashiSearch = (input: WatashiSearchValue): Effect.Effect<Body, StorageFailed> =>
  Effect.gen(function* searchWatashi() {
    const terms = termsOf(input.query);
    const limit = input.limit ?? DEFAULT_MEMORY_LIMIT;
    const today = yield* todayJst;
    const none = Option.none();
    const life = yield* scanRecords({
      records: SEARCHED_RECORDS,
      from: none,
      to: none,
      terms,
      limit: SCAN_LIMIT,
    });
    const memos = yield* searchMemories({ query: input.query, project: none, limit });
    const lifeItems = pipe(life, Arr.map(lifeScored(terms, today)));
    const memoItems = pipe(memos, Arr.map(memoryScored(terms)));
    return {
      total: Arr.length(lifeItems) + Arr.length(memoItems),
      countsByStore: { life: Arr.length(lifeItems), memory: Arr.length(memoItems) },
      items: pipe(
        [...lifeItems, ...memoItems],
        Arr.sortWith(scoreOf, Order.flip(Order.Number)),
        Arr.take(limit),
        Arr.map(itemOfScored),
      ),
    };
  });

export { watashiSearch };
