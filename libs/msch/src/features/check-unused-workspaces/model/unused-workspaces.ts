import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import {
  cratesIn,
  deployEntries,
  nestedValues,
  owningWorkspace,
  RUN_TASKS,
  stringsIn,
  workspaceConfigOf,
  workspaceDirectories,
  workspaceLinks,
} from "#/entities/workspace/index.ts";
import type { WorkspaceLink } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "unused-workspace";
const CARGO_FILE = "Cargo.toml";
const ROOT_DIRECTORY = "";
const TASK_SEPARATOR = "#";
const SEPARATOR = "/";
const START = 0;
const FIRST = 1;
const READ_CONCURRENCY = 8;
const LIBRARY_KINDS: readonly string[] = ["lib", "rlib", "proc-macro"];
const PROGRAM_KINDS: readonly string[] = ["bin", "cdylib", "staticlib", "dylib"];

const Manifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  private: Schema.optional(Schema.Boolean),
  exports: Schema.optional(Schema.Unknown),
  main: Schema.optional(Schema.Unknown),
  bin: Schema.optional(Schema.Unknown),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

interface Member {
  readonly directory: string;
  readonly name: Option.Option<string>;
  readonly library: boolean;
  readonly entry: boolean;
}

const isDependedOn =
  (links: readonly WorkspaceLink[]) =>
  ({ directory }: Member): boolean =>
    pipe(
      links,
      Arr.some(({ from, to }) => to === directory && from !== directory),
    );

const isKind =
  (kinds: readonly string[]) =>
  (kind: string): boolean =>
    Arr.contains(kinds, kind);

const isLibraryCrate = ({ kinds }: { readonly kinds: readonly string[] }): boolean =>
  pipe(kinds, Arr.some(isKind(LIBRARY_KINDS))) && !pipe(kinds, Arr.some(isKind(PROGRAM_KINDS)));

interface CargoFacts {
  readonly libraries: readonly string[];
  readonly links: readonly WorkspaceLink[];
}

const NO_CARGO: CargoFacts = { libraries: [], links: [] };

const cargoFacts = Effect.fn("cargoFacts")(function* cargoFacts(
  root: string,
  directories: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const cargo = yield* files.exists(files.join(root, CARGO_FILE));
  if (!cargo) {
    return NO_CARGO;
  }
  const crates = yield* cratesIn(root);
  const ownerOf = (path: string): Option.Option<string> =>
    owningWorkspace(directories)(files.relative(root, path));
  const linksOf = (manifest: string, paths: readonly string[]): readonly WorkspaceLink[] => {
    const owner = ownerOf(files.dirname(manifest));
    const linkTo = (path: string): Option.Option<WorkspaceLink> =>
      Option.zipWith(owner, ownerOf(path), (from, to) => ({ from, to }));
    return pipe(
      paths,
      Arr.flatMap((path) => Option.toArray(linkTo(path))),
    );
  };
  return {
    libraries: pipe(
      crates,
      Arr.filter(isLibraryCrate),
      Arr.flatMap(({ manifest }) => Option.toArray(ownerOf(files.dirname(manifest)))),
    ),
    links: pipe(
      crates,
      Arr.flatMap(({ manifest, pathDependencies }) => linksOf(manifest, pathDependencies)),
    ),
  };
});

const workspaceOfTask = (text: string): Option.Option<string> =>
  pipe(
    Str.indexOf(TASK_SEPARATOR)(text),
    Option.map((at) => Str.slice(START, at)(text)),
    Option.filter(Str.isNonEmpty),
  );

const taskTargets = Effect.fn("taskTargets")(function* taskTargets(
  root: string,
  directory: string,
) {
  const config = yield* workspaceConfigOf(root, directory);
  return pipe(
    config,
    Option.map(({ program }) =>
      pipe(
        nestedValues(RUN_TASKS)(program),
        Arr.flatMap(stringsIn),
        Arr.flatMap(({ text }) => Option.toArray(workspaceOfTask(text))),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );
});

const isWithin =
  (directory: string) =>
  (file: string): boolean =>
    Str.startsWith(`${directory}${SEPARATOR}`)(file);

interface MemberRequest {
  readonly root: string;
  readonly directory: string;
  readonly crateLibraries: readonly string[];
  readonly deployed: readonly string[];
}

const memberOf = Effect.fn("memberOf")(function* memberOf(request: MemberRequest) {
  const { root, directory, crateLibraries, deployed } = request;
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, directory, MANIFEST_FILE));
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.map((manifest): Member => ({
      directory,
      name: Option.fromUndefinedOr(manifest.name),
      library:
        Predicate.isNotUndefined(manifest.exports) ||
        Predicate.isNotUndefined(manifest.main) ||
        Arr.contains(crateLibraries, directory),
      entry:
        manifest.private !== true ||
        Predicate.isNotUndefined(manifest.bin) ||
        pipe(deployed, Arr.some(isWithin(directory))),
    })),
  );
});

const linksTo =
  (members: readonly Member[], from: string) =>
  (name: string): readonly WorkspaceLink[] =>
    pipe(
      members,
      Arr.filter((member) => Option.contains(member.name, name)),
      Arr.map(({ directory }): WorkspaceLink => ({ from, to: directory })),
    );

const taskLinks = Effect.fn("taskLinks")(function* taskLinks(
  root: string,
  members: readonly Member[],
) {
  const sources = [
    ROOT_DIRECTORY,
    ...pipe(
      members,
      Arr.map(({ directory }) => directory),
    ),
  ];
  const found = yield* Effect.forEach(
    sources,
    (from) => {
      const toLinks = Arr.flatMap(linksTo(members, from));
      return taskTargets(root, from).pipe(Effect.map(toLinks));
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});

/** @internal */
export const checkUnusedWorkspaces = Effect.fn("checkUnusedWorkspaces")(
  function* checkUnusedWorkspaces(root: string) {
    const files = yield* RepositoryFiles;
    const directories = yield* workspaceDirectories(root);
    const [cargo, deployed, lockedLinks] = yield* Effect.all(
      [cargoFacts(root, directories), deployEntries(root), workspaceLinks(root)],
      { concurrency: "unbounded" },
    );
    const found = yield* Effect.forEach(
      directories,
      (directory) => memberOf({ root, directory, crateLibraries: cargo.libraries, deployed }),
      { concurrency: READ_CONCURRENCY },
    );
    const members = Arr.getSomes(found);
    const tasks = yield* taskLinks(root, members);
    const links = [...lockedLinks, ...cargo.links, ...tasks];
    return pipe(
      members,
      Arr.filter(({ library, entry }) => library && !entry),
      Arr.filter((member) => !isDependedOn(links)(member)),
      Arr.map(({ directory }): Problem => ({
        file: files.join(root, directory, MANIFEST_FILE),
        line: FIRST,
        column: FIRST,
        rule: RULE,
        message: `${directory} is a private library, and no other workspace depends on it through package.json, a Cargo path dependency or a task. Delete it, or depend on it from the code that uses it.`,
      })),
    );
  },
);
