import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Schema,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import type { Coordinate } from "#/features/audit-workflows/model/coordinate.ts";
import type { AuditInput } from "#/features/audit-workflows/model/input.ts";

import { configurable, fixed, usageOf } from "./coordinate.ts";
import { stepView, stepsOf } from "./workflow-steps.ts";
import { normalJobsOf } from "./workflow.ts";
import { NOT_BUILT, SEQUENTIAL, inputFor, workflowOf } from "./zizmor-units-inputs.test.support.ts";
import type { Checked } from "./zizmor-units-inputs.test.support.ts";
import { FIXTURE, KNOWN, Recorded, knownIds, verdictOf } from "./zizmor-units.test.support.ts";
import type { Outcome, Units } from "./zizmor-units.test.support.ts";

type Case<Kind extends keyof Units> = Units[Kind][number];

const coordinateOf = (found: Case<"coordinateUsage">): Coordinate => {
  if (found.coordinate.type === "fixed") {
    return fixed(found.coordinate.pattern);
  }
  return configurable(found.coordinate.pattern)(found.coordinate.control);
};

const usageJson =
  (found: Case<"coordinateUsage">) =>
  (input: AuditInput): unknown =>
    pipe(
      workflowOf(input),
      Option.flatMap((workflow) => Arr.head(normalJobsOf(workflow))),
      Option.flatMap((job) => Arr.get(stepsOf(job), found.step)),
      Option.map((step) => Option.getOrNull(usageOf(coordinateOf(found))(stepView(step)))),
      Option.getOrElse((): unknown => NOT_BUILT),
    );

const usageOutcome =
  (root: string) =>
  (found: Case<"coordinateUsage">): Checked =>
    Effect.map(
      inputFor({
        root,
        path: `.github/workflows/${found.id}.yml`,
        kind: "workflow",
        text: found.source,
      }),
      (input): Outcome => ({
        id: found.id,
        want: found.result,
        have: Option.match(input, { onNone: () => NOT_BUILT, onSome: usageJson(found) }),
      }),
    );

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches zizmor's unit tests for action coordinate usage", () =>
  Effect.gen(function* matchesZizmorUsage() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const units = yield* Schema.decodeEffect(Recorded)(text);
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const outcomes = yield* pipe(
      units.coordinateUsage,
      Effect.forEach(usageOutcome(dir), SEQUENTIAL),
    );
    expect(verdictOf(knownIds(knownText))(outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
