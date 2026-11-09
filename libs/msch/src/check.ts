import { Effect, Option, Array as Arr, pipe } from "effect";

import { analyzeProject } from "./analysis.ts";
import { duplicateProblems, unownedSiteOf } from "./duplicates.ts";
import type { PackageScope, UnownedSite } from "./duplicates.ts";
import { OWNER_TAG, combineOwnerScans, ownersIn } from "./owners.ts";
import type { Owner, OwnerScan } from "./owners.ts";
import { sortProblems } from "./problem.ts";
import type { Problem } from "./problem.ts";
import { listConfigFiles, mentions, typeScriptCompiler, withProject } from "./project.ts";
import type { Project, Workspace } from "./project.ts";
import { RepositoryFiles } from "./repository-files.ts";

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

interface Analysis {
  readonly problems: readonly Problem[];
  readonly unowned: readonly UnownedSite[];
}

const analyzeProjects =
  (workspace: Workspace, owners: readonly Owner[]) =>
  (configPaths: readonly string[]): Effect.Effect<readonly Analysis[], never, RepositoryFiles> =>
    pipe(
      configPaths,
      Effect.forEach((configPath) =>
        withProject(workspace)(configPath)((project) =>
          Effect.sync(() => {
            const analysis = analyzeProject(owners)(project);
            const scope = scopeOf(project, configPath);
            return {
              problems: analysis.problems,
              unowned: pipe(analysis.unowned, Arr.map(unownedSiteOf(scope))),
            };
          }).pipe(Effect.withSpan("analyzeProject")),
        ),
      ),
      Effect.map(Arr.getSomes),
    );

const checkRepository = Effect.fn("checkRepository")(function* checkRepository(root: string) {
  const files = yield* RepositoryFiles;
  const compiler = yield* typeScriptCompiler;
  const generated = yield* files.generatedFiles(root);
  const workspace: Workspace = { compiler, root, generated };
  const configPaths = yield* listConfigFiles(root);
  const ownerScan: OwnerScan = yield* scanOwners(workspace, configPaths);
  const analyses = yield* analyzeProjects(workspace, ownerScan.owners)(configPaths);
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

export { checkRepository };
