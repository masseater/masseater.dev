import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { MANIFEST_FILE, EntryManifestJson, publicEntriesOf } from "#/entities/package/index.ts";
import type { PublicEntry } from "#/entities/package/index.ts";
import type { RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { fileProblem as problemAt, memberWorkspaces } from "./member-sources.ts";

const ENTRY_RULE: RuleName = "public-entry";
const PUBLIC_ENTRY =
  /^(?:bin\/[^/]+|src\/(?:app\/[^/]+|(?:pages|widgets|features|entities)\/[^/]+\/index(?:\.[a-z]+)*\.tsx?|shared\/[^/]+\/index(?:\.[a-z]+)*\.tsx?|shared\/(?:ui|lib)\/.+))$/u;

const ENTRY_MESSAGE =
  "is a package entry that points inside a slice. Point exports and bin at bin/<name>.ts, src/app/<entry>.ts or a slice's index.ts.";

const decodeEntryManifest = Schema.decodeUnknownOption(EntryManifestJson);

const entryProblems = Effect.fn("entryProblems")(function* entryProblems(
  root: string,
  workspace: string,
) {
  const files = yield* RepositoryFiles;
  const directory = files.join(root, workspace);
  const text = yield* files.readFile(files.join(directory, MANIFEST_FILE));
  const join = (target: string): string => files.join(directory, target);
  return pipe(
    text,
    Option.flatMap(decodeEntryManifest),
    Option.map((manifest) => publicEntriesOf({ manifest, join, packEntries: [] })),
    Option.getOrElse((): readonly PublicEntry[] => []),
    Arr.filter(({ source }) => !PUBLIC_ENTRY.test(files.relative(directory, source))),
    Arr.map(({ label, source }) =>
      problemAt({ file: source, rule: ENTRY_RULE, message: `${label} ${ENTRY_MESSAGE}` }),
    ),
  );
});

/** @internal */
export const checkPublicEntries = Effect.fn("checkPublicEntries")(function* checkPublicEntries(
  root: string,
) {
  const workspaces = yield* memberWorkspaces(root);
  const entries = yield* Effect.forEach(workspaces, (workspace) => entryProblems(root, workspace), {
    concurrency: 1,
  });
  return Arr.flatten(entries);
});
