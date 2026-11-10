import { Array as Arr, Option, Predicate, Record as Rec } from "effect";
import semver from "semver";

import { Messages, traceMessage } from "./messages.ts";
import { asRecord, resolvePackageJsonFieldWithTrace } from "./package-json-fields.ts";
import type {
  PackageJsonContent,
  PackageJsonInfo,
  ResolutionState,
  VersionPaths,
} from "./resolution-types.ts";

const RESOLUTION_VERSION = "5.6.1-rc";
const RESOLUTION_VERSION_MAJOR_MINOR = "5.6";
const RANGE_OPTIONS = { includePrerelease: true } as const;

const isValidRange = (key: string): boolean =>
  Predicate.isNotNull(semver.validRange(key, RANGE_OPTIONS));

const rangeMatches = (range: string, version: string): boolean =>
  isValidRange(range) && semver.satisfies(version, range, RANGE_OPTIONS);

const traceInvalidRanges = (
  typesVersions: Readonly<Record<string, unknown>>,
  state: ResolutionState,
): void => {
  for (const key of Rec.keys(typesVersions)) {
    if (!isValidRange(key)) {
      traceMessage(state, Messages.packageJsonInvalidTypesVersionsRange, key);
    }
  }
};

const matchingTypesVersions = (
  typesVersions: Readonly<Record<string, unknown>>,
): Option.Option<readonly [string, unknown]> =>
  Arr.findFirst(Rec.toEntries(typesVersions), ([key]) => rangeMatches(key, RESOLUTION_VERSION));

const validateVersionPathsWithTrace = (
  [version, paths]: readonly [string, unknown],
  state: ResolutionState,
): Option.Option<VersionPaths> => {
  if (typeof paths !== "object") {
    traceMessage(
      state,
      Messages.expectedFieldType,
      `typesVersions['${version}']`,
      "object",
      typeof paths,
    );
    return Option.none();
  }
  return Option.some({ version, paths: asRecord(paths) });
};

const selectVersionPathsWithTrace = (
  typesVersions: Readonly<Record<string, unknown>>,
  state: ResolutionState,
): Option.Option<VersionPaths> => {
  traceMessage(state, Messages.packageJsonHasTypesVersions);
  traceInvalidRanges(typesVersions, state);
  const entry = matchingTypesVersions(typesVersions);
  if (Option.isNone(entry)) {
    traceMessage(
      state,
      Messages.packageJsonNoMatchingTypesVersions,
      RESOLUTION_VERSION_MAJOR_MINOR,
    );
    return Option.none();
  }
  return validateVersionPathsWithTrace(entry.value, state);
};

const resolveTypesVersionPathsWithTrace = (
  content: PackageJsonContent,
  state: ResolutionState,
): Option.Option<VersionPaths> =>
  resolvePackageJsonFieldWithTrace(
    content,
    { field: "typesVersions", expected: "object" },
    state,
  ).pipe(
    Option.flatMap((typesVersions) => selectVersionPathsWithTrace(asRecord(typesVersions), state)),
  );

const getVersionPaths = (
  info: PackageJsonInfo,
  state: ResolutionState,
): Option.Option<VersionPaths> =>
  info.contents.versionPaths(() =>
    resolveTypesVersionPathsWithTrace(info.contents.packageJsonContent, state),
  );

export { RESOLUTION_VERSION, getVersionPaths };
