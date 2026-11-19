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

import type { AuditInput } from "#/features/audit-workflows/model/input.ts";
import type { MatrixView } from "#/features/audit-workflows/model/step.ts";

import { fencedInRoute } from "./expressions.ts";
import { expandsToStaticValues } from "./matrix.ts";
import { matrixOf, normalJobsOf } from "./workflow.ts";
import { NOT_BUILT, SEQUENTIAL, inputFor, workflowOf } from "./zizmor-units-inputs.test.support.ts";
import type { Checked } from "./zizmor-units-inputs.test.support.ts";
import {
  FIXTURE,
  KNOWN,
  Recorded,
  contextOf,
  knownIds,
  verdictOf,
} from "./zizmor-units.test.support.ts";
import type { Outcome, Units } from "./zizmor-units.test.support.ts";

type Case<Kind extends keyof Units> = Units[Kind][number];

const KINDS = { Action: "action", Workflow: "workflow" } as const;

const fencedOf = (input: AuditInput): unknown =>
  pipe(
    fencedInRoute(input.document)([]),
    Arr.map(({ expr, start, end }) => ({ raw: expr.raw, start, end })),
  );

const staticOf =
  (matrix: MatrixView) =>
  ({ context }: { readonly context: string }): unknown => ({
    context,
    result: pipe(contextOf(context), Option.map(expandsToStaticValues(matrix)), Option.getOrNull),
  });

const viewJson =
  (found: Case<"matrix">) =>
  (matrix: MatrixView): unknown => ({
    expansions: pipe(
      matrix.expansions,
      Arr.map(({ path, value, location }) => ({ path, value, route: location.route })),
    ),
    indirectlyExpanded: Option.isSome(matrix.indirectlyExpanded),
    indirectInclusions: Option.isSome(matrix.indirectInclusions),
    indirectExclusions: Option.isSome(matrix.indirectExclusions),
    static: pipe(found.static, Arr.map(staticOf(matrix))),
  });

const matrixJson =
  (found: Case<"matrix">) =>
  (input: AuditInput): unknown =>
    pipe(
      workflowOf(input),
      Option.flatMap((workflow) =>
        pipe(
          normalJobsOf(workflow),
          Arr.findFirst((job) => job.id === found.job),
        ),
      ),
      Option.flatMap(matrixOf),
      Option.match({ onNone: () => NOT_BUILT, onSome: viewJson(found) }),
    );

const fencedOutcome =
  (root: string) =>
  (found: Case<"fencedInInput">): Checked =>
    Effect.map(
      inputFor({
        root,
        path: `${found.id}/${KINDS[found.input]}.yml`,
        kind: KINDS[found.input],
        text: found.source,
      }),
      (input): Outcome => ({
        id: found.id,
        want: found.result,
        have: Option.match(input, { onNone: () => NOT_BUILT, onSome: fencedOf }),
      }),
    );

const matrixOutcome =
  (root: string) =>
  (found: Case<"matrix">): Checked =>
    Effect.map(
      inputFor({
        root,
        path: `.github/workflows/${found.id}.yml`,
        kind: "workflow",
        text: found.source,
      }),
      (input): Outcome => ({
        id: found.id,
        want: {
          expansions: found.expansions,
          indirectlyExpanded: found.indirectlyExpanded,
          indirectInclusions: found.indirectInclusions,
          indirectExclusions: found.indirectExclusions,
          static: found.static,
        },
        have: Option.match(input, { onNone: () => NOT_BUILT, onSome: matrixJson(found) }),
      }),
    );

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches zizmor's unit tests for fenced expressions in inputs and matrices", () =>
  Effect.gen(function* matchesZizmorMatrix() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const units = yield* Schema.decodeEffect(Recorded)(text);
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const fenced = yield* pipe(units.fencedInInput, Effect.forEach(fencedOutcome(dir), SEQUENTIAL));
    const matrices = yield* pipe(units.matrix, Effect.forEach(matrixOutcome(dir), SEQUENTIAL));
    const verdict = verdictOf(knownIds(knownText))([...fenced, ...matrices]);
    expect(verdict).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
