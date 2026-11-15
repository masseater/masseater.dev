import { Effect, Option, Schema, Array as Arr, pipe } from "effect";

import {
  listConfigFiles,
  mentions,
  projectInputs,
  typeScriptCompiler,
  withProject,
} from "#/entities/project/index.ts";
import type { Project, SourceCheck, Workspace } from "#/entities/project/index.ts";
import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { analyzeProject } from "./analysis.ts";
import type { ProjectChecks } from "./analysis.ts";
import { analysisCache, keyOf, pruneAnalyses, readAnalysis, writeAnalysis } from "./cache.ts";
import type { Analysis, AnalysisCache } from "./cache.ts";
import { duplicateProblems, unownedSiteOf } from "./duplicates.ts";
import type { PackageScope } from "./duplicates.ts";
import { OWNER_TAG, combineOwnerScans, ownersIn } from "./owners.ts";
import type { Owner, OwnerScan } from "./owners.ts";

const scanOwners = Effect.fn("scanOwners")(function* scanOwners(
  workspace: Workspace,
  configPaths: readonly string[],
) {
  const ownerConfigs = yield* pipe(
    configPaths,
    Effect.filter(mentions(`@${OWNER_TAG}`)(workspace.compiler)),
  );
  const scans = yield* pipe(
    ownerConfigs,
    Effect.forEach((configPath) =>
      withProject(workspace)(configPath)((project) => Effect.sync(() => ownersIn(project))),
    ),
  );
  return combineOwnerScans(Arr.getSomes(scans));
});

const scopeOf = (project: Project, configPath: string): PackageScope => ({
  name: Option.getOrElse(project.packageName, () => configPath),
  dependencies: project.workspaceDependencies,
});

interface Context {
  readonly workspace: Workspace;
  readonly owners: readonly Owner[];
  readonly sourceChecks: readonly SourceCheck[];
  readonly cache: AnalysisCache;
  readonly listed: readonly string[];
}

const freshAnalysis =
  ({ workspace, owners, sourceChecks }: Context) =>
  (configPath: string): Effect.Effect<Option.Option<Analysis>, never, RepositoryFiles> =>
    withProject(workspace)(configPath)((project) =>
      Effect.sync(() => {
        const analysis = analyzeProject({ owners, sourceChecks })(project);
        const scope = scopeOf(project, configPath);
        return {
          problems: analysis.problems,
          unowned: pipe(analysis.unowned, Arr.map(unownedSiteOf(scope))),
        };
      }).pipe(Effect.withSpan("analyzeProject")),
    );

const keyedAnalysis =
  (context: Context) =>
  (
    configPath: string,
    key: string,
  ): Effect.Effect<Option.Option<Analysis>, never, RepositoryFiles> =>
    Effect.gen(function* lookupAnalysis() {
      const cached = yield* readAnalysis(context.cache)(key);
      if (Option.isSome(cached)) {
        return cached;
      }
      const fresh = yield* freshAnalysis(context)(configPath);
      yield* Option.match(fresh, {
        onNone: () => Effect.void,
        onSome: (analysis) => writeAnalysis(context.cache)(key, analysis),
      });
      return fresh;
    });

const analyzeConfig =
  (context: Context) =>
  (
    configPath: string,
  ): Effect.Effect<Option.Option<readonly [string, Analysis]>, never, RepositoryFiles> =>
    Effect.gen(function* analyzeOne() {
      const inputs = yield* projectInputs(context)(configPath);
      if (Option.isNone(inputs)) {
        return Option.none();
      }
      const key = yield* keyOf(context.cache)(configPath, inputs.value);
      const analysis = yield* keyedAnalysis(context)(configPath, key);
      return pipe(
        analysis,
        Option.map((found) => [key, found] as const),
      );
    });

const encodeOwners = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const cacheFor = Effect.fn("cacheFor")(function* cacheFor(root: string, owners: readonly Owner[]) {
  const plain = pipe(
    owners,
    Arr.map((owner) => ({ ...owner, packageName: Option.getOrNull(owner.packageName) })),
  );
  const encoded = yield* encodeOwners(plain).pipe(Effect.orElseSucceed(() => ""));
  return yield* analysisCache(root, encoded);
});

const analyzeProjects = Effect.fn("analyzeProjects")(function* analyzeProjects(
  workspace: Workspace,
  { owners, sourceChecks }: ProjectChecks,
  configPaths: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const cache = yield* cacheFor(workspace.root, owners);
  const listed = yield* files.listedFiles(workspace.root);
  const keyed = yield* pipe(
    configPaths,
    Effect.forEach(analyzeConfig({ workspace, owners, sourceChecks, cache, listed })),
  );
  const found = Arr.getSomes(keyed);
  yield* pruneAnalyses(cache)(
    pipe(
      found,
      Arr.map(([key]) => key),
    ),
  );
  return pipe(
    found,
    Arr.map(([, analysis]) => analysis),
  );
});

export const checkRepository = Effect.fn("checkRepository")(function* checkRepository(
  root: string,
  sourceChecks: readonly SourceCheck[] = [],
) {
  const files = yield* RepositoryFiles;
  const compiler = yield* typeScriptCompiler;
  const generated = yield* files.generatedFiles(root);
  const workspace: Workspace = { compiler, root, generated };
  const configPaths = yield* listConfigFiles(root);
  const ownerScan: OwnerScan = yield* scanOwners(workspace, configPaths);
  const analyses = yield* analyzeProjects(
    workspace,
    { owners: ownerScan.owners, sourceChecks },
    configPaths,
  );
  const relative = (file: string): string => files.relative(root, file);
  const unowned = pipe(
    analyses,
    Arr.flatMap((analysis) => analysis.unowned),
  );
  return sortProblems([
    ...ownerScan.problems,
    ...pipe(
      analyses,
      Arr.flatMap((analysis) => analysis.problems),
    ),
    ...duplicateProblems(relative)(unowned),
  ]);
}, Effect.scoped);
