import { Array as Arr, Effect, Option, Predicate, Result, Schema, pipe } from "effect";
import { parse } from "vite-plus";

import {
  KeySchema,
  childrenOf,
  keyName,
  owningWorkspace,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { fileProblem } from "./member-sources.ts";
import { readReadme } from "./readme-file.ts";

const RULE: RuleName = "deployed-readme";
const ROOT_DIRECTORY = "";
const READ_CONCURRENCY = 16;
const MISSING_MESSAGE =
  "is missing. This workspace has an Alchemy stack that serves an address, so give it a README.md that says what it is and links its URL.";
const NO_URL_MESSAGE =
  "has no https:// URL. This workspace has an Alchemy stack that serves an address, so link the URL it is served at.";
const ADDRESS_KEYS = ["domain", "domains", "routes", "hostname"];
const URL_KEY = "url";
const STACK_FILE = /(?:^|\/)alchemy\.(?![^/]*\.test\.)[^/]+\.[cm]?ts$/u;
const ALCHEMY_IMPORT = /from\s+["'](?:alchemy|@alchemy\.run)(?:\/[^"']*)?["']/u;
const URL_PATTERN = /https:\/\/[^\s)>\]]+/u;
const decodeKey = Schema.decodeUnknownOption(KeySchema);

const propertyNamed =
  (names: readonly string[]) =>
  (node: unknown): boolean =>
    Predicate.isReadonlyObject(node) &&
    node["type"] === "Property" &&
    pipe(
      decodeKey(node["key"]),
      Option.exists((key) => Arr.contains(names, keyName(key))),
    );

const isAddressProperty = propertyNamed(ADDRESS_KEYS);
const isUrlProperty = propertyNamed([URL_KEY]);

const ReturnedObject = Schema.Struct({
  type: Schema.Literal("ReturnStatement"),
  argument: Schema.Struct({
    type: Schema.Literal("ObjectExpression"),
    properties: Schema.Array(Schema.Unknown),
  }),
});

const decodeReturnedObject = Schema.decodeUnknownOption(ReturnedObject);

const returnsUrl = (node: unknown): boolean =>
  pipe(
    decodeReturnedObject(node),
    Option.exists(({ argument }) => pipe(argument.properties, Arr.some(isUrlProperty))),
  );

const servesAddress = (node: unknown): boolean =>
  isAddressProperty(node) || returnsUrl(node) || pipe(childrenOf(node), Arr.some(servesAddress));

const deploysTo = Effect.fn("deploysTo")(function* deploysTo(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, file));
  if (Option.isNone(text) || !ALCHEMY_IMPORT.test(text.value)) {
    return false;
  }
  const parsed = yield* Effect.promise(() => parse(file, text.value, { lang: "ts" }));
  return servesAddress(parsed.program);
});

const problemIn = Effect.fn("problemIn")(function* problemIn(root: string, directory: string) {
  const readme = yield* readReadme({
    root,
    directory,
    rule: RULE,
    missingMessage: MISSING_MESSAGE,
  });
  return Result.match(readme, {
    onFailure: Option.some,
    onSuccess: ({ file, source }) =>
      pipe(
        Option.liftPredicate(source, (text) => !URL_PATTERN.test(text)),
        Option.map(() => fileProblem({ file, rule: RULE, message: NO_URL_MESSAGE })),
      ),
  });
});

/** @internal */
export const checkDeployedReadme = Effect.fn("checkDeployedReadme")(function* checkDeployedReadme(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const directories = yield* workspaceDirectories(root);
  const candidates = pipe(
    listed,
    Arr.filter((file) => STACK_FILE.test(file)),
  );
  const deploying = yield* Effect.filter(candidates, (file) => deploysTo(root, file), {
    concurrency: READ_CONCURRENCY,
  });
  const owners = pipe(
    deploying,
    Arr.map((file) =>
      pipe(
        owningWorkspace(directories)(files.dirname(file)),
        Option.getOrElse(() => ROOT_DIRECTORY),
      ),
    ),
    Arr.dedupe,
  );
  const found = yield* Effect.forEach(owners, (directory) => problemIn(root, directory), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.getSomes(found);
});
