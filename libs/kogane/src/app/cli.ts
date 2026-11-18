import { Array as Arr, Console, Effect, Option, Path, Stdio, Stream, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import { monorepoRoots, workspacesIn } from "#/entities/workspace/index.ts";
import type { Workspace } from "#/entities/workspace/index.ts";
import { ask } from "#/features/ask-suggestions/index.ts";
import { serve } from "#/features/serve-suggestions/index.ts";
import { SERVER_FLAG, dataDirectory } from "#/shared/config/index.ts";

const ROOT_CONCURRENCY = 4;

const readStdin = Effect.service(Stdio.Stdio).pipe(
  Effect.flatMap((stdio) => stdio.stdin.pipe(Stream.decodeText, Stream.mkString)),
);

const hookCommand = Command.make("hook", {}, () =>
  Effect.gen(function* hook() {
    const directory = yield* dataDirectory;
    const stdin = yield* readStdin;
    const output = yield* ask(directory, stdin);
    yield* Option.match(output, { onNone: () => Effect.void, onSome: Console.log });
  }).pipe(Effect.ignore),
).pipe(Command.withDescription("Run as the Claude Code UserPromptSubmit hook"));

const serveCommand = Command.make("serve", { data: Flag.String(SERVER_FLAG) }, ({ data }) =>
  serve(data),
).pipe(Command.withDescription("Keep EmbeddingGemma 2 loaded and answer the hook"));

const lineOf = ({ name, directory, description }: Workspace): string =>
  `- \`${directory}\` (${name}): ${description}`;

const sectionOf = Effect.fn("sectionOf")(function* sectionOf(root: string) {
  const path = yield* Path.Path;
  const workspaces = yield* workspacesIn(root);
  const lines = pipe(workspaces, Arr.map(lineOf));
  return Arr.join([`## ${path.basename(root)}\n`, ...lines], "\n");
});

const indexCommand = Command.make(
  "index",
  { directory: Flag.String("directory").pipe(Flag.withDefault(".")) },
  ({ directory }) =>
    Effect.gen(function* index() {
      const path = yield* Path.Path;
      const roots = yield* monorepoRoots(path.resolve(directory));
      const sections = yield* Effect.forEach(roots, sectionOf, {
        concurrency: ROOT_CONCURRENCY,
      });
      yield* Console.log(Arr.join(sections, "\n\n"));
    }),
).pipe(Command.withDescription("Print every workspace with its description as Markdown"));

/** @internal */
export const kogane = Command.make("kogane").pipe(
  Command.withDescription("Suggest existing monorepo workspaces to Claude Code"),
  Command.withSubcommands([hookCommand, serveCommand, indexCommand]),
);
