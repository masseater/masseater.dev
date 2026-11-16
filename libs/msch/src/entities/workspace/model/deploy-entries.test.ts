import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { deployEntries } from "./deploy-entries.ts";

const MODULE = "export default {};\n";

const STACK = `import { Workers } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";

export default Stack.make("site", Workers.Worker("site", { main: "./src/app/site.ts" }));
`;

const NESTED = `import { Workers } from "@alchemy.run/cloudflare";

export const guard = Workers.Worker("guard", {
  main: decodeURIComponent(new URL("./honeypot.ts", import.meta.url).pathname),
});
`;

const UNRELATED = `export const manifest = { main: "./src/app/other.ts" };\n`;

const readsMainOfAlchemyResources = Effect.gen(function* readsMainOfAlchemyResources() {
  const root = yield* gitRepositoryWith({
    "apps/site/alchemy.run.ts": STACK,
    "apps/site/src/app/site.ts": MODULE,
    "apps/site/src/app/other.ts": MODULE,
    "apps/site/src/shared/lib/manifest.ts": UNRELATED,
    "infra/account/src/features/guard-edge/model/edge-guard.ts": NESTED,
    "infra/account/src/features/guard-edge/model/honeypot.ts": MODULE,
  });
  const found = yield* deployEntries(root);
  expect(Arr.sort(found, Str.Order)).toStrictEqual([
    "apps/site/src/app/site.ts",
    "infra/account/src/features/guard-edge/model/honeypot.ts",
  ]);
});

layer(fixtureLayer)("deployEntries", (it) => {
  it.effect(
    "finds the files that Alchemy resources name in main, wherever they live",
    () => readsMainOfAlchemyResources,
  );
});
