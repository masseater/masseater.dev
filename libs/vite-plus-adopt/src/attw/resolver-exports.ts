import { Array as Arr, Option, Predicate, Record as Rec } from "effect";

import { PRIORITY_KINDS, intersectExtensions, subtractExtensions } from "./extensions.ts";
import type { Extensions } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { getPackageScopeForPath } from "./package-json.ts";
import { getNormalizedAbsolutePath, getPathComponents } from "./paths.ts";
import type {
  ModuleLookup,
  PackageJsonInfo,
  ResolutionState,
  SearchResult,
} from "./resolution-types.ts";
import { comparePatternKeys, expandedSubpath, hasOneAsterisk } from "./resolver-patterns.ts";
import { loadTarget, notFound } from "./resolver-target.ts";
import type { TargetContext } from "./resolver-target.ts";

type LookupTable = Readonly<Record<string, unknown>>;

interface LookupSite {
  readonly lookupTable: LookupTable;
  readonly context: TargetContext;
}

interface ExportsRequest {
  readonly extensions: Extensions;
  readonly subpath: string;
}

const expandKey = (
  key: string,
  site: LookupSite,
  state: ResolutionState,
): Option.Option<SearchResult> =>
  expandedSubpath(key, site.context.moduleName, state).pipe(
    Option.map((expansion) =>
      loadTarget(
        site.lookupTable[key],
        { context: site.context, request: { ...expansion, key } },
        state,
      ),
    ),
  );

const loadModuleFromImportsOrExports = (site: LookupSite, state: ResolutionState): SearchResult => {
  const { context, lookupTable } = site;
  const name = context.moduleName;
  if (!name.endsWith("/") && !name.includes("*") && Object.hasOwn(lookupTable, name)) {
    return loadTarget(
      lookupTable[name],
      { context, request: { subpath: "", pattern: false, key: name } },
      state,
    );
  }
  const expandingKeys = Rec.keys(lookupTable)
    .filter((key) => hasOneAsterisk(key) || key.endsWith("/"))
    .toSorted(comparePatternKeys);
  return Arr.findFirst(expandingKeys, (key) => expandKey(key, site, state)).pipe(Option.flatten);
};

const noKeyStartsWithDot = (value: LookupTable): boolean =>
  !Rec.keys(value).some((key) => key.startsWith("."));

const allKeysStartWithDot = (value: LookupTable): boolean =>
  Rec.keys(value).every((key) => key.startsWith("."));

const isDirectExport = (exports: unknown): boolean =>
  Predicate.isString(exports) || Array.isArray(exports);

const objectMainExport = (exports: LookupTable): Option.Option<unknown> => {
  if (noKeyStartsWithDot(exports)) {
    return Option.some(exports);
  }
  return Option.liftPredicate(exports["."], Predicate.isTruthy).pipe(
    Option.filter(() => Object.hasOwn(exports, ".")),
  );
};

const mainExportOf = (exports: unknown): Option.Option<unknown> => {
  if (isDirectExport(exports)) {
    return Option.some(exports);
  }
  return Option.liftPredicate(exports, Predicate.isObject).pipe(Option.flatMap(objectMainExport));
};

const exportDoesNotExist = (context: TargetContext, state: ResolutionState): SearchResult => {
  traceMessage(
    state,
    Messages.exportSpecifierDoesNotExist,
    context.moduleName,
    context.scope.packageDirectory,
  );
  return notFound;
};

const loadSubpathExport = (
  exports: unknown,
  context: TargetContext,
  state: ResolutionState,
): SearchResult => {
  if (!Predicate.isObject(exports) || !allKeysStartWithDot(exports)) {
    return exportDoesNotExist(context, state);
  }
  return loadModuleFromImportsOrExports({ lookupTable: exports, context }, state).pipe(
    Option.orElse(() => exportDoesNotExist(context, state)),
  );
};

const loadModuleFromExports = (
  scope: PackageJsonInfo,
  { extensions, subpath }: ExportsRequest,
  state: ResolutionState,
): SearchResult => {
  const { exports } = scope.contents.packageJsonContent;
  if (!Predicate.isTruthy(exports)) {
    return Option.none();
  }
  const context: TargetContext = { extensions, moduleName: subpath, scope, isImports: false };
  if (subpath !== ".") {
    return loadSubpathExport(exports, context, state);
  }
  return mainExportOf(exports).pipe(
    Option.match({
      onNone: () => exportDoesNotExist(context, state),
      onSome: (mainExport) =>
        loadTarget(
          mainExport,
          { context, request: { subpath: "", pattern: false, key: "." } },
          state,
        ),
    }),
  );
};

