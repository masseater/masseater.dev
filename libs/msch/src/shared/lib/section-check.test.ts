import { layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, Layer, Metric, Option, Path, pipe } from "effect";
import { expect } from "vite-plus/test";

import { nodeRepositoryFiles, nodeServicesLayer } from "./repository-files.ts";
import { checkSection } from "./section-check.ts";

const FOUND = [
  { path: "a.md", line: 1, rule: "heading", message: "first", severity: "error" },
  { path: "a.md", line: 2, rule: "heading", message: "second", severity: "error" },
  { path: "a.md", line: 3, rule: "spacing", message: "third", severity: "warning" },
] as const;

const REPORTED = 2;
const HEADINGS = 2;
const SPACINGS = 1;
const CHECK = "checkCountedLint";

const check = checkSection({
  name: CHECK,
  rule: "counted-lint",
  pick: () => ({}),
  pathspecs: () => ["*.md"],
  lint: () => Effect.succeed(FOUND),
  detail: () => "",
});

type Attributes = Readonly<Record<string, unknown>>;

const matches =
  (rule: string, severity: string) =>
  (attributes: Attributes): boolean =>
    attributes["lint.check"] === CHECK &&
    attributes["lint.rule"] === rule &&
    attributes["lint.severity"] === severity;

const counted = (rule: string, severity: string): Effect.Effect<Option.Option<unknown>> =>
  Metric.snapshot.pipe(
    Effect.map((snapshot) =>
      pipe(
        snapshot,
        Arr.findFirst(
          (entry) =>
            entry.id === "lint.diagnostics" &&
            Option.exists(Option.fromNullishOr(entry.attributes), matches(rule, severity)),
        ),
        Option.map((entry) => entry.state),
        Option.flatMap((state) => Option.liftPredicate(state, (value) => "count" in value)),
        Option.map((state) => state.count),
      ),
    ),
  );

const countsDiagnostics = Effect.gen(function* countsDiagnostics() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped();
  yield* fileSystem.writeFileString(path.join(root, "vite.config.ts"), "export default {};\n");
  const problems = yield* check(root);
  const headings = yield* counted("heading", "error");
  const spacings = yield* counted("spacing", "warning");
  expect(problems).toHaveLength(REPORTED);
  expect(headings).toStrictEqual(Option.some(HEADINGS));
  expect(spacings).toStrictEqual(Option.some(SPACINGS));
}).pipe(Effect.scoped);

layer(Layer.provideMerge(nodeRepositoryFiles, nodeServicesLayer))("checkSection", (it) => {
  it.effect(
    "counts every diagnostic per rule and severity, including those msch does not report",
    () => countsDiagnostics,
  );
});
