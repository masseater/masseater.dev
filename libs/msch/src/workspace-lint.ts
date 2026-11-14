import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { parse } from "vite-plus";
import type { AllowWarnDeny, OxlintOverride } from "vite-plus/lint";

import { literalOf, nestedValues } from "./config-literal.ts";
import { RepositoryFiles, nodeRepositoryFiles } from "./repository-files.ts";
import { shadcnUiIn } from "./shadcn-ui.ts";
import { prefixed } from "./workspace-patterns.ts";

type RuleSet = Readonly<Record<string, unknown>>;
type RuleSets = Readonly<Record<string, RuleSet>>;

const CONFIG_FILE = "vite.config.ts";
const SHADCN_FILE = "components.json";
const SEPARATOR = "/";
const READ_CONCURRENCY = 16;
const SINGLE = 1;
const MSCH_LINT = ["msch", "lint"] as const;

type SeverityName = Extract<AllowWarnDeny, string>;

const SEVERITY_NAMES: Readonly<Record<SeverityName, true>> = {
  off: true,
  allow: true,
  warn: true,
  error: true,
  deny: true,
};
const Severity = Schema.Literals<readonly SeverityName[]>(Rec.keys(SEVERITY_NAMES));
const SeverityWithOptions = Schema.mutable(
  Schema.TupleWithRest(Schema.Tuple([Severity]), [Schema.Unknown]),
);
const RuleSetting = Schema.Union([Severity, SeverityWithOptions]);
const Rules = Schema.Record(Schema.String, RuleSetting);
const decodeRules = Schema.decodeUnknownEffect(Rules);
const WorkspaceOverride = Schema.Struct({
  files: Schema.Array(Schema.String),
  excludeFiles: Schema.optional(Schema.Array(Schema.String)),
  rules: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  use: Schema.optional(Schema.Array(Schema.String)),
});
const WorkspaceLintSettings = Schema.Struct({
  ignorePatterns: Schema.optional(Schema.Array(Schema.String)),
  overrides: Schema.optional(Schema.Array(WorkspaceOverride)),
});

const NOT_LITERAL =
  "msch.lint must be written with literal values, because the root vite.config.ts reads it without running this file. Name a rule set of the root config in use instead of importing rules.";

const taggedError = Schema.TaggedError;

class WorkspaceLintInvalid extends taggedError<
  WorkspaceLintInvalid,
  { readonly brand: unique symbol }
>()("WorkspaceLintInvalid", { file: Schema.String, reason: Schema.String }) {
  public override get message(): string {
    return `${this.file}: ${this.reason}`;
  }
}

interface WorkspaceSettings {
  readonly ignorePatterns: readonly string[];
  readonly overrides: readonly OxlintOverride[];
}

interface WorkspaceLint {
  readonly ignorePatterns: readonly string[];
  readonly overrides: readonly OxlintOverride[];
  readonly shadcnUi: readonly string[];
}

interface OverrideSource {
  readonly file: string;
  readonly directory: string;
  readonly ruleSets: RuleSets;
  readonly override: typeof WorkspaceOverride.Type;
}

const NONE: WorkspaceSettings = { ignorePatterns: [], overrides: [] };

const mergedRules = (rules: readonly RuleSet[]): RuleSet =>
  pipe(rules, Arr.flatMap(Rec.toEntries), Rec.fromEntries);

const overrideOf = Effect.fn("overrideOf")(function* overrideOf(source: OverrideSource) {
  const { file, directory, ruleSets, override } = source;
  const used = override.use ?? [];
  const unknownSets = pipe(
    used,
    Arr.filter((name) => !Rec.has(ruleSets, name)),
  );
  if (Arr.isReadonlyArrayNonEmpty(unknownSets)) {
    return yield* WorkspaceLintInvalid.make({
      file,
      reason: `msch.lint uses rule sets the root does not define: ${Arr.join(unknownSets, ", ")}. Defined: ${Arr.join(Rec.keys(ruleSets), ", ")}.`,
    });
  }
  const fromSets = pipe(
    used,
    Arr.flatMap((name) => Option.toArray(Rec.get(ruleSets, name))),
  );
  const rules = yield* decodeRules(mergedRules([...fromSets, override.rules ?? {}])).pipe(
    Effect.mapError((error) => WorkspaceLintInvalid.make({ file, reason: error.message })),
  );
  const files = pipe(override.files, Arr.map(prefixed(directory)));
  return pipe(
    Option.fromUndefinedOr(override.excludeFiles),
    Option.match({
      onNone: (): OxlintOverride => ({ files, rules }),
      onSome: (excluded): OxlintOverride => ({
        files,
        excludeFiles: pipe(excluded, Arr.map(prefixed(directory))),
        rules,
      }),
    }),
  );
});

