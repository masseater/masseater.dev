import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPluginMarketplace } from "./plugin-marketplace.ts";

const MARKETPLACE = `{
  "name": "example-dev",
  "owner": {
    "name": "owner",
    "url": "https://example.com"
  },
  "metadata": {
    "description": "Plugins of the example."
  },
  "plugins": [
    {
      "name": "local",
      "source": "./libs/local",
      "description": "Runs only from the repository."
    },
    {
      "name": "shipped",
      "source": {
        "source": "npm",
        "package": "@scope/shipped"
      },
      "description": "Ships on npm."
    }
  ]
}
`;

const REPOSITORY: Readonly<Record<string, string>> = {
  "pnpm-workspace.yaml": "packages:\n  - libs/*\n",
  "package.json":
    '{ "name": "example.dev", "private": true, "description": "Plugins of the example.", "author": { "name": "owner", "url": "https://example.com" } }\n',
  "libs/local/package.json":
    '{ "name": "local", "private": true, "description": "Runs only from the repository." }\n',
  "libs/local/.claude-plugin/plugin.json": '{ "name": "local" }\n',
  "libs/shipped/package.json":
    '{ "name": "@scope/shipped", "description": "Ships on npm.", "publishConfig": {} }\n',
  "libs/shipped/.claude-plugin/plugin.json": '{ "name": "shipped" }\n',
  "libs/plain/package.json": '{ "name": "plain", "private": true, "description": "No plugin." }\n',
};

const writesTheMarketplaceFromWorkspaces = Effect.gen(
  function* writesTheMarketplaceFromWorkspaces() {
    const files = yield* RepositoryFiles;
    const root = yield* gitRepositoryWith(REPOSITORY);
    const first = yield* checkPluginMarketplace(root);
    const written = yield* files.readFile(files.join(root, ".claude-plugin/marketplace.json"));
    const second = yield* checkPluginMarketplace(root);
    expect(
      pipe(
        first,
        Arr.map(({ rule }) => rule),
      ),
    ).toStrictEqual(["plugin-marketplace"]);
    expect(Option.getOrNull(written)).toBe(MARKETPLACE);
    expect(second).toStrictEqual([]);
  },
);

const asksForTheOwner = Effect.gen(function* asksForTheOwner() {
  const files = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ...REPOSITORY,
    "package.json": '{ "name": "example.dev", "private": true }\n',
  });
  const problems = yield* checkPluginMarketplace(root);
  expect(
    pipe(
      problems,
      Arr.map(({ file }) => files.relative(root, file)),
    ),
  ).toStrictEqual(["package.json"]);
});

layer(fixtureLayer)("the plugin marketplace follows the workspaces", (it) => {
  it.effect("writes the marketplace from the workspaces", () => writesTheMarketplaceFromWorkspaces);
  it.effect("asks for the root author", () => asksForTheOwner);
});
