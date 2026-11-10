import { Option } from "effect";

import { extensionsOf } from "./extensions.ts";
import { pathContainsNodeModules } from "./node-modules-paths.ts";
import { mangleScopedPackageName } from "./package-names.ts";
import { combinePaths, getDirectoryPath, isExternalModuleNameRelative } from "./paths.ts";
import type { PackageId, Resolved, ResolutionState, ResolverHost } from "./resolution-types.ts";
import { loadNodeModuleFromDirectory } from "./resolver-directory.ts";
import { loadModuleFromNearestNodeModulesDirectory } from "./resolver-node-modules.ts";
import { loadRelativeModule, nodeLoadModuleByRelativeName } from "./resolver-relative.ts";
import { stateFor } from "./type-reference-state.ts";
import type { TypeReferenceRequest } from "./type-reference-state.ts";

interface ResolvedTypeReference {
  readonly resolvedFileName: string;
  readonly packageId: Option.Option<PackageId>;
  readonly isExternalLibraryImport: boolean;
}

const TYPE_ROOT = "/node_modules/@types";
const DECLARATION = extensionsOf("Declaration");

const primaryLookup = (
  request: TypeReferenceRequest,
  state: ResolutionState,
): Option.Option<Resolved> => {
  const candidate = combinePaths(TYPE_ROOT, mangleScopedPackageName(request.name));
  const directoryExists = state.host.directoryExists(TYPE_ROOT);
  return loadNodeModuleFromDirectory(
    {
      extensions: DECLARATION,
      candidate,
      onlyRecordFailures: !directoryExists,
      considerPackageJson: true,
      loadRelative: nodeLoadModuleByRelativeName,
    },
    state,
  );
};

const secondaryLookup = (
  request: TypeReferenceRequest,
  state: ResolutionState,
): Option.Option<Resolved> => {
  const directory = getDirectoryPath(request.containingFile);
  if (!isExternalModuleNameRelative(request.name)) {
    return Option.flatten(
      loadModuleFromNearestNodeModulesDirectory(
        { extensions: DECLARATION, moduleName: request.name, directory, typesScopeOnly: false },
        state,
      ),
    );
  }
  return loadRelativeModule({ extensions: DECLARATION, moduleName: request.name, directory }, state)
    .resolved;
};

const resolveTypeReferenceDirective = (
  request: TypeReferenceRequest,
  host: ResolverHost,
): Option.Option<ResolvedTypeReference> => {
  const state = stateFor(request, host);
  return primaryLookup(request, state).pipe(
    Option.orElse(() => secondaryLookup(request, state)),
    Option.map((resolved) => ({
      resolvedFileName: resolved.path,
      packageId: resolved.packageId,
      isExternalLibraryImport: pathContainsNodeModules(resolved.path),
    })),
  );
};

export { resolveTypeReferenceDirective };
export type { ResolvedTypeReference };