const mschLintIn = Effect.fn("mschLintIn")(function* mschLintIn(file: string, source: string) {
  const parsed = yield* Effect.promise(() => parse(file, source, { lang: "ts" }));
  if (Arr.isReadonlyArrayNonEmpty(parsed.errors)) {
    return yield* WorkspaceLintInvalid.make({ file, reason: "vite.config.ts does not parse." });
  }
  const found = nestedValues(MSCH_LINT)(parsed.program);
  if (found.length > SINGLE) {
    return yield* WorkspaceLintInvalid.make({ file, reason: "msch.lint appears more than once." });
  }
  return Arr.head(found);
});

const settingsIn = Effect.fn("settingsIn")(function* settingsIn(file: string, source: string) {
  const node = yield* mschLintIn(file, source);
  if (Option.isNone(node)) {
    return Option.none();
  }
  const literal = literalOf(node.value);
  if (Option.isNone(literal)) {
    return yield* WorkspaceLintInvalid.make({ file, reason: NOT_LITERAL });
  }
  const settings = yield* Schema.decodeUnknownEffect(WorkspaceLintSettings)(literal.value).pipe(
    Effect.mapError((error) => WorkspaceLintInvalid.make({ file, reason: error.message })),
  );
  return Option.some(settings);
});

const lintIn = Effect.fn("lintIn")(function* lintIn(
  root: string,
  name: string,
  ruleSets: RuleSets,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, name);
  const source = yield* files.readFile(file);
  const settings = yield* pipe(
    source,
    Option.match({
      onNone: () => Effect.succeedNone,
      onSome: (text) => settingsIn(file, text),
    }),
  );
  if (Option.isNone(settings)) {
    return NONE;
  }
  const directory = files.dirname(name);
  const overrides = yield* pipe(
    settings.value.overrides ?? [],
    Effect.forEach((override) => overrideOf({ file, directory, ruleSets, override })),
  );
  const ignorePatterns = pipe(settings.value.ignorePatterns ?? [], Arr.map(prefixed(directory)));
  return { ignorePatterns, overrides };
});

const collectWorkspaceLint = Effect.fn("collectWorkspaceLint")(function* collectWorkspaceLint(
  root: string,
  ruleSets: RuleSets,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const named = (base: string): readonly string[] =>
    pipe(
      listed,
      Arr.filter((name) => files.basename(name) === base && Str.includes(SEPARATOR)(name)),
    );
  const found = yield* Effect.forEach(named(CONFIG_FILE), (name) => lintIn(root, name, ruleSets), {
    concurrency: READ_CONCURRENCY,
  });
  const shadcnUi = yield* Effect.forEach(named(SHADCN_FILE), (name) => shadcnUiIn(root, name), {
    concurrency: READ_CONCURRENCY,
  });
  return {
    ignorePatterns: pipe(
      found,
      Arr.flatMap((settings) => settings.ignorePatterns),
    ),
    overrides: pipe(
      found,
      Arr.flatMap((settings) => settings.overrides),
    ),
    shadcnUi: Arr.getSomes(shadcnUi),
  };
});

const workspaceLint = (
  settings: Readonly<{ root: string; ruleSets: RuleSets }>,
): Promise<WorkspaceLint> =>
  Effect.runPromise(
    collectWorkspaceLint(settings.root, settings.ruleSets).pipe(
      Effect.provide(nodeRepositoryFiles),
    ),
  );

export { workspaceLint };
export type { RuleSet, RuleSets, WorkspaceLint };
