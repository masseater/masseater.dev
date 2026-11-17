import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";
import type { AllowWarnDeny, OxlintOverride } from "vite-plus/lint";

import { readManifest } from "#/entities/package/index.ts";
import {
  deployEntries,
  literalSettings,
  merged,
  programOf,
  settingsInvalid,
  usedFrom,
  workspaceDirectories,
  prefixed,
  NO_TASKS,
  TEST_TASK,
  definesTask,
  tasksOf,
} from "#/entities/workspace/index.ts";
import type { WorkspaceSource, WorkspaceTasks } from "#/entities/workspace/index.ts";
import { RepositoryFiles, nodeRepositoryFiles } from "#/shared/lib/repository-files.ts";

import type { IgnoredDirectory } from "./ignored-directories.ts";
import { shadcnUiIn } from "./shadcn-ui.ts";
import { directoryLayoutIn } from "./source-directories.ts";
import { publicEntryFiles } from "./workspace-public-entries.ts";

export type RuleSet = Readonly<Record<string, unknown>>;
export type RuleSets = Readonly<Record<string, RuleSet>>;
export type DependencySets = Readonly<Record<string, readonly string[]>>;

const CONFIG_FILE = "vite.config.ts";
const SHADCN_FILE = "components.json";
const READ_CONCURRENCY = 16;
const MSCH_LINT = ["msch", "lint"] as const;
const MSCH_DEV_DEPENDENCIES = ["msch", "devDependencies"] as const;

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
const Names = Schema.optional(Schema.Array(Schema.String));
const WorkspaceOverride = Schema.Struct({
  files: Schema.Array(Schema.String),
  excludeFiles: Names,
  rules: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  use: Names,
});
const WorkspaceLintSettings = Schema.Struct({
  ignorePatterns: Names,
  overrides: Schema.optional(Schema.Array(WorkspaceOverride)),
});
const DevDependencySettings = Schema.Struct({ use: Names, dependencies: Names });
const WorkspaceDevDependencies = Schema.Record(Schema.String, DevDependencySettings);

export interface DevDependencyAllowance {
  readonly workspaces: readonly string[];
  readonly dependencies: readonly string[];
}

export interface WorkspaceLint {
  readonly ignorePatterns: readonly string[];
  readonly overrides: readonly OxlintOverride[];
  readonly shadcnUi: readonly string[];
  readonly publicEntries: readonly string[];
  readonly deployEntries: readonly string[];
}

export interface WorkspaceSettings {
  readonly lint: WorkspaceLint;
  readonly sourceDirectories: readonly string[];
  readonly ignoredDirectories: readonly IgnoredDirectory[];
  readonly testProjects: readonly string[];
  readonly tasks: WorkspaceTasks;
  readonly devDependencies: Readonly<Record<string, DevDependencyAllowance>>;
}

export interface SettingsOptions {
  readonly root: string;
  readonly ruleSets: RuleSets;
  readonly dependencySets: DependencySets;
}

interface Workspace {
  readonly directory: string;
  readonly ignorePatterns: readonly string[];
  readonly overrides: readonly OxlintOverride[];
  readonly devDependencies: Readonly<Record<string, DevDependencyAllowance>>;
  readonly ownTests: boolean;
  readonly tasks: WorkspaceTasks;
  readonly publicEntries: readonly string[];
}

