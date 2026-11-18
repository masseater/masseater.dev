import { NodeServices } from "@effect/platform-node";
import { lintText } from "@r_masseater/fu4";
import type { Fu4Config, Fu4Error } from "@r_masseater/fu4";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Record as Rec, pipe } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import { actionlint, recommended, zizmor } from "./presets.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const UNPINNED =
  "name: ci\non: push\npermissions: {}\njobs:\n  test:\n    name: test\n    runs-on: gpu\n    steps:\n      - uses: actions/checkout@v4\n";

const ruleNames = (config: Fu4Config): readonly string[] => Rec.keys(config.rules ?? {});

const reported = Effect.fn("reported")(function* reported(config: Fu4Config) {
  const fileSystem = yield* FileSystem.FileSystem;
  const root = yield* fileSystem.makeTempDirectory({ prefix: "fu4-presets-" });
  const found = yield* lintText({ root, path: ".github/workflows/ci.yml", text: UNPINNED, config });
  return pipe(
    found,
    Arr.map((each) => each.rule),
    Arr.dedupe,
  );
});

const scenario = (
  name: string,
  body: Effect.Effect<void, Fu4Error | PlatformError, FileSystem.FileSystem>,
): void => {
  test(name, () => services.runPromise(body));
};

test("turns on only the audits of the chosen zizmor concerns", () => {
  expect(ruleNames(zizmor({ concerns: ["references"] }))).toStrictEqual([
    "zizmor/impostor-commit",
    "zizmor/ref-confusion",
    "zizmor/ref-version-mismatch",
    "zizmor/stale-action-refs",
    "zizmor/known-vulnerable-actions",
  ]);
});

test("turns on every zizmor audit by default", () => {
  expect(ruleNames(zizmor())).toContain("zizmor/unpinned-uses");
  expect(ruleNames(zizmor())).toContain("zizmor/template-injection");
});

scenario(
  "passes zizmor options to the audits as settings",
  Effect.gen(function* zizmorSettings() {
    const rules = yield* reported(
      zizmor({ online: false, rules: { "unpinned-uses": { disable: true } } }),
    );
    expect(rules).not.toContain("zizmor/unpinned-uses");
  }),
);

scenario(
  "passes actionlint options to the rules as settings",
  Effect.gen(function* actionlintSettings() {
    const plain = yield* reported(actionlint());
    const labelled = yield* reported(actionlint({ "self-hosted-runner": { labels: ["gpu"] } }));
    expect(plain).toContain("actionlint/runner-label");
    expect(labelled).not.toContain("actionlint/runner-label");
  }),
);

scenario(
  "runs actionlint and zizmor together in the recommended preset",
  Effect.gen(function* together() {
    const rules = yield* reported({
      extends: [recommended()],
      settings: { zizmor: { online: false } },
    });
    expect(rules).toContain("actionlint/runner-label");
    expect(rules).toContain("zizmor/unpinned-uses");
  }),
);
