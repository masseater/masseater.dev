import { Effect, FileSystem, Path, String as Str } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { CorpusName } from "#/entities/bench/index.ts";

export const NODE_COMMIT = "dd425b79bfd39e2f6f0d17cbc68aeeea8e6d9e00";

const NODE_REMOTE = "https://github.com/nodejs/node.git";

const NODE_DEPTH = 300;

const NODE_RANGE = 200;

const OWN_RANGE = 20;

export type Corpus = Readonly<{ name: CorpusName; root: string; base: string; commit: string }>;

const git = Effect.fn("corpus.git")(function* git(cwd: string, args: readonly string[]) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const output = yield* spawner.string(ChildProcess.make("git", [...args], { cwd }));
  return Str.trim(output);
});

const fresh = Effect.fn("corpus.fresh")(function* fresh(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return !(yield* fileSystem.exists(directory));
});

const nodeCorpus = Effect.fn("corpus.node")(function* nodeCorpus(cache: string) {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const root = path.join(cache, "nodejs-node");
  if (yield* fresh(root)) {
    yield* fileSystem.makeDirectory(root, { recursive: true });
    yield* git(root, ["init", "--quiet"]);
    yield* git(root, ["fetch", "--quiet", `--depth=${NODE_DEPTH}`, NODE_REMOTE, NODE_COMMIT]);
    yield* git(root, ["checkout", "--quiet", "--detach", NODE_COMMIT]);
  }
  const base = yield* git(root, ["rev-parse", `HEAD~${NODE_RANGE}`]);
  return { name: "nodejs/node", root, base, commit: NODE_COMMIT } satisfies Corpus;
});

const ownCorpus = Effect.fn("corpus.own")(function* ownCorpus(repository: string, cache: string) {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const root = path.join(cache, "masseater.dev");
  const commit = yield* git(repository, ["rev-parse", "HEAD"]);
  if (yield* fresh(root)) {
    yield* git(repository, ["worktree", "add", "--detach", "--force", root, commit]);
  }
  yield* git(root, ["checkout", "--quiet", "--detach", "--force", commit]);
  yield* fileSystem.remove(path.join(root, "vite.config.ts"), { force: true });
  const base = yield* git(root, ["rev-parse", `HEAD~${OWN_RANGE}`]);
  return { name: "masseater.dev", root, base, commit } satisfies Corpus;
});

/** @internal */
export const prepareCorpora = Effect.fn("corpus.prepare")(function* prepareCorpora(
  repository: string,
  cache: string,
) {
  const own = yield* ownCorpus(repository, cache);
  const node = yield* nodeCorpus(cache);
  const base = yield* git(repository, ["rev-parse", `HEAD~${OWN_RANGE}`]);
  return { own, node, repository: { ...own, root: repository, base } };
});
