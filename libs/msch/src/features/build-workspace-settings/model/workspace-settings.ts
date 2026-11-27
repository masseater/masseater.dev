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
  writeLockedClosures,
  prefixed,
  shadcnUiIn,
  NO_TASKS,
  tasksOf,
  testsItself,
} from "#/entities/workspace/index.ts";
import type { WorkspaceSource, WorkspaceTasks } from "#/entities/workspace/index.ts";
import { collectIgnoredDirectories } from "#/shared/lib/ignored-directories.ts";
import type { IgnoredDirectory } from "#/shared/lib/ignored-directories.ts";
import { RepositoryFiles, nodeRepositoryFiles } from "#/shared/lib/repository-files.ts";

import { MSCH_DEPENDENCIES, MSCH_DEV_DEPENDENCIES, allowancesOf } from "./dependency-allowances.ts";
import type { DependencyAllowances, DependencySets } from "./dependency-allowances.ts";
import { sharedTestProject, testProjectOf } from "./test-project.ts";
import type { TestProject } from "./test-project.ts";
import { publicEntryFiles } from "./workspace-public-entries.ts";

export type RuleSet = Readonly<Record<string, unknown>>;
export type RuleSets = Readonly<Record<string, RuleSet>>;

const CONFIG_FILE = "vite.config.ts";
const READ_CONCURRENCY = 16;
const ROOT_WORKSPACE = ".";
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
const Names = Schema.String.pipe(Schema.Array, Schema.optional);
const WorkspaceOverride = Schema.Struct({
  files: Schema.Array(Schema.String),
  excludeFiles: Names,
  rules: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  use: Names,
});
const WorkspaceLintSettings = Schema.Struct({
  ignorePatterns: Names,
  overrides: WorkspaceOverride.pipe(Schema.Array, Schema.optional),
});

export interface WorkspaceLint {
  readonly ignorePatterns: readonly string[];
  readonly overrides: readonly OxlintOverride[];
  readonly shadcnUi: readonly string[];
  readonly publicEntries: readonly string[];
  readonly deployEntries: readonly string[];
}

export interface WorkspaceSettings {
  readonly lint: WorkspaceLint;
  readonly members: readonly string[];
  readonly ignoredDirectories: readonly IgnoredDirectory[];
  readonly testProjects: readonly TestProject[];
  readonly tasks: WorkspaceTasks;
  readonly devDependencies: DependencyAllowances;
  readonly dependencies: DependencyAllowances;
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
  readonly devDependencies: DependencyAllowances;
  readonly dependencies: DependencyAllowances;
  readonly ownTests: boolean;
  readonly testProject: TestProject;
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

const settingsOf = Effect.fn("settingsOf")(function* settingsOf(
  source: WorkspaceSource,
  options: SettingsOptions,
) {
  const lint = yield* lintOf(source, options.ruleSets);
  const devDependencies = yield* allowancesOf(
    source,
    options.dependencySets,
    MSCH_DEV_DEPENDENCIES,
  );
  const dependencies = yield* allowancesOf(source, options.dependencySets, MSCH_DEPENDENCIES);
  const ownTests = testsItself(source.program);
  const files = yield* RepositoryFiles;
  const manifest = yield* readManifest(files.dirname(source.file));
  const tasks = tasksOf(manifest)(source.program);
  const testProject = yield* testProjectOf(source, `${source.directory}/${CONFIG_FILE}`, manifest);
  return {
    directory: source.directory,
    ...lint,
    devDependencies,
    dependencies,
    ownTests,
    testProject,
    tasks,
  };
});

const unconfiguredWorkspace = Effect.fn("unconfiguredWorkspace")(function* unconfiguredWorkspace(
  root: string,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const publicEntries = yield* publicEntryFiles(root, directory, Option.none());
  const manifest = yield* readManifest(files.join(root, directory));
  return {
    directory,
    ignorePatterns: [],
    overrides: [],
    devDependencies: {},
    dependencies: {},
    ownTests: false,
    testProject: sharedTestProject(manifest)({ directory, config: false }),
    tasks: NO_TASKS,
    publicEntries,
  };
});

const workspaceIn = Effect.fn("workspaceIn")(function* workspaceIn(
  options: SettingsOptions,
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(options.root, directory, CONFIG_FILE);
  const text = yield* files.readFile(file);
  if (Option.isNone(text)) {
    return yield* unconfiguredWorkspace(options.root, directory);
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

const mergedAllowances = (
  found: readonly Workspace[],
): Pick<Workspace, "devDependencies" | "dependencies"> => ({
  devDependencies: merged(
    pipe(
      found,
      Arr.map(({ devDependencies }) => devDependencies),
    ),
  ),
  dependencies: merged(
    pipe(
      found,
      Arr.map(({ dependencies }) => dependencies),
    ),
  ),
});

const collectWorkspaceSettings = Effect.fn("collectWorkspaceSettings")(
  function* collectWorkspaceSettings(options: SettingsOptions) {
    yield* Effect.ignore(writeLockedClosures(options.root));
    const directories = yield* workspaceDirectories(options.root);
    const found: readonly Workspace[] = yield* Effect.forEach(
      directories,
      (directory) => workspaceIn(options, directory),
      { concurrency: READ_CONCURRENCY },
    );
    const shadcnUi = yield* Effect.forEach(
      directories,
      (directory) => shadcnUiIn(options.root, directory),
      { concurrency: READ_CONCURRENCY },
    );
    return {
      members: pipe(
        directories,
        Arr.filter((directory) => directory !== ROOT_WORKSPACE),
      ),
      ignoredDirectories: yield* collectIgnoredDirectories(options.root),
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
        Arr.map(({ testProject }) => testProject),
      ),
      tasks: mergedTasks(found),
      ...mergedAllowances(found),
    };
  },
);

export const workspaceSettings = (options: SettingsOptions): Promise<WorkspaceSettings> =>
  Effect.runPromise(collectWorkspaceSettings(options).pipe(Effect.provide(nodeRepositoryFiles)));

export type { WorkspaceTasks } from "#/entities/workspace/index.ts";
