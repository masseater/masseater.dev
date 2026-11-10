import { Option } from "effect";
import type { Checker, Project } from "typescript/sync";

import { sharedApi } from "./ts-api.ts";

interface CheckerProgram {
  readonly mountPath: string;
  readonly rootNames: readonly string[];
  readonly compilerOptions: Readonly<Record<string, unknown>>;
  readonly resolve: (
    moduleName: string,
    containingDirectory: string,
    mode: number | undefined,
  ) => Option.Option<{ readonly resolvedFileName: string }>;
}

interface CheckerSession {
  readonly checker: Checker;
  readonly project: Project;
  readonly mountPath: string;
  readonly dispose: () => void;
}

const openCheckerSession = (program: CheckerProgram): CheckerSession => {
  const api = sharedApi();
  const moduleResolver = api.createModuleResolver(program.compilerOptions, {
    resolveModuleName: (moduleName, containingDirectory, mode) =>
      Option.getOrUndefined(program.resolve(moduleName, containingDirectory, mode)),
  });
  const snapshot = api.createSnapshot({
    createPrograms: [
      {
        rootFiles: program.rootNames.map((name) => `${program.mountPath}${name}`),
        compilerOptions: program.compilerOptions,
        options: { moduleResolver },
      },
    ],
  });
  const [created] = snapshot.operation.createdPrograms;
  const project = created.getProject();
  return {
    checker: project.checker,
    project,
    mountPath: program.mountPath,
    dispose: () => {
      snapshot.dispose();
      moduleResolver.dispose();
    },
  };
};

export { openCheckerSession };
export type { CheckerProgram, CheckerSession };
