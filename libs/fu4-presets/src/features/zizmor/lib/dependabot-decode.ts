import { Option, Result, pipe } from "effect";

import type { DependabotModel, UpdateModel } from "#/features/zizmor/model/dependabot.ts";

import {
  anyScalar,
  boolean,
  defaulted,
  literal,
  number,
  optional,
  record,
  required,
  scalarOrVector,
  sequence,
  string,
  struct,
} from "./decode.ts";
import type { Decoder, Fields } from "./decode.ts";

const ECOSYSTEMS = [
  "bazel",
  "bun",
  "bundler",
  "cargo",
  "composer",
  "conda",
  "deno",
  "devcontainers",
  "docker",
  "docker-compose",
  "dotnet-sdk",
  "helm",
  "julia",
  "elm",
  "gitsubmodule",
  "github-actions",
  "gomod",
  "gradle",
  "maven",
  "mix",
  "nix",
  "npm",
  "nuget",
  "opentofu",
  "pip",
  "pre-commit",
  "pub",
  "rust-toolchain",
  "sbt",
  "swift",
  "terraform",
  "uv",
  "vcpkg",
] as const;
const INTERVALS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semiannually",
  "yearly",
  "cron",
] as const;
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const DEPENDENCY_TYPES = ["direct", "indirect", "all", "production", "development"] as const;

const MINIMUM = 0;
const NO_LIMIT = 0;
const DIGITS = /^\d+$/u;

const noStrings = (): readonly string[] => [];
const noEntries = <Value>(): ReadonlyMap<string, Value> => new Map();

const unsigned: Decoder<number> = (node) =>
  pipe(
    number(node),
    Result.flatMap((value) =>
      Result.liftPredicate(
        value,
        (each) => node.tag === "!!int" && each >= MINIMUM,
        () => "expected u64",
      ),
    ),
  );

const lenientUnsigned: Decoder<number> = (node) =>
  pipe(
    anyScalar(node),
    Result.flatMap((text) =>
      Result.liftPredicate(
        Number(text),
        (value) => DIGITS.test(text) && value >= MINIMUM,
        () => "expected u64",
      ),
    ),
  );

const strings = sequence(string);
const intervals = literal(INTERVALS);
const days = literal(DAYS);
const dependencyTypes = literal(DEPENDENCY_TYPES);
const updateTypes = sequence(literal(["major", "minor", "patch"]));
const insecureModes = literal(["allow", "deny"]);
const ecosystems = literal(ECOSYSTEMS);
const rebaseStrategies = literal(["auto", "disabled"]);
const registries = scalarOrVector(string);
const versioningStrategies = literal([
  "auto",
  "increase",
  "increase-if-necessary",
  "lockfile-only",
  "widen",
]);

const schedule = struct((fields) =>
  Result.gen(function* decode() {
    const interval = yield* required("interval")(intervals)(fields);
    yield* optional("day")(days)(fields);
    yield* optional("time")(string)(fields);
    yield* optional("timezone")(string)(fields);
    const cronjob = yield* optional("cronjob")(string)(fields);
    if ((interval === "cron") !== Option.isSome(cronjob)) {
      return yield* Result.fail("invalid schedule");
    }
    return interval;
  }),
);

const commitMessage = struct((fields) =>
  Result.all([
    optional("prefix")(string)(fields),
    optional("prefix-development")(string)(fields),
    optional("include")(string)(fields),
  ]),
);

const branchName = struct((fields) => optional("separator")(string)(fields));

const cooldown = struct((fields) =>
  Result.gen(function* decode() {
    const defaultDays = yield* optional("default-days")(unsigned)(fields);
    yield* optional("semver-major-days")(unsigned)(fields);
    yield* optional("semver-minor-days")(unsigned)(fields);
    yield* optional("semver-patch-days")(unsigned)(fields);
    yield* defaulted("include")(strings)(noStrings)(fields);
    yield* defaulted("exclude")(strings)(noStrings)(fields);
    return { defaultDays };
  }),
);

const group = struct((fields) =>
  Result.all([
    optional("dependency-type")(dependencyTypes)(fields),
    defaulted("patterns")(strings)(noStrings)(fields),
    defaulted("exclude-patterns")(strings)(noStrings)(fields),
    defaulted("update-types")(updateTypes)(() => [])(fields),
  ]),
);

const allowEntries = sequence(
  struct((each) =>
    Result.all([
      optional("dependency-name")(string)(each),
      optional("dependency-type")(dependencyTypes)(each),
    ]),
  ),
);

