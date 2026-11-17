import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { afterAll, beforeEach, expect, vi } from "vite-plus/test";

import { closeDatabase, resetStores } from "#/shared/lib/cloudflare.test.support.ts";

import {
  ClientLayer,
  fixtureProject,
  forgetLocally,
  outputOf,
  runTask,
} from "./client.test.support.ts";

vi.mock("cloudflare:workers", () => import("#/shared/lib/cloudflare.test.support.ts"));

vi.mock("jose", () => import("#/app/token.test.support.ts"));

const TIMEOUT = 60_000;
const SUCCEEDED = 0;

const restoresWhatAnotherCheckoutStored = Effect.gen(function* restoresWhatAnotherCheckoutStored() {
  const project = yield* fixtureProject;
  const stored = yield* runTask(project, "read-write");
  const written = yield* outputOf(project);
  yield* forgetLocally(project);
  const restored = yield* runTask(project, "read");
  const output = yield* outputOf(project);
  expect([stored.status, restored.status]).toStrictEqual([SUCCEEDED, SUCCEEDED]);
  expect(output).toBe(written);
  expect(restored.output).toContain("remote cache hit");
}).pipe(Effect.scoped);

beforeEach(() => Effect.runPromise(resetStores));
afterAll(() => Effect.runPromise(closeDatabase));

layer(ClientLayer, { excludeTestServices: true })("task cache with the vp client", (it) => {
  it.effect(
    "restores an output that another checkout stored",
    () => restoresWhatAnotherCheckoutStored,
    TIMEOUT,
  );
});
