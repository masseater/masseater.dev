import { layer } from "@effect/vitest";
import { deepStrictEqual } from "@effect/vitest/utils";
import { Effect, Layer } from "effect";

import { checkDependencies } from "./dependency-rules.ts";
import type { Dependency } from "./workspace.ts";

const used = (manifest: string, name: string, specifier: string): Dependency => ({
  manifest,
  field: "dependencies",
  name,
  specifier,
});

const peer = (manifest: string, specifier: string): Dependency => ({
  manifest,
  field: "peerDependencies",
  name: "vite-plus",
  specifier,
});

const reportsBannedDependencies = Effect.sync(() => {
  deepStrictEqual(
    checkDependencies({ banned: { "use vite-plus/test": ["vitest", "@vitest/*"] } }, [
      used("libs/a/package.json", "@vitest/ui", "5.0.0"),
      used("libs/a/package.json", "effect", "4.1.2"),
    ]),
    ["libs/a/package.json dependencies.@vitest/ui is banned: use vite-plus/test"],
  );
});

const reportsMismatchedSpecifiers = Effect.sync(() => {
  deepStrictEqual(
    checkDependencies({}, [
      used("a/package.json", "effect", "4.1.2"),
      used("b/package.json", "effect", "4.1.1"),
      used("c/package.json", "effect", "workspace:*"),
    ]),
    [
      "different specifiers for effect: a/package.json dependencies 4.1.2, b/package.json dependencies 4.1.1",
    ],
  );
});

const acceptsIntersectingPeers = Effect.sync(() => {
  const peers = [peer("a/package.json", ">=1.4.0"), peer("b/package.json", "^1.5.0")];
  deepStrictEqual(checkDependencies({ peerRanges: "intersect" }, peers), []);
  deepStrictEqual(checkDependencies({}, peers), [
    "different specifiers for vite-plus: a/package.json peerDependencies >=1.4.0, b/package.json peerDependencies ^1.5.0",
  ]);
});

const reportsDisjointPeers = Effect.sync(() => {
  deepStrictEqual(
    checkDependencies({ peerRanges: "intersect" }, [
      peer("a/package.json", "^1.0.0"),
      peer("b/package.json", "^2.0.0"),
    ]),
    [
      "peer ranges do not intersect for vite-plus: a/package.json peerDependencies ^1.0.0, b/package.json peerDependencies ^2.0.0",
    ],
  );
});

const EXACT = { "read as a git dependency": ["libs/ui"] };

const requiresExactVersionsInStandaloneWorkspaces = Effect.sync(() => {
  deepStrictEqual(
    checkDependencies({ exactDependencies: EXACT }, [
      used("libs/ui/package.json", "effect", "^4.1.2"),
      used("libs/ui/package.json", "clsx", "2.1.1"),
      used("apps/web/package.json", "clsx", "catalog:"),
      used("apps/web/package.json", "effect", "catalog:"),
    ]),
    ["libs/ui/package.json dependencies.effect must be an exact version: read as a git dependency"],
  );
});

const checksOtherFieldsOfStandaloneWorkspaces = Effect.sync(() => {
  deepStrictEqual(
    checkDependencies({ exactDependencies: EXACT }, [
      { ...used("libs/ui/package.json", "effect", "catalog:"), field: "devDependencies" },
      used("apps/web/package.json", "effect", "4.1.2"),
    ]),
    [
      "different specifiers for effect: libs/ui/package.json devDependencies catalog:, apps/web/package.json dependencies 4.1.2",
    ],
  );
});

const allowsBannedDependenciesInChosenWorkspaces = Effect.sync(() => {
  const rules = {
    banned: { "instrument with OpenTelemetry auto-instrumentation": ["@opentelemetry/sdk-*"] },
    allowed: {
      "the OTLP receiver is tested with the SDK": {
        workspaces: ["libs/vitest-otlp"],
        dependencies: ["@opentelemetry/sdk-*"],
        fields: ["devDependencies" as const],
      },
    },
  };
  deepStrictEqual(
    checkDependencies(rules, [
      {
        ...used("libs/vitest-otlp/package.json", "@opentelemetry/sdk-node", "0.301.0"),
        field: "devDependencies",
      },
      used("libs/vitest-otlp/package.json", "@opentelemetry/sdk-trace-base", "2.0.0"),
      used("apps/web/package.json", "@opentelemetry/sdk-node", "0.301.0"),
    ]),
    [
      "libs/vitest-otlp/package.json dependencies.@opentelemetry/sdk-trace-base is banned: instrument with OpenTelemetry auto-instrumentation",
      "apps/web/package.json dependencies.@opentelemetry/sdk-node is banned: instrument with OpenTelemetry auto-instrumentation",
    ],
  );
});

layer(Layer.empty)("dependency rules", (it) => {
  it.effect(
    "allows a banned dependency in the workspaces and fields an exception names",
    () => allowsBannedDependenciesInChosenWorkspaces,
  );
  it.effect(
    "requires exact versions in the dependencies of standalone workspaces and leaves them out of the comparison",
    () => requiresExactVersionsInStandaloneWorkspaces,
  );
  it.effect(
    "still compares the other dependency fields of standalone workspaces",
    () => checksOtherFieldsOfStandaloneWorkspaces,
  );
  it.effect(
    "reports a dependency that matches a banned glob with its reason",
    () => reportsBannedDependencies,
  );
  it.effect(
    "reports packages that name one dependency with different specifiers",
    () => reportsMismatchedSpecifiers,
  );
  it.effect(
    "accepts different peer ranges that intersect when peers only need to intersect",
    () => acceptsIntersectingPeers,
  );
  it.effect("reports peer ranges that cannot both be satisfied", () => reportsDisjointPeers);
});
