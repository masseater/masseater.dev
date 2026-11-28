import { Array as Arr } from "effect";
import { expect, it } from "vite-plus/test";

import { sameKind, sameRun, staleOf } from "./stale-caches.ts";

const NEWEST_RUN = 3_000_000_000;
const MIDDLE_RUN = 2_000_000_000;
const OLDEST_RUN = 1_000_000_000;

const keys = (entries: readonly Readonly<{ key: string }>[]): readonly string[] =>
  Arr.map(entries, ({ key }) => key);

const task = (run: number, attempt: number, shard: number): { key: string } => ({
  key: `vite-task-Linux-X64-${String(run)}-${String(attempt)}-shard-${String(shard)}`,
});

it("keeps the newest entry of each shard and drops the older runs of that shard", () => {
  const entries = [
    task(NEWEST_RUN, 1, 0),
    task(NEWEST_RUN, 1, 3),
    task(MIDDLE_RUN, 1, 0),
    task(MIDDLE_RUN, 2, 3),
    task(OLDEST_RUN, 1, 5),
  ];
  expect(keys(staleOf(entries, sameRun))).toStrictEqual(
    keys([task(MIDDLE_RUN, 1, 0), task(MIDDLE_RUN, 2, 3)]),
  );
});

it("keeps the newest persisted entry per package", () => {
  const persisted = (name: string, run: number): { key: string } => ({
    key: `persist-mosaic-${name}-${String(run)}`,
  });
  const entries = [
    persisted("a", NEWEST_RUN),
    persisted("b", NEWEST_RUN),
    persisted("a", OLDEST_RUN),
  ];
  expect(keys(staleOf(entries, sameRun))).toStrictEqual(keys([persisted("a", OLDEST_RUN)]));
});

it("keeps one entry per prefix when the key holds a hash", () => {
  const entries = [
    { key: "pnpm-store-x-newest" },
    { key: "pnpm-store-x-middle" },
    { key: "pnpm-store-x-oldest" },
  ];
  expect(keys(staleOf(entries, sameKind))).toStrictEqual([
    "pnpm-store-x-middle",
    "pnpm-store-x-oldest",
  ]);
});
