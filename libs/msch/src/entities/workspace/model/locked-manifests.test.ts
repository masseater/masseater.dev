import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import {
  APP_MANIFEST,
  SHARED_MANIFEST,
  TOOLING_MANIFEST,
  manifest,
  closuresAround,
} from "./locked-closure-files.test.support.ts";

const keepsTheClosureWhenADependencyOnlyBumpsItsVersion = Effect.gen(
  function* keepsTheClosureWhenADependencyOnlyBumpsItsVersion() {
    const { before, after } = yield* closuresAround([
      SHARED_MANIFEST,
      manifest({ name: "@fixture/shared", version: "1.1.0", exports: "./src/index.ts" }),
    ]);
    expect(after).toBe(before);
  },
);

const changesTheClosureWhenADependencyChangesItsExports = Effect.gen(
  function* changesTheClosureWhenADependencyChangesItsExports() {
    const { before, after } = yield* closuresAround([
      SHARED_MANIFEST,
      manifest({ name: "@fixture/shared", version: "1.0.0", exports: "./src/main.ts" }),
    ]);
    expect(after).not.toBe(before);
  },
);

const changesTheClosureWhenARootToolChangesItsExports = Effect.gen(
  function* changesTheClosureWhenARootToolChangesItsExports() {
    const { before, after } = yield* closuresAround([
      TOOLING_MANIFEST,
      manifest({ name: "@fixture/tooling", version: "1.0.0", exports: "./src/main.ts" }),
    ]);
    expect(after).not.toBe(before);
  },
);

const changesTheClosureWhenTheWorkspaceBumpsItsOwnVersion = Effect.gen(
  function* changesTheClosureWhenTheWorkspaceBumpsItsOwnVersion() {
    const { before, after } = yield* closuresAround([
      APP_MANIFEST,
      manifest({ name: "@fixture/app", version: "1.1.0", exports: "./src/index.ts" }),
    ]);
    expect(after).not.toBe(before);
  },
);

layer(fixtureLayer)("writeLockedClosures with workspace manifests", (it) => {
  it.effect(
    "keeps the closure when a workspace dependency only bumps its version",
    () => keepsTheClosureWhenADependencyOnlyBumpsItsVersion,
  );
  it.effect(
    "changes the closure when a workspace dependency changes its exports",
    () => changesTheClosureWhenADependencyChangesItsExports,
  );
  it.effect(
    "changes the closure when a workspace the root installs changes its exports",
    () => changesTheClosureWhenARootToolChangesItsExports,
  );
  it.effect(
    "changes the closure when the workspace bumps its own version",
    () => changesTheClosureWhenTheWorkspaceBumpsItsOwnVersion,
  );
});
