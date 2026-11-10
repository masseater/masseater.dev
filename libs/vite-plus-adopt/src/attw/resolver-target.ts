import { Array as Arr, Option, Predicate, Record as Rec } from "effect";
import semver from "semver";

import type { Extensions } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { withPackageId } from "./package-json.ts";
import {
  combinePaths,
  getNormalizedAbsolutePath,
  getPathComponents,
  pathIsRelative,
} from "./paths.ts";
import type {
  PackageJsonInfo,
  Resolved,
  ResolutionState,
  SearchResult,
} from "./resolution-types.ts";
import { loadFileNameFromPackageJsonField } from "./resolver-files.ts";
import { RESOLUTION_VERSION } from "./types-versions.ts";

interface TargetContext {
  readonly extensions: Extensions;
  readonly moduleName: string;
  readonly scope: PackageJsonInfo;
  readonly isImports: boolean;
}

interface TargetRequest {
  readonly subpath: string;
  readonly pattern: boolean;
  readonly key: string;
}

interface TargetSite {
  readonly context: TargetContext;
  readonly request: TargetRequest;
}

type TargetLoader = (target: unknown, site: TargetSite, state: ResolutionState) => SearchResult;

const FORBIDDEN_SEGMENTS: ReadonlySet<string> = new Set(["..", ".", "node_modules"]);
const VERSIONED_TYPES_PREFIX = "types@";
const RANGE_OPTIONS = { includePrerelease: true } as const;
const FIRST_SEGMENT = 1;
const EMPTY = 0;

const notFound: SearchResult = Option.none();

const asSearchResult = (resolved: Option.Option<Resolved>): SearchResult =>
  resolved.pipe(Option.map((value) => Option.some(value)));

const invalidTarget = ({ context }: TargetSite, state: ResolutionState): SearchResult => {
  traceMessage(
    state,
    Messages.packageJsonInvalidTarget,
    context.scope.packageDirectory,
    context.moduleName,
  );
  return notFound;
};

const fieldName = (context: TargetContext): string => {
  if (context.isImports) {
    return "imports";
  }
  return "exports";
};

const substitute = (target: string, request: TargetRequest): string => {
  if (request.pattern) {
    return target.replaceAll("*", request.subpath);
  }
  return `${target}${request.subpath}`;
};

const hasForbiddenSegment = (parts: readonly string[]): boolean =>
  parts.some((part) => FORBIDDEN_SEGMENTS.has(part));

const resolveImportToPackage = (
  target: string,
  { context, request }: TargetSite,
  state: ResolutionState,
): SearchResult => {
  const combinedLookup = substitute(target, request);
  const containingDirectory = `${context.scope.packageDirectory}/`;
  traceMessage(state, Messages.usingSubpath, "imports", request.key, combinedLookup);
  traceMessage(state, Messages.resolvingModule, combinedLookup, containingDirectory);
  const result = state.resolveNested(state, {
    moduleName: combinedLookup,
    containingDirectory,
    extensions: context.extensions,
  });
  return asSearchResult(
    result.resolvedModule.pipe(
      Option.map((module) => ({
        path: module.resolvedFileName,
        extension: module.extension,
        packageId: module.packageId,
        originalPath: module.originalPath,
        resolvedUsingTsExtension: module.resolvedUsingTsExtension,
      })),
    ),
  );
};

const isPackageImportTarget = (target: string, context: TargetContext): boolean =>
  context.isImports && !target.startsWith("../") && !target.startsWith("/");

const targetParts = (target: string): readonly string[] => {
  const parts = getPathComponents(target);
  if (pathIsRelative(target)) {
    return parts.slice(FIRST_SEGMENT);
  }
  return parts;
};

const resolveRelativeTargetWithTrace = (
  target: string,
  site: TargetSite,
  state: ResolutionState,
): SearchResult => {
  const { context, request } = site;
  if (
    hasForbiddenSegment(targetParts(target).slice(FIRST_SEGMENT)) ||
    hasForbiddenSegment(getPathComponents(request.subpath))
  ) {
    return invalidTarget(site, state);
  }
  traceMessage(
    state,
    Messages.usingSubpath,
    fieldName(context),
    request.key,
    substitute(target, request),
  );
  const candidate = getNormalizedAbsolutePath(
    substitute(combinePaths(context.scope.packageDirectory, target), request),
    "/",
  );
  const loaded = loadFileNameFromPackageJsonField(
    { extensions: context.extensions, candidate, onlyRecordFailures: false },
    state,
  );
  return asSearchResult(withPackageId(Option.some(context.scope), loaded, state));
};

