import { Array as Arr, Option } from "effect";

import {
  Extension,
  isDeclarationFileName,
  isTSFileExtensionForPackageField,
  removeFileExtension,
  tryExtractTSExtension,
} from "./extensions.ts";
import type { ExtensionKind } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { getBaseFileName, getDirectoryPath } from "./paths.ts";
import type { CandidateRequest, PathAndExtension, ResolutionState } from "./resolution-types.ts";

interface ExtensionAttempt {
  readonly kind: ExtensionKind;
  readonly extension: string;
  readonly usingTsExtension: boolean;
}

const attempt = (
  kind: ExtensionKind,
  extension: string,
  usingTsExtension = false,
): ExtensionAttempt => ({
  kind,
  extension,
  usingTsExtension,
});

const esmAttempts = (original: string): readonly ExtensionAttempt[] => {
  const explicit = original === Extension.Mts || original === Extension.Dmts;
  return [
    attempt("TypeScript", Extension.Mts, explicit),
    attempt("Declaration", Extension.Dmts, explicit),
    attempt("JavaScript", Extension.Mjs),
  ];
};

const cjsAttempts = (original: string): readonly ExtensionAttempt[] => {
  const explicit = original === Extension.Cts || original === Extension.Dcts;
  return [
    attempt("TypeScript", Extension.Cts, explicit),
    attempt("Declaration", Extension.Dcts, explicit),
    attempt("JavaScript", Extension.Cjs),
  ];
};

const jsonAttempts = (): readonly ExtensionAttempt[] => [
  attempt("Declaration", ".d.json.ts"),
  attempt("Json", Extension.Json),
];

const jsxAttempts = (original: string): readonly ExtensionAttempt[] => {
  const explicit = original === Extension.Tsx;
  return [
    attempt("TypeScript", Extension.Tsx, explicit),
    attempt("TypeScript", Extension.Ts, explicit),
    attempt("Declaration", Extension.Dts, explicit),
    attempt("JavaScript", Extension.Jsx),
    attempt("JavaScript", Extension.Js),
  ];
};

const defaultAttempts = (original: string): readonly ExtensionAttempt[] => {
  const explicit = original === Extension.Ts || original === Extension.Dts;
  return [
    attempt("TypeScript", Extension.Ts, explicit),
    attempt("TypeScript", Extension.Tsx, explicit),
    attempt("Declaration", Extension.Dts, explicit),
    attempt("JavaScript", Extension.Js),
    attempt("JavaScript", Extension.Jsx),
  ];
};

const arbitraryAttempts = (candidate: string, original: string): readonly ExtensionAttempt[] =>
  Option.liftPredicate(`${candidate}${original}`, (path) => !isDeclarationFileName(path)).pipe(
    Option.match({
      onNone: (): readonly ExtensionAttempt[] => [],
      onSome: () => [attempt("Declaration", `.d${original}.ts`)],
    }),
  );

const ATTEMPTS_BY_EXTENSION: Readonly<
  Record<string, (original: string) => readonly ExtensionAttempt[]>
> = {
  [Extension.Mjs]: esmAttempts,
  [Extension.Mts]: esmAttempts,
  [Extension.Dmts]: esmAttempts,
  [Extension.Cjs]: cjsAttempts,
  [Extension.Cts]: cjsAttempts,
  [Extension.Dcts]: cjsAttempts,
  [Extension.Json]: jsonAttempts,
  [Extension.Tsx]: jsxAttempts,
  [Extension.Jsx]: jsxAttempts,
  [Extension.Ts]: defaultAttempts,
  [Extension.Dts]: defaultAttempts,
  [Extension.Js]: defaultAttempts,
  "": defaultAttempts,
};

const attemptsFor = (candidate: string, original: string): readonly ExtensionAttempt[] =>
  Option.fromNullishOr(ATTEMPTS_BY_EXTENSION[original]).pipe(
    Option.match({
      onNone: () => arbitraryAttempts(candidate, original),
      onSome: (attempts) => attempts(original),
    }),
  );

const NONE = 0;

const tryFile = (
  fileName: string,
  onlyRecordFailures: boolean,
  state: ResolutionState,
): Option.Option<string> => {
  if (onlyRecordFailures) {
    return Option.none();
  }
  if (state.host.fileExists(fileName)) {
    traceMessage(state, Messages.fileExistsUseIt, fileName);
    return Option.some(fileName);
  }
  traceMessage(state, Messages.fileDoesNotExist, fileName);
  return Option.none();
};

const directoryProbablyMissing = (candidate: string, state: ResolutionState): boolean => {
  const directory = getDirectoryPath(candidate);
  return directory.length > NONE && !state.host.directoryExists(directory);
};

interface ExtensionRequest extends CandidateRequest {
  readonly originalExtension: string;
}

const tryAttempt = (
  candidate: string,
  { extension, usingTsExtension }: ExtensionAttempt,
  state: ResolutionState,
): Option.Option<PathAndExtension> =>
  tryFile(`${candidate}${extension}`, false, state).pipe(
    Option.map((path) => ({
      path,
      extension,
      resolvedUsingTsExtension: !state.candidateIsFromPackageJsonField && usingTsExtension,
    })),
  );

const tryAddingExtensions = (
  request: ExtensionRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  if (request.onlyRecordFailures || directoryProbablyMissing(request.candidate, state)) {
    return Option.none();
  }
  const attempts = attemptsFor(request.candidate, request.originalExtension).filter(({ kind }) =>
    request.extensions.includes(kind),
  );
  return Arr.findFirst(attempts, (current) => tryAttempt(request.candidate, current, state));
};

const resolveBySwappingExtensionWithTrace = (
  request: CandidateRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  const { candidate } = request;
  if (!getBaseFileName(candidate).includes(".")) {
    return Option.none();
  }
  const removed = removeFileExtension(candidate);
  const extensionless = Option.liftPredicate(removed, (path) => path !== candidate).pipe(
    Option.getOrElse(() => candidate.slice(NONE, candidate.lastIndexOf("."))),
  );
  const extension = candidate.slice(extensionless.length);
  traceMessage(state, Messages.fileHasExtensionStripping, candidate, extension);
  return tryAddingExtensions(
    { ...request, candidate: extensionless, originalExtension: extension },
    state,
  );
};

const loadModuleFromFile = (
  request: CandidateRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> =>
  resolveBySwappingExtensionWithTrace(request, state).pipe(
    Option.orElse(() =>
      Option.liftPredicate(state, ({ features }) => !features.esmMode).pipe(
        Option.flatMap(() => tryAddingExtensions({ ...request, originalExtension: "" }, state)),
      ),
    ),
  );

const loadFileNameFromPackageJsonField = (
  request: CandidateRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  const { candidate } = request;
  if (!isTSFileExtensionForPackageField(request.extensions, candidate)) {
    return resolveBySwappingExtensionWithTrace(request, state);
  }
  return tryFile(candidate, request.onlyRecordFailures, state).pipe(
    Option.map(() => ({
      path: candidate,
      extension: Option.getOrElse(tryExtractTSExtension(candidate), () => ""),
      resolvedUsingTsExtension: false,
    })),
  );
};

export { loadFileNameFromPackageJsonField, loadModuleFromFile, tryFile };
