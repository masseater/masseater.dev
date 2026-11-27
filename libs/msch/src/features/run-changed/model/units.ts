import { Array as Arr, Effect, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { installedPackages, workspaceClosure } from "#/entities/project/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const SEPARATOR = "/";
const FIELD_SEPARATOR = "\0";
const LINE_SEPARATOR = "\n";
const EMPTY = "";
const READ_CONCURRENCY = 16;
const SOURCE_FILE = /\.[cm]?[jt]sx?$/u;
const SHARED_CONFIG = /^(?:[^/]+\.config\.[cm]?[jt]s|tsconfig(?:\.[^/]+)?\.json|\.gitignore)$/u;

export const ROOT_UNIT = ".";

export interface Unit {
  readonly name: string;
  readonly paths: readonly string[];
  readonly key: string;
  readonly sources: number;
}

interface Member {
  readonly name: string;
  readonly sources: number;
  readonly digest: string;
  readonly installed: readonly string[];
  readonly closure: readonly string[];
}

type Entry = readonly [file: string, digest: string];

interface Listing {
  readonly root: string;
  readonly names: readonly string[];
  readonly owned: Readonly<Record<string, readonly Entry[]>>;
}

const memberOf =
  (names: readonly string[]) =>
  (file: string): string =>
    pipe(
      names,
      Arr.findFirst((name) => Str.startsWith(`${name}${SEPARATOR}`)(file)),
      Option.getOrElse(() => ROOT_UNIT),
    );

const entryOf = ([file, digest]: Entry): string => `${file}${FIELD_SEPARATOR}${digest}`;

const digested = Effect.fn("digested")(function* digested(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const digest = yield* files.hashFile(files.join(root, file));
  return [file, Option.getOrElse(digest, () => EMPTY)] as const;
});

const hashed = (lines: readonly string[]): Effect.Effect<string, never, RepositoryFiles> =>
  Effect.gen(function* hashLines() {
    const files = yield* RepositoryFiles;
    return yield* files.hash(Arr.join(lines, LINE_SEPARATOR));
  });

const ownedBy = (listing: Listing, name: string): readonly Entry[] =>
  Option.getOrElse(Rec.get(listing.owned, name), (): readonly Entry[] => []);

const entriesIn = (listing: Listing, name: string): readonly string[] =>
  pipe(ownedBy(listing, name), Arr.map(entryOf));

const sourcesIn = (listing: Listing, name: string): number =>
  pipe(
    ownedBy(listing, name),
    Arr.filter(([file]) => SOURCE_FILE.test(file)),
  ).length;

const closureOf = Effect.fn("closureOf")(function* closureOf(root: string, name: string) {
  const files = yield* RepositoryFiles;
  const directories = yield* workspaceClosure(files.join(root, name));
  const names = pipe(
    directories,
    Arr.map((directory) => files.relative(root, directory)),
    Arr.filter(Str.isNonEmpty),
  );
  return Arr.sort(names, Order.String);
});

const memberIn =
  (listing: Listing) =>
  (name: string): Effect.Effect<Member, never, RepositoryFiles> =>
    Effect.gen(function* readMember() {
      const files = yield* RepositoryFiles;
      return {
        name,
        sources: sourcesIn(listing, name),
        digest: yield* hashed(entriesIn(listing, name)),
        installed: yield* installedPackages(listing.root, files.join(listing.root, name)),
        closure: yield* closureOf(listing.root, name),
      };
    });

const reached =
  (members: readonly Member[]) =>
  (closure: readonly string[]): readonly Member[] =>
    pipe(
      members,
      Arr.filter(({ name }) => Arr.contains(closure, name)),
    );

const linesOf = (found: readonly Member[]): readonly string[] => {
  const installed = pipe(
    found,
    Arr.flatMap((member) => member.installed),
    Arr.dedupe,
  );
  const digests = pipe(
    found,
    Arr.map(({ name, digest }) => entryOf([name, digest])),
  );
  return [...Arr.sort(installed, Order.String), ...digests];
};

const sharedKey = Effect.fn("sharedKey")(function* sharedKey(
  listing: Listing,
  members: readonly Member[],
) {
  const installed = yield* installedPackages(listing.root, listing.root);
  const closure = yield* closureOf(listing.root, EMPTY);
  const config = pipe(
    ownedBy(listing, ROOT_UNIT),
    Arr.filter(([file]) => SHARED_CONFIG.test(file)),
    Arr.map(entryOf),
  );
  return yield* hashed([...installed, ...config, ...linesOf(reached(members)(closure))]);
});

const rootPaths = (listing: Listing): readonly string[] =>
  pipe(
    ownedBy(listing, ROOT_UNIT),
    Arr.map(([file]) => file),
    Arr.map((file) => {
      const [top] = Str.split(file, SEPARATOR);
      const holdsMembers = pipe(
        listing.names,
        Arr.some((name) => Str.startsWith(`${top}${SEPARATOR}`)(name)),
      );
      if (holdsMembers) {
        return file;
      }
      return top;
    }),
    Arr.dedupe,
  );

const rootUnit = Effect.fn("rootUnit")(function* rootUnit(listing: Listing, shared: string) {
  const key = yield* hashed([shared, ROOT_UNIT, ...entriesIn(listing, ROOT_UNIT)]);
  return {
    name: ROOT_UNIT,
    paths: rootPaths(listing),
    key,
    sources: sourcesIn(listing, ROOT_UNIT),
  } satisfies Unit;
});

const memberUnit =
  (shared: string, members: readonly Member[]) =>
  (member: Member): Effect.Effect<Unit, never, RepositoryFiles> =>
    hashed([shared, member.name, ...linesOf(reached(members)(member.closure))]).pipe(
      Effect.map((key) => ({
        name: member.name,
        paths: [member.name],
        key,
        sources: member.sources,
      })),
    );

export const unitsOf = Effect.fn("unitsOf")(function* unitsOf(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const names = yield* workspaceDirectories(root);
  const entries = yield* Effect.forEach(listed, (file) => digested(root, file), {
    concurrency: READ_CONCURRENCY,
  });
  const owned = Arr.groupBy(entries, ([file]) => memberOf(names)(file));
  const listing: Listing = { root, names, owned };
  const members = yield* Effect.forEach(names, memberIn(listing), {
    concurrency: READ_CONCURRENCY,
  });
  const shared = yield* sharedKey(listing, members);
  const units = yield* Effect.forEach(members, memberUnit(shared, members), { concurrency: 1 });
  return [yield* rootUnit(listing, shared), ...units];
});
