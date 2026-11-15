import { Array as Arr, Effect, Option, Order, pipe } from "effect";

import { contains, itemOf, todayJst } from "#/entities/life-record";
import type { Body, Entry } from "#/entities/life-record";
import { SCAN_LIMIT, scanCapped } from "#/entities/life-record/index.server";
import { DEFAULT_MEMORY_LIMIT } from "#/entities/memory";
import type { WatashiSearchValue } from "#/entities/memory";
import { memoryItem, searchMemories } from "#/entities/memory/index.server";
import type { Memory, StorageFailed } from "#/shared/db";
import { termsOf } from "#/shared/db/index.server";

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
    const life = yield* scanCapped({
      records: SEARCHED_RECORDS,
      from: none,
      to: none,
      terms,
      limit: SCAN_LIMIT,
    });
    const memos = yield* searchMemories({ query: input.query, project: none, limit });
    const lifeItems = pipe(life.entries, Arr.map(lifeScored(terms, today)));
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
      ...life.limited,
    };
  });

export { watashiSearch };
