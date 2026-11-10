import { Option, Predicate, Record as Rec, Function as Fn } from "effect";

import { Messages, traceMessage } from "./messages.ts";
import { combinePaths, normalizePath } from "./paths.ts";
import type { PackageJsonContent, ResolutionState } from "./resolution-types.ts";

const DATA_FIRST_ARITY_3 = 3;

interface FieldRequest {
  readonly field: string;
  readonly expected: "string" | "object";
}

interface PathFieldRequest {
  readonly field: string;
  readonly baseDirectory: string;
}

const EMPTY = 0;

const typeName = (value: unknown): string => {
  if (Predicate.isNull(value)) {
    return "null";
  }
  return typeof value;
};

const resolvePackageJsonFieldWithTrace: {
  (
    request: FieldRequest,
    state: ResolutionState,
  ): (content: PackageJsonContent) => Option.Option<unknown>;
  (
    content: PackageJsonContent,
    request: FieldRequest,
    state: ResolutionState,
  ): Option.Option<unknown>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    content: PackageJsonContent,
    { field, expected }: FieldRequest,
    state: ResolutionState,
  ): Option.Option<unknown> => {
    if (!Rec.has(content, field)) {
      traceMessage(state, Messages.packageJsonMissingField, field);
      return Option.none();
    }
    const value = content[field];
    if (typeof value !== expected || Predicate.isNull(value)) {
      traceMessage(state, Messages.expectedFieldType, field, expected, typeName(value));
      return Option.none();
    }
    return Option.some(value);
  },
);

const resolvePathWithTrace = (
  fileName: string,
  { field, baseDirectory }: PathFieldRequest,
  state: ResolutionState,
): Option.Option<string> => {
  if (fileName.length === EMPTY) {
    traceMessage(state, Messages.packageJsonFalsyField, field);
    return Option.none();
  }
  const path = normalizePath(combinePaths(baseDirectory, fileName));
  traceMessage(state, Messages.packageJsonFieldReferences, field, fileName, path);
  return Option.some(path);
};

const resolvePackageJsonPathWithTrace = (
  content: PackageJsonContent,
  request: PathFieldRequest,
  state: ResolutionState,
): Option.Option<string> =>
  resolvePackageJsonFieldWithTrace(
    content,
    { field: request.field, expected: "string" },
    state,
  ).pipe(
    Option.filter((value) => Predicate.isString(value)),
    Option.flatMap((fileName) => resolvePathWithTrace(fileName, request, state)),
  );

const readPackageJsonTypesFields: {
  (
    baseDirectory: string,
    state: ResolutionState,
  ): (content: PackageJsonContent) => Option.Option<string>;
  (
    content: PackageJsonContent,
    baseDirectory: string,
    state: ResolutionState,
  ): Option.Option<string>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    content: PackageJsonContent,
    baseDirectory: string,
    state: ResolutionState,
  ): Option.Option<string> =>
    resolvePackageJsonPathWithTrace(content, { field: "typings", baseDirectory }, state).pipe(
      Option.orElse(() =>
        resolvePackageJsonPathWithTrace(content, { field: "types", baseDirectory }, state),
      ),
    ),
);

const readPackageJsonMainField: {
  (
    baseDirectory: string,
    state: ResolutionState,
  ): (content: PackageJsonContent) => Option.Option<string>;
  (
    content: PackageJsonContent,
    baseDirectory: string,
    state: ResolutionState,
  ): Option.Option<string>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    content: PackageJsonContent,
    baseDirectory: string,
    state: ResolutionState,
  ): Option.Option<string> =>
    resolvePackageJsonPathWithTrace(content, { field: "main", baseDirectory }, state),
);

const asRecord = (value: unknown): Readonly<Record<string, unknown>> =>
  Option.liftPredicate(value, Predicate.isObject).pipe(Option.getOrElse(() => ({})));

export {
  asRecord,
  readPackageJsonMainField,
  readPackageJsonTypesFields,
  resolvePackageJsonFieldWithTrace,
};
export type { FieldRequest };