const groups = record(group);

const validateUpdate = (fields: Fields): Result.Result<unknown, string> =>
  Result.all([
    defaulted("allow")(allowEntries)(() => [])(fields),
    defaulted("assignees")(strings)(noStrings)(fields),
    defaulted("groups")(groups)(noEntries)(fields),
    defaulted("open-pull-requests-limit")(unsigned)(() => NO_LIMIT)(fields),
    defaulted("rebase-strategy")(rebaseStrategies)(() => "auto" as const)(fields),
    defaulted("registries")(registries)(noStrings)(fields),
    defaulted("reviewers")(strings)(noStrings)(fields),
    optional("schedule")(schedule)(fields),
    defaulted("vendor")(boolean)(() => false)(fields),
    optional("versioning-strategy")(versioningStrategies)(fields),
    optional("exclude-paths")(strings)(fields),
  ]);

interface Placement {
  readonly directory: Option.Option<string>;
  readonly directories: Option.Option<readonly string[]>;
  readonly multiEcosystemGroup: Option.Option<string>;
  readonly patterns: Option.Option<readonly string[]>;
  readonly milestone: Option.Option<number>;
  readonly targetBranch: Option.Option<string>;
  readonly commitMessage: Option.Option<unknown>;
  readonly branchName: Option.Option<unknown>;
}

const placementOf = (fields: Fields): Result.Result<Placement, string> =>
  Result.all({
    directory: optional("directory")(string)(fields),
    directories: optional("directories")(strings)(fields),
    multiEcosystemGroup: optional("multi-ecosystem-group")(string)(fields),
    patterns: optional("patterns")(strings)(fields),
    milestone: optional("milestone")(unsigned)(fields),
    targetBranch: optional("target-branch")(string)(fields),
    commitMessage: optional("commit-message")(commitMessage)(fields),
    branchName: optional("pull-request-branch-name")(branchName)(fields),
  });

const conflictsWithGroup = (placement: Placement): boolean =>
  Option.isNone(placement.patterns) ||
  Option.isSome(placement.milestone) ||
  Option.isSome(placement.targetBranch) ||
  Option.isSome(placement.commitMessage) ||
  Option.isSome(placement.branchName);

const checkPlacement = (placement: Placement): Result.Result<Option.Option<string>, string> => {
  if (Option.isNone(placement.directory) && Option.isNone(placement.directories)) {
    return Result.fail("missing directory");
  }
  if (Option.isSome(placement.multiEcosystemGroup) && conflictsWithGroup(placement)) {
    return Result.fail("invalid multi-ecosystem-group");
  }
  return Result.succeed(placement.multiEcosystemGroup);
};

const update: Decoder<UpdateModel> = struct((fields) =>
  Result.gen(function* decode() {
    yield* validateUpdate(fields);
    const multiEcosystemGroup = yield* pipe(placementOf(fields), Result.flatMap(checkPlacement));
    const packageEcosystem = yield* required("package-ecosystem")(ecosystems)(fields);
    const insecureExternalCodeExecution = yield* defaulted("insecure-external-code-execution")(
      insecureModes,
    )(() => "deny" as const)(fields);
    const cooldownOf = yield* optional("cooldown")(cooldown)(fields);
    return {
      packageEcosystem,
      insecureExternalCodeExecution,
      cooldown: cooldownOf,
      multiEcosystemGroup,
    };
  }),
);

const multiGroup = struct((fields) =>
  Result.all([
    required("schedule")(schedule)(fields),
    defaulted("labels")(strings)(noStrings)(fields),
    optional("milestone")(unsigned)(fields),
    defaulted("assignees")(strings)(noStrings)(fields),
    optional("target-branch")(string)(fields),
    optional("commit-message")(commitMessage)(fields),
    optional("pull-request-branch-name")(branchName)(fields),
  ]),
);

const multiGroups = record(multiGroup);

const updates = sequence(update);

export const decodeDependabot: Decoder<DependabotModel> = struct((fields) =>
  Result.gen(function* decode() {
    yield* required("version")(lenientUnsigned)(fields);
    yield* defaulted("enable-beta-ecosystems")(boolean)(() => false)(fields);
    yield* defaulted("multi-ecosystem-groups")(multiGroups)(noEntries)(fields);
    const decoded = yield* required("updates")(updates)(fields);
    return { updates: decoded };
  }),
);
