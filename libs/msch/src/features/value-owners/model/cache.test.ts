import { layer } from "@effect/vitest";
import { Effect, Array as Arr, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { findingsAfterEdit } from "./findings.test.support.ts";

const lines = (source: readonly string[]): string => pipe(source, Arr.join("\n"));

const STATUS_OWNER = lines([
  "/** @msch order.status */",
  'export const ORDER_STATUSES = ["draft", "published", "archived"] as const;',
  "export type OrderStatus = (typeof ORDER_STATUSES)[number];",
  "",
]);

const DERIVED = lines([
  'import type { OrderStatus } from "./status.ts";',
  'export type Early = Extract<OrderStatus, "draft" | "published">;',
  "",
]);

const RESTATED = lines(['export type Local = "draft" | "published";', ""]);

const reportsAProblemAddedAfterACleanRun = Effect.gen(
  function* reportsAProblemAddedAfterACleanRun() {
    const findings = yield* findingsAfterEdit(
      { "src/status.ts": STATUS_OWNER, "src/use.ts": DERIVED },
      { "src/use.ts": RESTATED },
    );
    expect(findings).toStrictEqual([[], ["src/use.ts:1 owner-value-set"]]);
  },
);

const dropsAProblemFixedAfterTheFirstRun = Effect.gen(
  function* dropsAProblemFixedAfterTheFirstRun() {
    const findings = yield* findingsAfterEdit(
      { "src/status.ts": STATUS_OWNER, "src/use.ts": RESTATED },
      { "src/use.ts": DERIVED },
    );
    expect(findings).toStrictEqual([["src/use.ts:1 owner-value-set"], []]);
  },
);

layer(fixtureLayer)("value-owners cache", (it) => {
  it.effect("reports a problem added after a clean run", () => reportsAProblemAddedAfterACleanRun);
  it.effect("drops a problem fixed after the first run", () => dropsAProblemFixedAfterTheFirstRun);
});
