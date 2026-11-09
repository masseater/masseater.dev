import { Option, Array as Arr, pipe } from "effect";

import { isVariableDeclaration } from "./compiler.ts";
import type { Checker, Node, VariableDeclaration } from "./compiler.ts";
import { flowsIn } from "./flows.ts";
import { ownerKeyOf } from "./owners.ts";
import type { Owner } from "./owners.ts";
import type { Problem } from "./problem.ts";
import type { Project } from "./project.ts";
import { shapeProblemsIn } from "./shapes.ts";
import { sitesUnder } from "./sites.ts";
import type { ValueSite } from "./sites.ts";
import { contains, descendantsOf } from "./syntax.ts";
import { ownedLiteralProblems, siteVerdict } from "./value-checks.ts";

interface ProjectAnalysis {
  readonly problems: readonly Problem[];
  readonly unowned: readonly ValueSite[];
}

const isVisibleTo =
  (project: Project) =>
  (owner: Owner): boolean =>
    pipe(
      project.sourceFiles,
      Arr.some((sourceFile) => sourceFile.fileName === owner.declaration.getSourceFile().fileName),
    ) ||
    Option.exists(
      owner.packageName,
      (name) =>
        Option.contains(project.packageName, name) || project.workspaceDependencies.includes(name),
    );

const ownerDeclarationsIn = (
  project: Project,
  owners: readonly Owner[],
): readonly VariableDeclaration[] => {
  const keys = new Set(
    pipe(
      owners,
      Arr.map((owner) => owner.key),
    ),
  );
  return pipe(
    project.sourceFiles,
    Arr.flatMap((sourceFile) =>
      pipe(
        descendantsOf(sourceFile),
        Arr.filter((node) => isVariableDeclaration(node)),
        Arr.filter((declaration) => Option.exists(ownerKeyOf(declaration), (key) => keys.has(key))),
      ),
    ),
  );
};

const isInside =
  (outers: readonly Node[]) =>
  (node: Node): boolean =>
    pipe(
      outers,
      Arr.some((outer) => contains(outer)(node)),
    );

const sitesOutside =
  (checker: Checker) =>
  (project: Project, outers: readonly Node[]): readonly ValueSite[] =>
    pipe(
      project.sourceFiles,
      Arr.flatMap((sourceFile) => sitesUnder(checker)(sourceFile)),
      Arr.filter((site) => !isInside(outers)(site.node)),
    );

const nodesOf = (sites: readonly ValueSite[]): readonly Node[] =>
  pipe(
    sites,
    Arr.map((site) => site.node),
  );

const analyzeProject =
  (owners: readonly Owner[]) =>
  (project: Project): ProjectAnalysis => {
    const { checker } = project;
    const ownerDeclarations = ownerDeclarationsIn(project, owners);
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
    const shapeContext = { checker, shapes: project.library.shapes };
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
            ...shapeProblemsIn(shapeContext)(sourceFile),
          ]),
        ),
      ],
      unowned: pipe(
        verdicts,
        Arr.flatMap((found) => found.unowned),
      ),
    };
  };

export { analyzeProject };
export type { ProjectAnalysis };
