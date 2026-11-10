import { Option } from "effect";

import type { ResolutionState, TraceSink } from "./resolution-types.ts";

const Messages = {
  directoryDoesNotExist: "Directory '{0}' does not exist, skipping all lookups in it.",
  directoryHasNoPackageScope:
    "Directory '{0}' has no containing package.json scope. Imports will not resolve.",
  enteringConditionalExports: "Entering conditional exports.",
  exitingConditionalExports: "Exiting conditional exports.",
  expectedFieldType: "Expected type of '{0}' field in 'package.json' to be '{1}', got '{2}'.",
  explicitResolutionKind: "Explicitly specified module resolution kind: '{0}'.",
  exportSpecifierDoesNotExist:
    "Export specifier '{0}' does not exist in package.json scope at path '{1}'.",
  failedToFindPeerDependency: "Failed to find peerDependency '{0}'.",
  failedUnderCondition: "Failed to resolve under condition '{0}'.",
  fileDoesNotExist: "File '{0}' does not exist.",
  fileDoesNotExistCached: "File '{0}' does not exist according to earlier cached lookups.",
  fileExistsCached: "File '{0}' exists according to earlier cached lookups.",
  fileExistsUseIt: "File '{0}' exists - use it as a name resolution result.",
  fileHasExtensionStripping: "File name '{0}' has a '{1}' extension - stripping it.",
  foundPackageJson: "Found 'package.json' at '{0}'.",
  foundPeerDependency: "Found peerDependency '{0}' with '{1}' version.",
  importSpecifierDoesNotExist:
    "Import specifier '{0}' does not exist in package.json scope at path '{1}'.",
  invalidImportSpecifier: "Invalid import specifier '{0}' has no possible resolutions.",
  loadingFromNodeModules:
    "Loading module '{0}' from 'node_modules' folder, target file types: {1}.",
  loadingAsFileOrFolder:
    "Loading module as file / folder, candidate module location '{0}', target file types: {1}.",
  lookingUpInNodeModules: "Looking up in 'node_modules' folder, initial location '{0}'.",
  matchedCondition: "Matched '{0}' condition '{1}'.",
  matchedPattern: "Module name '{0}', matched pattern '{1}'.",
  moduleNotResolved: "======== Module name '{0}' was not resolved. ========",
  moduleResolved: "======== Module name '{0}' was successfully resolved to '{1}'. ========",
  moduleResolvedWithPackageId:
    "======== Module name '{0}' was successfully resolved to '{1}' with Package ID '{2}'. ========",
  resolutionFoundInCache: "Resolution for module '{0}' was found in cache from location '{1}'.",
  retryWithoutModernFeatures:
    "Resolution of non-relative name failed; trying with modern Node resolution features disabled to see if npm library needs configuration update.",
  retryWithBundler:
    "Resolution of non-relative name failed; trying with '--moduleResolution bundler' to see if project may need configuration update.",
  resolvedUnderCondition: "Resolved under condition '{0}'.",
  resolvingInMode: "Resolving in {0} mode with conditions {1}.",
  resolvingModule: "======== Resolving module '{0}' from '{1}'. ========",
  resolvingTypeReference:
    "======== Resolving type reference directive '{0}', containing file '{1}', root directory '{2}'. ========",
  resolvingWithPrimarySearchPath: "Resolving with primary search path '{0}'.",
  sawNonMatchingCondition: "Saw non-matching condition '{0}'.",
  scopedPackageDetected: "Scoped package detected, looking in '{0}'",
  searchingFallbackExtensions:
    "Searching all ancestor node_modules directories for fallback extensions: {0}.",
  searchingPreferredExtensions:
    "Searching all ancestor node_modules directories for preferred extensions: {0}.",
  skippingAbsoluteUri:
    "Skipping module '{0}' that looks like an absolute URI, target file types: {1}.",
  tryingSubstitution: "Trying substitution '{0}', candidate module location: '{1}'.",
  typeReferenceNotResolved: "======== Type reference directive '{0}' was not resolved. ========",
  usingSubpath: "Using '{0}' subpath '{1}' with target '{2}'.",
  packageJsonMissingField: "'package.json' does not have a '{0}' field.",
  packageJsonNoMatchingTypesVersions:
    "'package.json' does not have a 'typesVersions' entry that matches version '{0}'.",
  packageJsonFalsyField: "'package.json' had a falsy '{0}' field.",
  packageJsonFieldReferences: "'package.json' has '{0}' field '{1}' that references '{2}'.",
  packageJsonHasPeerDependencies: "'package.json' has a 'peerDependencies' field.",
  packageJsonInvalidTypesVersionsRange:
    "'package.json' has a 'typesVersions' entry '{0}' that is not a valid semver range.",
  packageJsonTypesVersionsMatch:
    "'package.json' has a 'typesVersions' entry '{0}' that matches compiler version '{1}', looking for a pattern to match module name '{2}'.",
  packageJsonHasTypesVersions:
    "'package.json' has a 'typesVersions' field with version-specific path mappings.",
  packageJsonMapsToNull: "package.json scope '{0}' explicitly maps specifier '{1}' to null.",
  packageJsonInvalidTarget:
    "package.json scope '{0}' has invalid type for target of specifier '{1}'",
  packageJsonNoImports: "package.json scope '{0}' has no imports defined.",
} as const;

type Message = (typeof Messages)[keyof typeof Messages];

const PLACEHOLDER = /\{(?<index>\d+)\}/gu;

const formatMessage = (message: Message, ...args: readonly string[]): string =>
  message.replaceAll(
    PLACEHOLDER,
    (placeholder, index: string) => args[Number(index)] ?? placeholder,
  );

const emitTrace = (trace: Option.Option<TraceSink>, message: string): void => {
  for (const sink of Option.toArray(trace)) {
    sink(message);
  }
};

const traceMessage = (
  state: Pick<ResolutionState, "trace">,
  message: Message,
  ...args: readonly string[]
): void => {
  emitTrace(state.trace, formatMessage(message, ...args));
};

export { Messages, emitTrace, formatMessage, traceMessage };
export type { Message };
