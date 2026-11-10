import { Option } from "effect";

import { bindSourceFile } from "./binder.ts";
import type { CheckerProgram } from "./checker-session.ts";
import { createTypeChecker } from "./checker.ts";
import type { TypeCheckerFacade } from "./checker.ts";
import type { HostWrapperCore } from "./host-types.ts";
import { toPath } from "./paths.ts";
import type { ProgramFile, ProgramOptions } from "./program-build.ts";
import { modeFromNumber } from "./resolution-mode-numbers.ts";
import { resolveInDirectory } from "./resolver.ts";

interface CheckerSite {
  readonly core: HostWrapperCore;
  readonly mountRoot: string;
  readonly options: ProgramOptions;
}

const checkerOptions = (core: HostWrapperCore): CheckerProgram["compilerOptions"] => ({
  module: core.compilerOptions["module"],
  moduleResolution: core.compilerOptions["moduleResolution"],
  noLib: true,
  allowJs: true,
  resolveJsonModule: true,
  types: [],
});

const relativeDirectory = (site: CheckerSite, directory: string): string => {
  const relative = directory.slice(site.mountRoot.length);
  if (relative === "") {
    return "/";
  }
  return relative;
};

const checkerResolver =
  (site: CheckerSite, isProgramFile: (path: string) => boolean): CheckerProgram["resolve"] =>
  (moduleName, containingDirectory, mode) =>
    Option.liftPredicate(containingDirectory, (directory) =>
      directory.startsWith(site.mountRoot),
    ).pipe(
      Option.flatMap(
        (directory) =>
          resolveInDirectory(
            {
              moduleName,
              containingDirectory: relativeDirectory(site, directory),
              options: {
                moduleResolution: site.core.kind,
                noDtsResolution: site.options.noDtsResolution,
              },
              mode: modeFromNumber(mode),
            },
            { host: site.core.resolverHost, trace: Option.none(), cache: Option.none() },
          ).resolvedModule,
      ),
      Option.filter((module) => isProgramFile(toPath(module.resolvedFileName))),
      Option.map((module) => ({ resolvedFileName: `${site.mountRoot}${module.resolvedFileName}` })),
    );

const openChecker = (
  site: CheckerSite,
  files: readonly ProgramFile[],
  rootNames: readonly string[],
): TypeCheckerFacade => {
  for (const file of files) {
    bindSourceFile(file.sourceFile);
  }
  const fileNames = files.map((file) => file.fileName);
  const filePaths = new Set(fileNames.map((name) => toPath(name)));
  return createTypeChecker({
    mountPath: site.mountRoot,
    rootNames: [...new Set([...fileNames, ...rootNames])],
    compilerOptions: checkerOptions(site.core),
    resolve: checkerResolver(site, (path) => filePaths.has(path)),
  });
};

export { openChecker };
export type { CheckerSite };
