import { expect, it } from "@effect/vitest";
import { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, pipe } from "effect";

import { skillCatalog } from "./server-skills.ts";

const catalog = skillCatalog([
  {
    name: "sample-server",
    description: "How to use the sample server.",
    body: "# Sample\n\nCall a first.",
  },
]);

it.effect("カタログは SKILL.md の name を保つ", () =>
  Effect.gen(function* listed() {
    const { entries } = yield* Effect.promise(() => catalog);
    expect(
      pipe(
        entries,
        Arr.map(({ frontmatter }) => frontmatter.name),
      ),
    ).toStrictEqual(["sample-server"]);
  }),
);

it.effect("カタログはサーバーに取り付けられる", () =>
  Effect.gen(function* attached() {
    const loaded = yield* Effect.promise(() => catalog);
    const server = new McpServer({ name: "sample", version: "0.0.0" });
    expect(() => {
      loaded.attach(server);
    }).not.toThrow();
  }),
);