const overrideOf = Effect.fn("overrideOf")(function* overrideOf(
  source: WorkspaceSource,
  ruleSets: RuleSets,
  override: typeof WorkspaceOverride.Type,
) {
  const { file, directory } = source;
  const fromSets = yield* usedFrom(file, ruleSets, override.use ?? []);
  const rules = yield* decodeRules(merged([...fromSets, override.rules ?? {}])).pipe(
    Effect.mapError((error) => settingsInvalid(file)(error.message)),
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

const lintOf = Effect.fn("lintOf")(function* lintOf(source: WorkspaceSource, ruleSets: RuleSets) {
  const settings = yield* literalSettings({
    source,
    path: MSCH_LINT,
    decode: Schema.decodeUnknownEffect(WorkspaceLintSettings),
  });
  const lint = Option.getOrElse(settings, (): typeof WorkspaceLintSettings.Type => ({}));
  const overrides = yield* Effect.forEach(
    lint.overrides ?? [],
    (override) => overrideOf(source, ruleSets, override),
    { concurrency: 1 },
  );
  const ignorePatterns = pipe(lint.ignorePatterns ?? [], Arr.map(prefixed(source.directory)));
  return { ignorePatterns, overrides };
});

const allowanceOf = Effect.fn("allowanceOf")(function* allowanceOf(
  source: WorkspaceSource,
  dependencySets: DependencySets,
  [reason, allowance]: readonly [string, typeof DevDependencySettings.Type],
) {
  const sets = yield* usedFrom(source.file, dependencySets, allowance.use ?? []);
  const dependencies = [...Arr.flatten(sets), ...(allowance.dependencies ?? [])];
  return [
    `${source.directory}: ${reason}`,
    { workspaces: [source.directory], dependencies },
  ] as const;
});

const devDependenciesOf = Effect.fn("devDependenciesOf")(function* devDependenciesOf(
  source: WorkspaceSource,
  dependencySets: DependencySets,
) {
  const settings = yield* literalSettings({
    source,
    path: MSCH_DEV_DEPENDENCIES,
    decode: Schema.decodeUnknownEffect(WorkspaceDevDependencies),
  });
  const allowed = Rec.toEntries(Option.getOrElse(settings, () => ({})));
  const entries = yield* Effect.forEach(
    allowed,
    (entry) => allowanceOf(source, dependencySets, entry),
    {
      concurrency: 1,
    },
  );
  return Rec.fromEntries(entries);
});

const settingsOf = Effect.fn("settingsOf")(function* settingsOf(
  source: WorkspaceSource,
  options: SettingsOptions,
) {
  const lint = yield* lintOf(source, options.ruleSets);
  const devDependencies = yield* devDependenciesOf(source, options.dependencySets);
  const ownTests = definesTask(TEST_TASK)(source.program);
  const files = yield* RepositoryFiles;
  const manifest = yield* readManifest(files.dirname(source.file));
  const tasks = tasksOf(manifest)(source.program);
  return { directory: source.directory, ...lint, devDependencies, ownTests, tasks };
});

const workspaceIn = Effect.fn("workspaceIn")(function* workspaceIn(
  options: SettingsOptions,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(options.root, directory, CONFIG_FILE);
  const text = yield* files.readFile(file);
  if (Option.isNone(text)) {
    const publicEntries = yield* publicEntryFiles(options.root, directory, Option.none());
    return {
      directory,
      ignorePatterns: [],
      overrides: [],
      devDependencies: {},
      ownTests: false,
      tasks: NO_TASKS,
      publicEntries,
    };
  }
  const program = yield* programOf(file, text.value);
  const settings = yield* settingsOf({ file, directory, program }, options);
  const publicEntries = yield* publicEntryFiles(options.root, directory, Option.some(program));
  return { ...settings, publicEntries };
});

const mergedTasks = (found: readonly { readonly tasks: WorkspaceTasks }[]): WorkspaceTasks => ({
  verify: pipe(
    found,
    Arr.flatMap(({ tasks }) => tasks.verify),
  ),
  native: pipe(
    found,
    Arr.flatMap(({ tasks }) => tasks.native),
  ),
});

const collectWorkspaceSettings = Effect.fn("collectWorkspaceSettings")(
  function* collectWorkspaceSettings(options: SettingsOptions) {
    const files = yield* RepositoryFiles;
    const directories = yield* workspaceDirectories(options.root);
    const found: readonly Workspace[] = yield* Effect.forEach(
      directories,
      (directory) => workspaceIn(options, directory),
      { concurrency: READ_CONCURRENCY },
    );
    const shadcnUi = yield* Effect.forEach(
      directories,
      (directory) => shadcnUiIn(options.root, files.join(directory, SHADCN_FILE)),
      { concurrency: READ_CONCURRENCY },
    );
    return {
      ...(yield* directoryLayoutIn(options.root, directories)),
      lint: {
        ignorePatterns: pipe(
          found,
          Arr.flatMap(({ ignorePatterns }) => ignorePatterns),
        ),
        overrides: pipe(
          found,
          Arr.flatMap(({ overrides }) => overrides),
        ),
        shadcnUi: Arr.getSomes(shadcnUi),
        publicEntries: pipe(
          found,
          Arr.flatMap(({ publicEntries }) => publicEntries),
        ),
        deployEntries: yield* deployEntries(options.root),
      },
      testProjects: pipe(
        found,
        Arr.filter(({ ownTests }) => !ownTests),
        Arr.map(({ directory }) => directory),
      ),
      tasks: mergedTasks(found),
      devDependencies: merged(
        pipe(
          found,
          Arr.map(({ devDependencies }) => devDependencies),
        ),
      ),
    };
  },
);

export const workspaceSettings = (options: SettingsOptions): Promise<WorkspaceSettings> =>
  Effect.runPromise(collectWorkspaceSettings(options).pipe(Effect.provide(nodeRepositoryFiles)));

export type { WorkspaceTasks } from "#/entities/workspace/index.ts";
