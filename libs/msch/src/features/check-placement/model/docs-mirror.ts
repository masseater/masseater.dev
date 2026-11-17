import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { readManifest } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "docs-mirror";
const DOC = /(?:^|\/)(?:README|AGENTS|ARCHITECTURE|CLAUDE|SKILL)\.md$/u;
const MIRROR_LIMIT = 3;
const READ_CONCURRENCY = 16;

interface Workspace {
  readonly directory: string;
  readonly names: readonly string[];
}

interface Mention {
  readonly directory: string;
  readonly offset: number;
}

const SPECIAL = /[$()*+.?[\\\]^{|}]/gu;
const BEFORE = String.raw`(?<![\w@/.-])`;
const AFTER = String.raw`(?![\w@.-])`;

const patternOf = (name: string): RegExp =>
  new RegExp(`${BEFORE}${Str.replaceAll(SPECIAL, String.raw`\$&`)(name)}${AFTER}`, "u");

const byOffset = Order.mapInput(Order.Number, (mention: Mention) => mention.offset);

const mentionOf =
  (source: string, directory: string) =>
  (name: string): readonly Mention[] =>
    pipe(
      Option.fromNullishOr(patternOf(name).exec(source)),
      Option.map(({ index }) => ({ directory, offset: index })),
      Option.toArray,
    );

const firstMention = (source: string, workspace: Workspace): Option.Option<Mention> => {
  const mentions = pipe(workspace.names, Arr.flatMap(mentionOf(source, workspace.directory)));
  return Arr.head(Arr.sort(mentions, byOffset));
};

const ownerOf =
  (doc: string) =>
  (workspace: Workspace): boolean =>
    Str.startsWith(`${workspace.directory}/`)(doc);

const describe = (mentions: readonly Mention[]): string =>
  pipe(
    mentions,
    Arr.map(({ directory }) => `\`${directory}\``),
    Arr.join(", "),
  );

const problemFor = (
  file: string,
  source: string,
  mentions: readonly Mention[],
): readonly Problem[] =>
  pipe(
    Arr.head(mentions),
    Option.filter(() => mentions.length >= MIRROR_LIMIT),
    Option.map(({ offset }): Problem => {
      const { line, column } = positionOf(source)(offset);
      return {
        file,
        line,
        column,
        rule: RULE,
        message: `names ${String(mentions.length)} other workspaces (${describe(mentions)}). The workspace list and each package.json already declare them, so this copy goes stale. Point at the declaration instead of listing it.`,
      };
    }),
    Option.toArray,
  );

const othersIn = (doc: string, workspaces: readonly Workspace[]): readonly Workspace[] =>
  pipe(
    workspaces,
    Arr.filter((workspace) => !ownerOf(doc)(workspace)),
  );

const problemIn =
  (workspaces: readonly Workspace[]) =>
  (doc: string, file: string, source: string): readonly Problem[] => {
    const mentions = pipe(
      othersIn(doc, workspaces),
      Arr.flatMap((workspace) => Option.toArray(firstMention(source, workspace))),
    );
    return problemFor(file, source, Arr.sort(mentions, byOffset));
  };

const workspacesOf = Effect.fn("workspacesOf")(function* workspacesOf(root: string) {
  const files = yield* RepositoryFiles;
  const directories = yield* workspaceDirectories(root);
  return yield* Effect.forEach(
    directories,
    (directory) =>
      readManifest(files.join(root, directory)).pipe(
        Effect.map((manifest): Workspace => ({
          directory,
          names: [
            directory,
            ...pipe(
              manifest,
              Option.flatMap(({ name }) => Option.fromUndefinedOr(name)),
              Option.toArray,
            ),
          ],
        })),
      ),
    { concurrency: READ_CONCURRENCY },
  );
});

/** @internal */
export const checkDocsMirror = Effect.fn("checkDocsMirror")(function* checkDocsMirror(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const workspaces = yield* workspacesOf(root);
  const listed = yield* files.listedFiles(root);
  const found = yield* Effect.forEach(
    pipe(
      listed,
      Arr.filter((name) => DOC.test(name)),
    ),
    (doc) => {
      const file = files.join(root, doc);
      return files.readFile(file).pipe(
        Effect.map((source) =>
          Option.match(source, {
            onNone: () => [],
            onSome: (text) => problemIn(workspaces)(doc, file, text),
          }),
        ),
      );
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
