import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "colocated-git-patterns";
const PATTERN_FILES = [":(glob)**/.gitignore", ":(glob)**/.gitattributes"] as const;
const ROOT = ".";
const SEPARATOR = "/";
const NEGATION = "!";
const COMMENT = "#";
const ANY_DEPTH = "**";
const FLOATING_PREFIX = `${ANY_DEPTH}${SEPARATOR}`;
const LEADING_SLASHES = /^\/+/u;
const TRAILING_SLASHES = /\/+$/u;
const SPACES = /\s+/u;
const FIRST = 1;
const READ_CONCURRENCY = 16;

interface PatternEntry {
  readonly file: string;
  readonly kind: string;
  readonly directory: string;
  readonly line: number;
  readonly pattern: string;
  readonly values: string;
}

const isInside =
  (directory: string) =>
  (inner: string): boolean =>
    inner !== directory &&
    (directory === ROOT || Str.startsWith(`${directory}${SEPARATOR}`)(inner));

const withoutPrefix = (prefix: string, text: string): string => {
  if (Str.startsWith(prefix)(text)) {
    return Str.slice(prefix.length)(text);
  }
  return text;
};

const isAnchored = (pattern: string): boolean => {
  const body = withoutPrefix(NEGATION, pattern);
  return pipe(body, Str.replace(TRAILING_SLASHES, ""), Str.includes(SEPARATOR));
};

const segmentsOf = ({ directory, pattern }: PatternEntry): readonly string[] => {
  const body = withoutPrefix(NEGATION, pattern);
  const trimmed = pipe(body, Str.replace(LEADING_SLASHES, ""), Str.replace(TRAILING_SLASHES, ""));
  const own = Str.split(SEPARATOR)(trimmed);
  if (directory === ROOT) {
    return own;
  }
  return [...Str.split(SEPARATOR)(directory), ...own];
};

const depthOf = (directory: string): number => Str.split(SEPARATOR)(directory).length;

const entryOf =
  (file: string, kind: string, directory: string) =>
  (line: string, index: number): Option.Option<PatternEntry> => {
    const [pattern, ...values] = pipe(Str.trim(line), Str.split(SPACES));
    if (Str.isEmpty(pattern) || Str.startsWith(COMMENT)(pattern)) {
      return Option.none();
    }
    return Option.some({
      file,
      kind,
      directory,
      line: index + FIRST,
      pattern,
      values: Arr.join(values, " "),
    });
  };

const entriesIn = Effect.fn("entriesIn")(function* entriesIn(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const absolute = files.join(root, file);
  const text = yield* files.readFile(absolute);
  const toEntry = entryOf(absolute, files.basename(file), files.dirname(file));
  return pipe(
    Option.getOrElse(text, () => ""),
    Str.split("\n"),
    Arr.map(toEntry),
    Arr.getSomes,
  );
});

const problemAt = (entry: PatternEntry, message: string): Problem => ({
  file: entry.file,
  line: entry.line,
  column: FIRST,
  rule: RULE,
  message,
});

const misplacedMessage = (kind: string, workspaces: readonly string[]): string => {
  if (workspaces.length === FIRST) {
    const workspace = Arr.join(workspaces, "");
    return `matches only paths inside the workspace ${workspace}. Move it to ${workspace}/${kind} and write it relative to that directory.`;
  }
  return `matches paths inside the workspaces ${Arr.join(workspaces, ", ")}. Move it to the ${kind} of each workspace that needs it, or start it with **/ when it belongs to a tool any workspace can use.`;
};

const matchedAtDepth = Effect.fn("matchedAtDepth")(function* matchedAtDepth(
  root: string,
  segments: readonly string[],
  depth: number,
) {
  const files = yield* RepositoryFiles;
  const leading = Arr.take(segments, depth);
  if (Arr.contains(leading, ANY_DEPTH)) {
    return [];
  }
  const manifests = yield* files.matchingFiles(root, [
    `:(glob)${Arr.join(leading, SEPARATOR)}${SEPARATOR}${MANIFEST_FILE}`,
  ]);
  return pipe(
    manifests,
    Arr.map((manifest) => files.dirname(manifest)),
  );
});

