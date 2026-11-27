import { Option, Array as Arr, pipe } from "effect";

import type { Project, SourceCheck } from "#/entities/project/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";

import { flowsIn } from "./flows.ts";
import { fileFactsIn } from "./free-literals.ts";
import type { FileFacts } from "./free-literals.ts";
import { outsideNameProblemsIn } from "./outside-names.ts";
import { ownerDeclarationsIn } from "./owners.ts";
import type { Owner } from "./owners.ts";
import { shapeProblemsIn } from "./shapes.ts";
import { sitesOutside } from "./sites.ts";
import type { ValueSite } from "./sites.ts";
import { ownedLiteralProblems, siteVerdict } from "./value-checks.ts";

export interface ProjectAnalysis {
  readonly problems: readonly Problem[];
  readonly unowned: readonly ValueSite[];
  readonly literals: readonly FileFacts[];
}

const isVisibleTo =
  (project: Project) =>
  (owner: Owner): boolean =>
    pipe(
      project.sourceFiles,
      Arr.some((sourceFile) => sourceFile.fileName === owner.file),
    ) ||
    Option.exists(
      owner.packageName,
      (name) =>
        Option.contains(project.packageName, name) || project.workspaceDependencies.includes(name),
    );

const nodesOf = (sites: readonly ValueSite[]): readonly ValueSite["node"][] =>
  pipe(
    sites,
    Arr.map((site) => site.node),
  );

export interface ProjectChecks {
  readonly owners: readonly Owner[];
  readonly sourceChecks: readonly SourceCheck[];
}

const fileChecksOf = (
  project: Project,
  sourceChecks: readonly SourceCheck[],
): readonly ReturnType<SourceCheck>[] => [
  shapeProblemsIn({
    checker: project.checker,
    program: project.program,
    shapes: project.library.shapes,
  }),
  outsideNameProblemsIn(project),
  ...pipe(
    sourceChecks,
    Arr.map((check) => check(project.checker)),
  ),
];

export const analyzeProject =
  ({ owners, sourceChecks }: ProjectChecks) =>
  (project: Project): ProjectAnalysis => {
    const { checker } = project;
    const ownerDeclarations = ownerDeclarationsIn(owners)(project);
    const sites = sitesOutside(checker)(project, ownerDeclarations);
    const flowContext = { checker, program: project.program, sites };
    const context = {
      checker,
      owners: pipe(
        owners,
        Arr.filter((owner) => isVisibleTo(project)(owner)),
      ),
      vocabularies: project.library.vocabularies,
      flows: pipe(
        project.sourceFiles,
        Arr.flatMap((sourceFile) => flowsIn(flowContext)(sourceFile)),
      ),
    };
    const verdicts = pipe(
      sites,
      Arr.map((site) => siteVerdict(context)(site)),
    );
    const excluded = [...ownerDeclarations, ...nodesOf(sites)];
    const fileChecks = fileChecksOf(project, sourceChecks);
    return {
      problems: [
        ...pipe(
          verdicts,
          Arr.flatMap((found) => found.problems),
        ),
        ...pipe(
          project.sourceFiles,
          Arr.flatMap((sourceFile) => [
            ...ownedLiteralProblems(context)(sourceFile, excluded),
            ...pipe(
              fileChecks,
              Arr.flatMap((check) => check(sourceFile)),
            ),
          ]),
        ),
      ],
      unowned: pipe(
        verdicts,
        Arr.flatMap((found) => found.unowned),
      ),
      literals: fileFactsIn(checker)(project.sourceFiles, excluded),
    };
  };
