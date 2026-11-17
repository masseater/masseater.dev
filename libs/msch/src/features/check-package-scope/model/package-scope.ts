import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "package-scope";
const SCOPE = "@r_masseater/";
const NAME_KEY = '"name"';
const START = 0;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];

const Manifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  private: Schema.optional(Schema.Boolean),
  publishConfig: Schema.optional(Schema.Unknown),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

const isPublished = (manifest: typeof Manifest.Type): boolean =>
  manifest.private !== true && Predicate.isNotUndefined(manifest.publishConfig);

const unscopedName = (manifest: typeof Manifest.Type): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(manifest.name),
    Option.filter((name) => !Str.startsWith(SCOPE)(name)),
  );

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    decodeManifest(source),
    Option.filter(isPublished),
    Option.flatMap(unscopedName),
    Option.map((name): Problem => ({
      file: entry.file,
      ...positionOf(source)(
        pipe(
          Str.indexOf(NAME_KEY)(source),
          Option.getOrElse(() => START),
        ),
      ),
      rule: RULE,
      message: `Packages are published only under the ${SCOPE} scope. Rename "${name}" to "${SCOPE}${Str.replace(/^@[^/]+\//u, "")(name)}".`,
    })),
    Option.toArray,
  );

/** @internal */
export const checkPackageScope = Effect.fn("checkPackageScope")(function* checkPackageScope(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const manifests = yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
  return yield* scanText(
    pipe(
      manifests,
      Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
    ),
    problemsIn,
  );
});
