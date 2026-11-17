import { parse } from "@pnpm/deps.path";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import semver from "semver";

import { lockedGraph } from "#/entities/workspace/index.ts";
import type { LockedNode } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "legacy-typescript";
const LOCKFILE = "pnpm-lock.yaml";
const COMPILER = "typescript";
const CURRENT_MAJOR = 7;
const LEGACY_COMPILER_PACKAGE = /^@typescript\/typescript\d+$/u;
const FIRST = 1;

interface Legacy {
  readonly id: string;
  readonly name: string;
}

const legacyOf = (id: string): Option.Option<Legacy> => {
  const { name, version } = parse(id);
  const isOldCompiler =
    name === COMPILER &&
    pipe(
      Option.fromNullishOr(version),
      Option.flatMap((found) => Option.fromNullishOr(semver.coerce(found))),
      Option.exists((found) => found.major < CURRENT_MAJOR),
    );
  return pipe(
    Option.fromNullishOr(name),
    Option.filter(() => isOldCompiler || LEGACY_COMPILER_PACKAGE.test(name ?? "")),
    Option.map((found) => ({ id, name: found })),
  );
};

const dependentsOf =
  (nodes: readonly LockedNode[]) =>
  (id: string): readonly string[] =>
    pipe(
      nodes,
      Arr.filter(({ dependencies }) => Arr.contains(dependencies, id)),
      Arr.map((node) => `\`${node.id}\``),
    );

const lineOf =
  (source: string) =>
  (id: string): number =>
    pipe(
      Str.split(source, "\n"),
      Arr.findFirstIndex((line) => Str.replaceAll("'", "")(Str.trim(line)) === `${id}:`),
      Option.match({ onNone: () => FIRST, onSome: (index) => index + FIRST }),
    );

const messageOf = (legacy: Legacy, dependents: readonly string[]): string =>
  `\`${legacy.id}\` is installed, pulled in by ${Arr.join(dependents, ", ")}. Only TypeScript ${String(CURRENT_MAJOR)} or newer is used: remove the dependency that needs the old compiler, move it to the TypeScript ${String(CURRENT_MAJOR)} API, or bundle or port it. Do not install an old compiler beside TypeScript ${String(CURRENT_MAJOR)}.`;

/** @internal */
export const checkTypescriptGeneration = Effect.fn("checkTypescriptGeneration")(
  function* checkTypescriptGeneration(root: string) {
    const files = yield* RepositoryFiles;
    const file = files.join(root, LOCKFILE);
    const nodes = yield* lockedGraph(root).pipe(Effect.orElseSucceed(() => Option.none()));
    const read = yield* files.readFile(file);
    const source = Option.getOrElse(read, () => "");
    return pipe(
      Option.getOrElse(nodes, (): readonly LockedNode[] => []),
      Arr.flatMap(({ id }) => Option.toArray(legacyOf(id))),
      Arr.map((legacy): Problem => ({
        file,
        line: lineOf(source)(legacy.id),
        column: FIRST,
        rule: RULE,
        message: messageOf(legacy, dependentsOf(Option.getOrElse(nodes, () => []))(legacy.id)),
      })),
    );
  },
);
