import { Array as Arr, Option, pipe } from "effect";

export type Status = "clean" | "dirty" | "empty";

export interface Scope {
  readonly statuses: ReadonlyMap<string, Status>;
}

const CLEAN_VARIABLES: readonly string[] = [
  "-",
  "$",
  "?",
  "!",
  "#",
  "BASHPID",
  "BASH_ARGC",
  "BASH_LINENO",
  "BASH_SUBSHELL",
  "EUID",
  "EPOCHREALTIME",
  "EPOCHSECONDS",
  "LINENO",
  "OPTIND",
  "PPID",
  "RANDOM",
  "READLINE_ARGUMENT",
  "READLINE_MARK",
  "READLINE_POINT",
  "SECONDS",
  "SHELLOPTS",
  "SHLVL",
  "SRANDOM",
  "UID",
  "COLUMNS",
  "HISTFILESIZE",
  "HISTSIZE",
  "LINES",
  "FLAGS_ERROR",
  "FLAGS_FALSE",
  "FLAGS_TRUE",
];

export const EMPTY_SCOPE: Scope = { statuses: new Map() };

export const initialScope = (): Scope => ({
  statuses: new Map(
    pipe(
      CLEAN_VARIABLES,
      Arr.map((name): readonly [string, Status] => [name, "clean"]),
    ),
  ),
});

const merge = (left: Status, right: Status): Status => {
  if (left === "empty") {
    return right;
  }
  if (right === "empty" || left === right) {
    return left;
  }
  return "dirty";
};

const append = (left: Status, right: Status): Status => {
  if (left === "empty") {
    return right;
  }
  if (right === "empty") {
    return left;
  }
  if (left === "clean" && right === "clean") {
    return "clean";
  }
  return "dirty";
};

export const mergeAll = (statuses: readonly Status[]): Status => {
  let merged: Status = "empty";
  for (const status of statuses) {
    merged = merge(merged, status);
  }
  return merged;
};

export const appendAll = (statuses: readonly Status[]): Status => {
  let appended: Status = "empty";
  for (const status of statuses) {
    appended = append(appended, status);
  }
  return appended;
};

export const statusOf =
  (name: string) =>
  (scope: Scope): Status =>
    scope.statuses.get(name) ?? "dirty";

export const integerKey = (name: string): string => `%${name}`;

export const functionKey = (name: string): string => `()${name}`;

export const isInteger =
  (name: string) =>
  (scope: Scope): boolean =>
    statusOf(integerKey(name))(scope) === "clean";

export const valueOf =
  (name: string) =>
  (scope: Scope): Status => {
    if (isInteger(name)(scope)) {
      return "clean";
    }
    return statusOf(name)(scope);
  };

const joinScopes = (left: Scope, right: Scope): Scope => {
  const statuses = new Map<string, Status>();
  for (const name of new Set([...left.statuses.keys(), ...right.statuses.keys()])) {
    statuses.set(name, merge(statusOf(name)(left), statusOf(name)(right)));
  }
  return { statuses };
};

const join = (left: Option.Option<Scope>, right: Option.Option<Scope>): Option.Option<Scope> => {
  if (Option.isNone(left)) {
    return right;
  }
  if (Option.isNone(right)) {
    return left;
  }
  return Option.some(joinScopes(left.value, right.value));
};

export const joinAll = (flows: readonly Option.Option<Scope>[]): Option.Option<Scope> => {
  let joined = Option.none<Scope>();
  for (const flow of flows) {
    joined = join(joined, flow);
  }
  return joined;
};

export interface Change {
  readonly name: string;
  readonly status: Status;
}

const withStatus =
  ({ name, status }: Change) =>
  (scope: Scope): Scope => ({
    statuses: new Map([...scope.statuses, [name, status]]),
  });

export const setStatus =
  (change: Change) =>
  (flow: Option.Option<Scope>): Option.Option<Scope> =>
    pipe(flow, Option.map(withStatus(change)));

export const setAll =
  (changes: readonly Change[]) =>
  (flow: Option.Option<Scope>): Option.Option<Scope> => {
    let current = flow;
    for (const change of changes) {
      current = setStatus(change)(current);
    }
    return current;
  };

export const scopeOf = (flow: Option.Option<Scope>): Scope =>
  Option.getOrElse(flow, () => EMPTY_SCOPE);
