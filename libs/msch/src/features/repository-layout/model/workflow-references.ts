import { Array as Arr, Option, String as Str, pipe } from "effect";
import { parseDocument } from "yaml";

import {
  childOf,
  entriesOf,
  itemsOf,
  scalarsIn,
  stringOf,
  workingDirectoryOf,
} from "./workflow-nodes.ts";
import type { Entry, Located } from "./workflow-nodes.ts";

const ROOT = ".";
const LOCAL = "./";
const NEGATION = "!";
const SEPARATOR = "/";
const LINE = "\n";
const UNRESOLVED_MARKERS = ["${{", "$", "{"];
const ABSOLUTE_MARKERS = ["/", "~"];
const FILE_INPUT_SUFFIX = "-file";
const DEPENDENCY_PATH_INPUT = "cache-dependency-path";
const FILTER_KEYS = ["paths", "paths-ignore"];
const HASH_FILES = /hashFiles\((?<arguments>[^)]*)\)/gu;
const QUOTED = /'(?<path>[^']*)'/gu;
const SCRIPT = /^[\w.@/-]+\.(?:ts|mts|cts|sh)$/u;
const TOKEN_SEPARATOR = /[\s;&|()<>"'`=]+/u;

/** @internal */
export const ACTION_DEFINITIONS: readonly string[] = ["action.yml", "action.yaml"];

/** @internal */
export type ReferenceKind = "glob" | "file" | "script" | "directory" | "action";

/** @internal */
export interface WorkflowReference {
  readonly kind: ReferenceKind;
  readonly field: string;
  readonly path: string;
  readonly offset: number;
}

const containsAny =
  (markers: readonly string[]) =>
  (path: string): boolean =>
    pipe(
      markers,
      Arr.some((marker) => Str.includes(marker)(path)),
    );

const startsWithAny =
  (markers: readonly string[]) =>
  (path: string): boolean =>
    pipe(
      markers,
      Arr.some((marker) => Str.startsWith(marker)(path)),
    );

const isLiteralPath = (path: string): boolean =>
  Str.isNonEmpty(path) &&
  !containsAny(UNRESOLVED_MARKERS)(path) &&
  !startsWithAny(ABSOLUTE_MARKERS)(path);

const withoutLocal = (path: string): string => {
  if (Str.startsWith(LOCAL)(path)) {
    return Str.slice(LOCAL.length)(path);
  }
  return path;
};

const joinPath = (base: string, path: string): string => {
  const relative = withoutLocal(Str.trim(path));
  if (base === ROOT) {
    return relative;
  }
  return `${base}${SEPARATOR}${relative}`;
};

const reference =
  (kind: ReferenceKind, field: string, base = ROOT) =>
  ({ text, offset }: Located): readonly WorkflowReference[] => {
    const path = Str.trim(text);
    if (!isLiteralPath(path) || !isLiteralPath(base)) {
      return [];
    }
    return [{ kind, field, path: joinPath(base, path), offset }];
  };

const isPositive = ({ text }: Located): boolean => !Str.startsWith(NEGATION)(Str.trim(text));

const globsIn = (field: string, node: unknown): readonly WorkflowReference[] =>
  pipe(
    itemsOf(node),
    Arr.flatMap((item) => Option.toArray(stringOf(item))),
    Arr.filter(isPositive),
    Arr.flatMap(reference("glob", field)),
  );

const filtersOf = ([event, filters]: Entry): readonly WorkflowReference[] =>
  pipe(
    FILTER_KEYS,
    Arr.flatMap((key) => globsIn(`on.${event}.${key}`, childOf(key)(filters))),
  );

const directoryOf = (located: Option.Option<Located>, base: string): string =>
  pipe(
    located,
    Option.map(({ text }) => joinPath(ROOT, text)),
    Option.getOrElse(() => base),
  );

const located =
  (kind: ReferenceKind, field: string, base = ROOT) =>
  (found: Option.Option<Located>): readonly WorkflowReference[] =>
    pipe(found, Option.toArray, Arr.flatMap(reference(kind, field, base)));

const localUses = (node: unknown): Option.Option<Located> =>
  pipe(
    stringOf(childOf("uses")(node)),
    Option.filter(({ text }) => Str.startsWith(LOCAL)(text)),
  );

const scriptsIn =
  (field: string, base: string) =>
  ({ text, offset }: Located): readonly WorkflowReference[] =>
    pipe(
      Str.split(text, TOKEN_SEPARATOR),
      Arr.filter((token) => SCRIPT.test(token)),
      Arr.dedupe,
      Arr.flatMap((token) => reference("script", field, base)({ text: token, offset })),
    );

const isFileInput = ([key]: Entry): boolean =>
  Str.endsWith(FILE_INPUT_SUFFIX)(key) || key === DEPENDENCY_PATH_INPUT;

const linesOf = ({ text, offset }: Located): readonly Located[] =>
  pipe(
    Str.split(text, LINE),
    Arr.map((line) => ({ text: line, offset })),
  );

const fileInputOf =
  (field: string) =>
  ([key, value]: Entry): readonly WorkflowReference[] =>
    pipe(
      stringOf(value),
      Option.toArray,
      Arr.flatMap(linesOf),
      Arr.flatMap(reference("glob", `${field}.with.${key}`)),
    );

const fileInputsIn = (field: string, step: unknown): readonly WorkflowReference[] =>
  pipe(entriesOf(childOf("with")(step)), Arr.filter(isFileInput), Arr.flatMap(fileInputOf(field)));

const stepReferences =
  (job: string, base: string) =>
  (step: unknown, index: number): readonly WorkflowReference[] => {
    const field = `jobs.${job}.steps[${index}]`;
    const own = stringOf(childOf("working-directory")(step));
    const directory = directoryOf(own, base);
    return [
      ...located("action", `${field}.uses`)(localUses(step)),
      ...located("directory", `${field}.working-directory`)(own),
      ...pipe(
        stringOf(childOf("run")(step)),
        Option.toArray,
        Arr.flatMap(scriptsIn(`${field}.run`, directory)),
      ),
      ...fileInputsIn(field, step),
    ];
  };

const jobReferences =
  (base: string) =>
  ([job, node]: Entry): readonly WorkflowReference[] => {
    const own = workingDirectoryOf(node);
    const steps = itemsOf(childOf("steps")(node));
    const directory = directoryOf(own, base);
    return [
      ...located("file", `jobs.${job}.uses`)(localUses(node)),
      ...located("directory", `jobs.${job}.defaults.run.working-directory`)(own),
      ...pipe(steps, Arr.flatMap(stepReferences(job, directory))),
    ];
  };

const groupsOf =
  (pattern: RegExp, group: string) =>
  ({ text, offset }: Located): readonly Located[] =>
    pipe(
      Arr.fromIterable(Str.matchAll(pattern)(text)),
      Arr.flatMap((match) =>
        pipe(
          Option.fromNullishOr(match.groups),
          Option.flatMap((groups) => Option.fromNullishOr(groups[group])),
          Option.toArray,
        ),
      ),
      Arr.map((value) => ({ text: value, offset })),
    );

const hashFilesIn = (source: string): readonly WorkflowReference[] =>
  pipe(
    scalarsIn(source),
    Arr.flatMap(groupsOf(HASH_FILES, "arguments")),
    Arr.flatMap(groupsOf(QUOTED, "path")),
    Arr.filter(isPositive),
    Arr.flatMap(reference("glob", "hashFiles")),
  );

const jobsOf = (source: string): readonly Entry[] =>
  entriesOf(childOf("jobs")(parseDocument(source).contents));

/** @internal */
export const workflowReferences = (source: string): readonly WorkflowReference[] => {
  const root = parseDocument(source).contents;
  const workflowDefault = workingDirectoryOf(root);
  const base = directoryOf(workflowDefault, ROOT);
  return [
    ...pipe(entriesOf(childOf("on")(root)), Arr.flatMap(filtersOf)),
    ...located("directory", "defaults.run.working-directory")(workflowDefault),
    ...pipe(jobsOf(source), Arr.flatMap(jobReferences(base))),
    ...hashFilesIn(source),
  ];
};

const pathInputOf = (step: unknown): unknown => childOf("path")(childOf("with")(step));

const outputPathsOf = (step: unknown): readonly string[] =>
  pipe(
    stringOf(pathInputOf(step)),
    Option.toArray,
    Arr.flatMap(linesOf),
    Arr.map(({ text }) => joinPath(ROOT, text)),
    Arr.filter(isLiteralPath),
  );

/** @internal */
export const producedPaths = (source: string): readonly string[] =>
  pipe(
    jobsOf(source),
    Arr.flatMap(([, job]) => itemsOf(childOf("steps")(job))),
    Arr.flatMap(outputPathsOf),
  );
