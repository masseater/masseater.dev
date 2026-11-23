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

import { splitPatterns } from "#/features/audit-workflows/model/rules/artipacked-steps.ts";

import { asBare, envIsStatic, extractAllFenced, extractFenced } from "./expressions.ts";
import type { FencedAt } from "./expressions.ts";
import { normalizeShell } from "./shell.ts";
import {
  commentVersionOf,
  isAtLeast,
  isBefore,
  parseVersion,
  ratchetVersionOf,
} from "./version.ts";
import type { Version } from "./version.ts";
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

const fencedJson = ({ expr, start, end }: FencedAt): unknown => ({ raw: expr.raw, start, end });

const versionJson = (version: Version): unknown => ({
  major: version.major,
  minor: version.minor,
  patch: version.patch,
});

const orderingOf = (lhs: Version, rhs: Version): string => {
  if (isBefore(rhs)(lhs)) {
    return "Less";
  }
  if (isAtLeast(lhs)(rhs)) {
    return "Equal";
  }
  return "Greater";
};

const split = (found: Case<"splitPatterns">): Outcome => ({
  id: found.id,
  want: found.output,
  have: splitPatterns(found.input),
});

const fenced = (found: Case<"extractFenced">): Outcome => ({
  id: found.id,
  want: { bare: found.bare, raw: found.raw, start: found.start, end: found.end },
  have: pipe(
    extractFenced(found.text)(found.offset),
    Option.map(({ expr, start, end }) => ({ bare: asBare(expr), raw: expr.raw, start, end })),
    Option.getOrNull,
  ),
});

const allFenced = (found: Case<"extractAllFenced">): Outcome => ({
  id: found.id,
  want: found.result,
  have: pipe(extractAllFenced(found.text), Arr.map(fencedJson)),
});

const shell = (found: Case<"normalizeShell">): Outcome => ({
  id: found.id,
  want: found.output,
  have: normalizeShell(found.input),
});

const staticEnv = (found: Case<"envIsStatic">): Outcome => ({
  id: found.id,
  want: found.result,
  have: pipe(
    contextOf(found.context),
    Option.map((context) => envIsStatic(context)([])),
    Option.getOrNull,
  ),
});

const captured =
  (capture: (raw: string) => Option.Option<string>) =>
  (found: Case<"versionComment">): Outcome => ({
    id: found.id,
    want: found.capture,
    have: Option.getOrNull(capture(found.comment)),
  });

const parsed = (found: Case<"versionParse">): Outcome => ({
  id: found.id,
  want: found.result,
  have: pipe(parseVersion(found.input), Option.map(versionJson), Option.getOrNull),
});

const compared = (found: Case<"versionCompare">): Outcome => ({
  id: found.id,
  want: found.ordering,
  have: pipe(
    Option.all([parseVersion(found.lhs), parseVersion(found.rhs)]),
    Option.map(([lhs, rhs]) => orderingOf(lhs, rhs)),
    Option.getOrNull,
  ),
});

const outcomesOf = (units: Units): readonly Outcome[] => [
  ...pipe(units.splitPatterns, Arr.map(split)),
  ...pipe(units.extractFenced, Arr.map(fenced)),
  ...pipe(units.extractAllFenced, Arr.map(allFenced)),
  ...pipe(units.normalizeShell, Arr.map(shell)),
  ...pipe(units.envIsStatic, Arr.map(staticEnv)),
  ...pipe(units.versionComment, Arr.map(captured(commentVersionOf))),
  ...pipe(units.ratchetComment, Arr.map(captured(ratchetVersionOf))),
  ...pipe(units.versionParse, Arr.map(parsed)),
  ...pipe(units.versionCompare, Arr.map(compared)),
];

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches zizmor's unit tests for fenced expressions, shells and versions", () =>
  Effect.gen(function* matchesZizmorText() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const units = yield* Schema.decodeEffect(Recorded)(text);
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const verdict = verdictOf(knownIds(knownText))(outcomesOf(units));
    expect(verdict).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
