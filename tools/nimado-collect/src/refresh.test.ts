import { NodeServices } from "@effect/platform-node";
import type { Path } from "effect";
import {
  Array as Arr,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  Record,
  Ref,
  Schema,
  pipe,
} from "effect";
import { TestClock } from "effect/testing";
import { expect, it } from "vite-plus/test";

import { refresh } from "./refresh.ts";
import { NICO_FILE, jstDate, loadViews, saveViews } from "./state.ts";
import type { ViewStateValue } from "./view-state.ts";

const taggedError = Schema.TaggedError;

class QuotaExceeded extends taggedError<QuotaExceeded, { readonly brand: unique symbol }>()(
  "QuotaExceeded",
  { ids: Schema.Array(Schema.String) },
) {}

const EPOCH = "0000-00-00";
const EVERYTHING = 100;
const NEVER = 100;
const ONE = 1;
const PAIR = 2;
const VIEWS = 9000;
const WITHIN_GRACE = -2;
const GRACE_END = -3;

const VIEWS_OF = { sm1: 1, sm2: 2, sm3: 3, sm4: 4, sm5: 5 };

const environment = Layer.merge(NodeServices.layer, TestClock.layer());

const found = (ids: readonly string[]): Readonly<Record<string, number>> =>
  pipe(
    VIEWS_OF,
    Record.filter((_views, id) => Arr.contains(ids, id)),
  );

const failingOn =
  (poison: string) =>
  (ids: readonly string[]): Effect.Effect<Readonly<Record<string, number>>, QuotaExceeded> =>
    pipe(
      Effect.succeed(found(ids)),
      Effect.filterOrFail(
        () => !Arr.contains(ids, poison),
        () => QuotaExceeded.make({ ids }),
      ),
    );

const viewsOf = (state: ViewStateValue): Readonly<Record<string, Option.Option<number>>> =>
  pipe(
    state,
    Record.map(([views]) => views),
  );

const inStateDirectory = <Value, Failure>(
  run: (state: string) => Effect.Effect<Value, Failure, FileSystem.FileSystem | Path.Path>,
): Promise<Value> =>
  Effect.runPromise(
    Effect.gen(function* withStateDirectory() {
      const fileSystem = yield* FileSystem.FileSystem;
      const state = yield* fileSystem.makeTempDirectoryScoped();
      return yield* run(state);
    }).pipe(Effect.scoped, Effect.provide(environment)),
  );

it("2 つ目のまとまりで失敗しても、1 つ目のまとまりの値を保存する", () =>
  expect(
    inStateDirectory((state) =>
      Effect.gen(function* failsOnSecondBatch() {
        const exit = yield* refresh({
          state,
          file: NICO_FILE,
          ids: ["sm1", "sm2", "sm3", "sm4"],
          budget: EVERYTHING,
          batch: PAIR,
          checkpoint: NEVER,
          since: EPOCH,
          lookup: failingOn("sm3"),
        }).pipe(Effect.exit);
        const saved = yield* loadViews({ state, file: NICO_FILE });
        return { failed: Exit.isFailure(exit), saved: viewsOf(saved) };
      }),
    ),
  ).resolves.toStrictEqual({
    failed: true,
    saved: { sm1: Option.some(VIEWS_OF.sm1), sm2: Option.some(VIEWS_OF.sm2) },
  }));

it("最後まで取れたら、すべての値を 1 つのファイルに保存する", () =>
  expect(
    inStateDirectory((state) =>
      Effect.gen(function* succeeds() {
        const fileSystem = yield* FileSystem.FileSystem;
        yield* refresh({
          state,
          file: NICO_FILE,
          ids: ["sm1", "sm2", "sm3", "unknown"],
          budget: EVERYTHING,
          batch: PAIR,
          checkpoint: NEVER,
          since: EPOCH,
          lookup: (ids) => Effect.succeed(found(ids)),
        });
        const saved = yield* loadViews({ state, file: NICO_FILE });
        const files = yield* fileSystem.readDirectory(state);
        return { files, saved: viewsOf(saved) };
      }),
    ),
  ).resolves.toStrictEqual({
    files: [NICO_FILE],
    saved: {
      sm1: Option.some(VIEWS_OF.sm1),
      sm2: Option.some(VIEWS_OF.sm2),
      sm3: Option.some(VIEWS_OF.sm3),
      unknown: Option.none(),
    },
  }));

it("決めた数のまとまりを取るたびに、途中の値を保存する", () =>
  expect(
    inStateDirectory((state) =>
      Effect.gen(function* checkpoints() {
        const snapshots = yield* Ref.make<readonly (readonly string[])[]>([]);
        yield* refresh({
          state,
          file: NICO_FILE,
          ids: ["sm1", "sm2", "sm3", "sm4", "sm5"],
          budget: EVERYTHING,
          batch: ONE,
          checkpoint: PAIR,
          since: EPOCH,
          lookup: Effect.fn("lookup")(function* snapshotThenFind(ids: readonly string[]) {
            const saved = yield* loadViews({ state, file: NICO_FILE });
            yield* Ref.update(snapshots, Arr.append(Record.keys(saved)));
            return found(ids);
          }),
        });
        return yield* Ref.get(snapshots);
      }),
    ),
  ).resolves.toStrictEqual([[], [], ["sm1", "sm2"], ["sm1", "sm2"], ["sm1", "sm2", "sm3", "sm4"]]));

it("応答に無い動画は、前の値が猶予の内のときだけ残す", () =>
  expect(
    inStateDirectory((state) =>
      Effect.gen(function* keepsWithinGrace() {
        const recent = yield* jstDate(WITHIN_GRACE);
        const stale = yield* jstDate(GRACE_END);
        yield* saveViews({
          state,
          file: NICO_FILE,
          value: { recent: [Option.some(VIEWS), recent], stale: [Option.some(VIEWS), stale] },
        });
        yield* refresh({
          state,
          file: NICO_FILE,
          ids: ["recent", "stale"],
          budget: EVERYTHING,
          batch: PAIR,
          checkpoint: NEVER,
          since: EPOCH,
          lookup: () => Effect.succeed({}),
        });
        const saved = yield* loadViews({ state, file: NICO_FILE });
        return viewsOf(saved);
      }),
    ),
  ).resolves.toStrictEqual({ recent: Option.some(VIEWS), stale: Option.none() }));
