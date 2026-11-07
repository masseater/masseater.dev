import { D1, Rules, Zone } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import { Effect, Exit, Layer, Match } from "effect";
import { expect, test } from "vite-plus/test";

import { requireAppPrefix } from "./app-prefix.ts";

const APP_NAME = "example";

type Resource =
  | Readonly<{ type: "database"; props: Readonly<{ name?: string }> }>
  | Readonly<{ type: "list"; name: string }>
  | Readonly<{ type: "zone"; name: string }>;

const deploys = (stackName: string, resource: Resource): Promise<boolean> =>
  Effect.runPromise(
    Stack(
      stackName,
      { providers: Layer.empty, state: inMemoryState() },
      Effect.gen(function* stack() {
        yield* Match.value(resource).pipe(
          Match.discriminatorsExhaustive("type")({
            database: ({ props }) => D1.Database("DB", props),
            list: ({ name }) => Rules.List("List", { name, kind: "ip", items: [] }),
            zone: ({ name }) => Zone.Zone("Zone", { name }),
          }),
        );
        yield* requireAppPrefix(APP_NAME);
      }),
    ).pipe(
      Effect.provideService(Stage, "test"),
      Effect.scoped,
      Effect.exit,
      Effect.map(Exit.isSuccess),
    ),
  );

test.each<Readonly<{ stackName: string; resource: Resource; expected: boolean }>>([
  { stackName: APP_NAME, resource: { type: "database", props: {} }, expected: true },
  {
    stackName: APP_NAME,
    resource: { type: "database", props: { name: `${APP_NAME}-db` } },
    expected: true,
  },
  {
    stackName: APP_NAME,
    resource: { type: "database", props: { name: "web-db" } },
    expected: false,
  },
  { stackName: "web", resource: { type: "database", props: {} }, expected: false },
  { stackName: APP_NAME, resource: { type: "zone", name: "example.com" }, expected: true },
  {
    stackName: APP_NAME,
    resource: { type: "list", name: `${APP_NAME}_redirects` },
    expected: true,
  },
  {
    stackName: APP_NAME,
    resource: { type: "list", name: `${APP_NAME}-redirects` },
    expected: false,
  },
])("stack $stackName with $resource deploys: $expected", ({ stackName, resource, expected }) =>
  expect(deploys(stackName, resource)).resolves.toBe(expected),
);
