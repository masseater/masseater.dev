import { Stack } from "alchemy";
import { D1, Zone } from "alchemy/Cloudflare";
import type { Providers } from "alchemy/Cloudflare";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import { Effect, Exit, Layer } from "effect";
import { expect, test } from "vite-plus/test";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";

const deploysWith = (
  stackName: string,
  resource: Effect.Effect<unknown, never, Providers>,
): Promise<boolean> =>
  Effect.runPromise(
    Stack(
      stackName,
      { providers: Layer.empty, state: inMemoryState() },
      Effect.gen(function* stack() {
        yield* resource;
        yield* requireAppPrefix;
      }),
    ).pipe(
      Effect.provideService(Stage, "test"),
      Effect.scoped,
      Effect.exit,
      Effect.map(Exit.isSuccess),
    ),
  );

const deploys = (stackName: string, props: Readonly<{ name?: string }>): Promise<boolean> =>
  deploysWith(stackName, D1.Database("DB", props));

test.each([
  { stackName: APP_NAME, props: {}, expected: true },
  { stackName: APP_NAME, props: { name: `${APP_NAME}-db` }, expected: true },
  { stackName: APP_NAME, props: { name: "web-db" }, expected: false },
  { stackName: "web", props: {}, expected: false },
])("stack $stackName with $props deploys: $expected", ({ stackName, props, expected }) =>
  expect(deploys(stackName, props)).resolves.toBe(expected),
);

test("zone keeps its domain name", () =>
  expect(deploysWith(APP_NAME, Zone.Zone("Zone", { name: "example.com" }))).resolves.toBe(true));