type StringTargetLoader = (
  target: string,
  site: TargetSite,
  state: ResolutionState,
) => SearchResult;

const STRING_TARGET_LOADERS: readonly (readonly [
  (target: string, context: TargetContext) => boolean,
  StringTargetLoader,
])[] = [
  [(target) => target.startsWith("./"), resolveRelativeTargetWithTrace],
  [isPackageImportTarget, resolveImportToPackage],
];

const isMissingTrailingSlash = (target: string, request: TargetRequest): boolean =>
  !request.pattern && request.subpath.length > EMPTY && !target.endsWith("/");

const loadStringTarget: StringTargetLoader = (target, site, state) => {
  if (isMissingTrailingSlash(target, site.request)) {
    return invalidTarget(site, state);
  }
  return Arr.findFirst(STRING_TARGET_LOADERS, ([applies]) => applies(target, site.context)).pipe(
    Option.match({
      onNone: () => invalidTarget(site, state),
      onSome: ([, load]) => load(target, site, state),
    }),
  );
};

const isApplicableVersionedTypesKey = (conditions: readonly string[], key: string): boolean => {
  const range = key.slice(VERSIONED_TYPES_PREFIX.length);
  return (
    conditions.includes("types") &&
    key.startsWith(VERSIONED_TYPES_PREFIX) &&
    Predicate.isNotNull(semver.validRange(range, RANGE_OPTIONS)) &&
    semver.satisfies(RESOLUTION_VERSION, range, RANGE_OPTIONS)
  );
};

const conditionMatches = (condition: string, state: ResolutionState): boolean =>
  condition === "default" ||
  state.conditions.includes(condition) ||
  isApplicableVersionedTypesKey(state.conditions, condition);

const tryCondition =
  (loadTarget: TargetLoader, target: Readonly<Record<string, unknown>>) =>
  (condition: string, site: TargetSite, state: ResolutionState): SearchResult => {
    if (!conditionMatches(condition, state)) {
      traceMessage(state, Messages.sawNonMatchingCondition, condition);
      return Option.none();
    }
    traceMessage(state, Messages.matchedCondition, fieldName(site.context), condition);
    const result = loadTarget(target[condition], site, state);
    if (Option.isSome(result)) {
      traceMessage(state, Messages.resolvedUnderCondition, condition);
      return result;
    }
    traceMessage(state, Messages.failedUnderCondition, condition);
    return result;
  };

const resolveConditionsWithTrace =
  (loadTarget: TargetLoader) =>
  (
    target: Readonly<Record<string, unknown>>,
    site: TargetSite,
    state: ResolutionState,
  ): SearchResult => {
    traceMessage(state, Messages.enteringConditionalExports);
    const attempt = tryCondition(loadTarget, target);
    const result = Arr.findFirst(Rec.keys(target), (condition) => attempt(condition, site, state));
    traceMessage(state, Messages.exitingConditionalExports);
    return result;
  };

const loadArrayTarget =
  (loadTarget: TargetLoader) =>
  (target: readonly unknown[], site: TargetSite, state: ResolutionState): SearchResult => {
    if (target.length === EMPTY) {
      return invalidTarget(site, state);
    }
    return Arr.findFirst(target, (element) => loadTarget(element, site, state)).pipe(
      Option.orElse(() => invalidTarget(site, state)),
    );
  };

const nullTarget = ({ context }: TargetSite, state: ResolutionState): SearchResult => {
  traceMessage(
    state,
    Messages.packageJsonMapsToNull,
    context.scope.packageDirectory,
    context.moduleName,
  );
  return notFound;
};

const loadScalarTarget = (
  target: unknown,
  site: TargetSite,
  state: ResolutionState,
): SearchResult => {
  if (Predicate.isNull(target)) {
    return nullTarget(site, state);
  }
  return invalidTarget(site, state);
};

const loadStructuredTarget =
  (loadTarget: TargetLoader): TargetLoader =>
  (target, site, state) => {
    if (Array.isArray(target)) {
      return loadArrayTarget(loadTarget)(target, site, state);
    }
    if (Predicate.isObject(target)) {
      return resolveConditionsWithTrace(loadTarget)(target, site, state);
    }
    return loadScalarTarget(target, site, state);
  };

const loadTarget: TargetLoader = (target, site, state) => {
  if (Predicate.isString(target)) {
    return loadStringTarget(target, site, state);
  }
  return loadStructuredTarget(loadTarget)(target, site, state);
};

export { loadTarget, notFound };
export type { TargetContext, TargetLoader, TargetRequest, TargetSite };