const deepestOf = (inner: readonly string[]): readonly string[] =>
  pipe(
    inner,
    Arr.filter((workspace) => !pipe(inner, Arr.some(isInside(workspace)))),
  );

const matchedWorkspaces = Effect.fn("matchedWorkspaces")(function* matchedWorkspaces(
  root: string,
  workspaces: readonly string[],
  entry: PatternEntry,
) {
  const segments = segmentsOf(entry);
  const candidates = pipe(
    workspaces,
    Arr.filter(isInside(entry.directory)),
    Arr.filter((workspace) => depthOf(workspace) < segments.length),
  );
  const depths = pipe(candidates, Arr.map(depthOf), Arr.dedupe);
  const matched = yield* pipe(
    depths,
    Effect.forEach((depth) => matchedAtDepth(root, segments, depth)),
  );
  const flat = Arr.flatten(matched);
  return pipe(
    candidates,
    Arr.filter((workspace) => Arr.contains(flat, workspace)),
    deepestOf,
  );
});

const misplaced = Effect.fn("misplaced")(function* misplaced(
  root: string,
  workspaces: readonly string[],
  entry: PatternEntry,
) {
  if (!isAnchored(entry.pattern)) {
    return Option.none<Problem>();
  }
  const deepest = yield* matchedWorkspaces(root, workspaces, entry);
  if (Arr.isReadonlyArrayEmpty(deepest)) {
    return Option.none<Problem>();
  }
  return Option.some(problemAt(entry, misplacedMessage(entry.kind, deepest)));
});

const isFloating = (pattern: string): boolean =>
  !Str.startsWith(NEGATION)(pattern) &&
  (!isAnchored(pattern) || Str.startsWith(FLOATING_PREFIX)(pattern));

const ownLevelName = (pattern: string): Option.Option<string> => {
  if (isFloating(pattern)) {
    return Option.some(pattern);
  }
  const name = withoutPrefix(SEPARATOR, pattern);
  return Option.liftPredicate(name, (own) => isFloating(own) && !isAnchored(own));
};

const sameName = (outer: string, name: string): boolean => {
  if (outer === name) {
    return true;
  }
  return Str.endsWith(SEPARATOR)(name) && `${outer}${SEPARATOR}` === name;
};

const coveredBy =
  (entry: PatternEntry, name: string) =>
  (outer: PatternEntry): boolean =>
    outer.kind === entry.kind &&
    outer.values === entry.values &&
    isFloating(outer.pattern) &&
    isInside(outer.directory)(entry.directory) &&
    sameName(outer.pattern, name);

const outerName = ({ directory, kind }: PatternEntry): string => {
  if (directory === ROOT) {
    return `the root ${kind}`;
  }
  return `${directory}/${kind}`;
};

const repeated =
  (entries: readonly PatternEntry[]) =>
  (entry: PatternEntry): Option.Option<Problem> => {
    const outer = pipe(
      ownLevelName(entry.pattern),
      Option.flatMap((name) => pipe(entries, Arr.findFirst(coveredBy(entry, name)))),
    );
    return pipe(
      outer,
      Option.map((found) =>
        problemAt(
          entry,
          `repeats ${found.pattern} from ${outerName(found)}, which already applies here. Delete it.`,
        ),
      ),
    );
  };

/** @internal */
export const checkColocatedGitPatterns = Effect.fn("checkColocatedGitPatterns")(
  function* checkColocatedGitPatterns(root: string) {
    const files = yield* RepositoryFiles;
    const patternFiles = yield* files.matchingFiles(root, PATTERN_FILES);
    const read = yield* Effect.forEach(patternFiles, (file) => entriesIn(root, file), {
      concurrency: READ_CONCURRENCY,
    });
    const entries = Arr.flatten(read);
    const workspaces = yield* workspaceDirectories(root);
    const misplacedFound = yield* Effect.forEach(
      entries,
      (entry) => misplaced(root, workspaces, entry),
      { concurrency: READ_CONCURRENCY },
    );
    const repeatedFound = pipe(entries, Arr.map(repeated(entries)));
    return Arr.getSomes([...misplacedFound, ...repeatedFound]);
  },
);
