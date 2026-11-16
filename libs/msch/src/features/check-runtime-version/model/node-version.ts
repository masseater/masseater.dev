import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { isToolVersions, listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "node-version";
const MINIMUM = 26;
const SUPPORTED = `Node.js ${String(MINIMUM)} or later is the only supported runtime.`;
const MANIFEST = /(?:^|\/)package\.json$/u;
const VERSION_FILE = /(?:^|\/)(?:\.node-version|\.nvmrc)$/u;
const DOCKERFILE = /(?:^|\/)(?:Dockerfile|Containerfile)[^/]*$/u;
const STEP_FILE = /^\.github\/.*\.ya?ml$|(?:^|\/)action\.ya?ml$/u;
const PINNED_VERSION = /^\s*v?(?<major>\d+)/u;
const BASE_IMAGE = /^FROM[ \t]+(?:--\S+[ \t]+)*(?:[\w.-]+(?::\d+)?\/)*node:(?<major>\d+)/gimu;
const SETUP_INPUT = /\bnode-version:[ \t]*["']?v?(?<major>\d+)/gu;
const TOOL_VERSION =
  /^[ \t]*["']?(?:node|nodejs)["']?[ \t]*(?:=[ \t]*["']?|[ \t]+)v?(?<major>\d+)/gmu;
const RANGE_FLOOR = /^(?:>=|\^|~|=)?[ \t]*v?(?<major>\d+)/u;
const ALTERNATIVE = "||";
const ENGINES_KEY = '"engines"';
const START = 0;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];

const Engines = Schema.Struct({ node: Schema.optional(Schema.String) });
const Manifest = Schema.Struct({
  private: Schema.optional(Schema.Boolean),
  publishConfig: Schema.optional(Schema.Unknown),
  engines: Schema.optional(Engines),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

const majorOf = (found: RegExpMatchArray | null): Option.Option<number> =>
  pipe(groupOf("major")(found), Option.map(Number));

const isOld = (major: number): boolean => major < MINIMUM;

const floorOf = (alternative: string): Option.Option<number> =>
  majorOf(RANGE_FLOOR.exec(Str.trim(alternative)));

const floorIsOld = (alternative: string): boolean =>
  pipe(floorOf(alternative), Option.match({ onNone: () => true, onSome: isOld }));

const admitsOld = (range: string): boolean =>
  pipe(Str.split(range, ALTERNATIVE), Arr.some(floorIsOld));

interface Found {
  readonly entry: Listed;
  readonly source: string;
  readonly index: number;
}

const problemAt = ({ entry, source, index }: Found, message: string): Problem => ({
  file: entry.file,
  ...positionOf(source)(index),
  rule: RULE,
  message,
});

const offsetOf = (source: string, text: string): number =>
  pipe(
    Str.indexOf(text)(source),
    Option.getOrElse(() => START),
  );

const unstatedProblem = (entry: Listed, source: string): Problem =>
  problemAt(
    { entry, source, index: START },
    `${SUPPORTED} This package is published without engines.node, so its users cannot tell. Set engines.node to ">=${String(MINIMUM)}".`,
  );

const rangeProblem =
  (entry: Listed, source: string) =>
  (range: string): Problem =>
    problemAt(
      { entry, source, index: offsetOf(source, ENGINES_KEY) },
      `${SUPPORTED} engines.node is "${range}", which admits an older one. Set it to ">=${String(MINIMUM)}".`,
    );

const isPublished = (manifest: typeof Manifest.Type): boolean =>
  manifest.private !== true && Predicate.isNotUndefined(manifest.publishConfig);

const rangeOf = (manifest: typeof Manifest.Type): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(manifest.engines),
    Option.flatMap(({ node }) => Option.fromUndefinedOr(node)),
  );

const manifestProblems = (entry: Listed, source: string): readonly Problem[] => {
  const manifest = decodeManifest(source);
  if (Option.isNone(manifest)) {
    return [];
  }
  const range = rangeOf(manifest.value);
  if (Option.isNone(range) && isPublished(manifest.value)) {
    return [unstatedProblem(entry, source)];
  }
  return pipe(
    range,
    Option.filter(admitsOld),
    Option.map(rangeProblem(entry, source)),
    Option.toArray,
  );
};

const pinnedProblems =
  (pattern: RegExp) =>
  (entry: Listed, source: string): readonly Problem[] =>
    pipe(
      Arr.fromIterable(Str.matchAll(pattern)(source)),
      Arr.filter((found) => Option.exists(majorOf(found), isOld)),
      Arr.map((found) =>
        problemAt(
          { entry, source, index: found.index ?? START },
          `${SUPPORTED} \`${Str.trim(found[START])}\` pins an older one. Raise it to ${String(MINIMUM)} or later.`,
        ),
      ),
    );

const versionFileProblems = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    majorOf(PINNED_VERSION.exec(source)),
    Option.filter(isOld),
    Option.map((major) =>
      problemAt(
        { entry, source, index: START },
        `${SUPPORTED} This file pins ${String(major)}. Raise it to ${String(MINIMUM)} or later.`,
      ),
    ),
    Option.toArray,
  );

const problemsIn = (entry: Listed, source: string): readonly Problem[] => {
  if (MANIFEST.test(entry.name)) {
    return manifestProblems(entry, source);
  }
  if (VERSION_FILE.test(entry.name)) {
    return versionFileProblems(entry, source);
  }
  if (DOCKERFILE.test(entry.name)) {
    return pinnedProblems(BASE_IMAGE)(entry, source);
  }
  if (isToolVersions(entry)) {
    return pinnedProblems(TOOL_VERSION)(entry, source);
  }
  return pinnedProblems(SETUP_INPUT)(entry, source);
};

const isVersionSource = (entry: Listed): boolean =>
  VERSION_FILE.test(entry.name) ||
  DOCKERFILE.test(entry.name) ||
  STEP_FILE.test(entry.name) ||
  isToolVersions(entry);

/** @internal */
export const checkNodeVersion = Effect.fn("checkNodeVersion")(function* checkNodeVersion(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* listedFiles(root);
  const manifests = yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
  const sources = [
    ...pipe(listed, Arr.filter(isVersionSource)),
    ...pipe(
      manifests,
      Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
    ),
  ];
  return yield* scanText(sources, problemsIn);
});