const asLookupTable = (value: unknown): LookupTable =>
  Option.liftPredicate(value, Predicate.isObject).pipe(Option.getOrElse(() => ({})));

const reportMissingImport = (context: TargetContext, state: ResolutionState): SearchResult => {
  traceMessage(
    state,
    Messages.importSpecifierDoesNotExist,
    context.moduleName,
    context.scope.packageDirectory,
  );
  return notFound;
};

const resolveImportsWithTrace = (
  lookup: ModuleLookup,
  scope: PackageJsonInfo,
  state: ResolutionState,
): SearchResult => {
  const { imports } = scope.contents.packageJsonContent;
  if (!Predicate.isTruthy(imports)) {
    traceMessage(state, Messages.packageJsonNoImports, scope.packageDirectory);
    return notFound;
  }
  const context: TargetContext = {
    extensions: lookup.extensions,
    moduleName: lookup.moduleName,
    scope,
    isImports: true,
  };
  return loadModuleFromImportsOrExports(
    { lookupTable: asLookupTable(imports), context },
    state,
  ).pipe(Option.orElse(() => reportMissingImport(context, state)));
};

const reportMissingScope = (directoryPath: string, state: ResolutionState): SearchResult => {
  traceMessage(state, Messages.directoryHasNoPackageScope, directoryPath);
  return notFound;
};

const resolvePackageImportWithTrace = (
  lookup: ModuleLookup,
  state: ResolutionState,
): SearchResult => {
  const { moduleName } = lookup;
  if (moduleName === "#" || moduleName.startsWith("#/")) {
    traceMessage(state, Messages.invalidImportSpecifier, moduleName);
    return notFound;
  }
  const directoryPath = getNormalizedAbsolutePath(lookup.directory, "/");
  return getPackageScopeForPath(directoryPath, state).pipe(
    Option.match({
      onNone: () => reportMissingScope(directoryPath, state),
      onSome: (scope) => resolveImportsWithTrace(lookup, scope, state),
    }),
  );
};

const selfNameSubpath = (moduleName: string, packageName: string): Option.Option<string> => {
  const parts = getPathComponents(moduleName);
  const nameParts = getPathComponents(packageName);
  if (!nameParts.every((part, index) => parts[index] === part)) {
    return Option.none();
  }
  const trailing = parts.slice(nameParts.length);
  if (Arr.isReadonlyArrayNonEmpty(trailing)) {
    return Option.some(`./${trailing.join("/")}`);
  }
  return Option.some(".");
};

const loadFromOwnExports = (
  scope: PackageJsonInfo,
  { extensions, subpath }: ExportsRequest,
  state: ResolutionState,
): SearchResult =>
  loadModuleFromExports(
    scope,
    { extensions: intersectExtensions(extensions, PRIORITY_KINDS), subpath },
    state,
  ).pipe(
    Option.orElse(() =>
      loadModuleFromExports(
        scope,
        { extensions: subtractExtensions(extensions, PRIORITY_KINDS), subpath },
        state,
      ),
    ),
  );

const loadModuleFromSelfNameReference = (
  lookup: ModuleLookup,
  state: ResolutionState,
): SearchResult =>
  getPackageScopeForPath(getNormalizedAbsolutePath(lookup.directory, "/"), state).pipe(
    Option.filter((scope) => Predicate.isTruthy(scope.contents.packageJsonContent["exports"])),
    Option.flatMap((scope) =>
      Option.liftPredicate(scope.contents.packageJsonContent["name"], Predicate.isString).pipe(
        Option.flatMap((name) => selfNameSubpath(lookup.moduleName, name)),
        Option.flatMap((subpath) =>
          loadFromOwnExports(scope, { extensions: lookup.extensions, subpath }, state),
        ),
      ),
    ),
  );

export { loadModuleFromExports, loadModuleFromSelfNameReference, resolvePackageImportWithTrace };
export type { ExportsRequest };
