import { Array as Arr, pipe } from "effect";
import { expect, it } from "vite-plus/test";

import { sameKind, sameRun, staleOf } from "./stale-caches.ts";

const NEWEST = "3000000000";
const MIDDLE = "2000000000";
const OLDEST = "1000000000";

const staleKeys = (
  keys: readonly string[],
  group: (entry: Readonly<{ key: string }>) => string,
): readonly string[] =>
  pipe(
    keys,
    Arr.map((key) => ({ key })),
    (entries) => staleOf(entries, (entry) => group(entry)),
    Arr.map(({ key }) => key),
  );

it("keeps the newest entry of each shard and drops the older runs of that shard", () => {
  const stale = staleKeys(
    [
      `vite-task-Linux-X64-${NEWEST}-1-shard-0`,
      `vite-task-Linux-X64-${NEWEST}-1-shard-3`,
      `vite-task-Linux-X64-${MIDDLE}-1-shard-0`,
      `vite-task-Linux-X64-${MIDDLE}-2-shard-3`,
      `vite-task-Linux-X64-${OLDEST}-1-shard-5`,
    ],
    sameRun,
  );
  expect(stale).toStrictEqual([
    `vite-task-Linux-X64-${MIDDLE}-1-shard-0`,
    `vite-task-Linux-X64-${MIDDLE}-2-shard-3`,
  ]);
});

it("keeps the newest persisted entry per package", () => {
  const stale = staleKeys(
    [`persist-mosaic-a-${NEWEST}`, `persist-mosaic-b-${NEWEST}`, `persist-mosaic-a-${OLDEST}`],
    sameRun,
  );
  expect(stale).toStrictEqual([`persist-mosaic-a-${OLDEST}`]);
});

it("keeps one entry per prefix when the key holds a hash", () => {
  const stale = staleKeys(
    ["pnpm-store-x-newest", "pnpm-store-x-middle", "pnpm-store-x-oldest"],
    sameKind,
  );
  expect(stale).toStrictEqual(["pnpm-store-x-middle", "pnpm-store-x-oldest"]);
});
