import { fileURLToPath } from "node:url";

import {
  Array as Arr,
  Effect,
  Option,
  Order,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { MANIFEST_FILE, readManifest } from "#/entities/package/index.ts";
import type { Manifest } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { isScannedText, listedFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

export interface AppliedPackage {
  readonly name: string;
  readonly bins: readonly string[];
}

const MSCH = "@r_masseater/msch";
const SCOPE = "@r_masseater/";
const RULE: RuleName = "applied-package";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const NOT_FOUND = -1;
const SEPARATOR = "/";

const BY_LENGTH = Order.mapInput(Order.Number, (text: string) => text.length);

const BinMap = Schema.Record(Schema.String, Schema.String);
const BinField = Schema.Struct({
  bin: Schema.optional(Schema.Union([Schema.String, BinMap])),
});
const decodeBinField = Schema.decodeUnknownOption(Schema.fromJsonString(BinField));

const escaped = (text: string): string =>
  Str.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)(text);

const declaredNames = (manifest: Manifest): readonly string[] =>
  pipe(
    [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies],
    Arr.flatMap((field) => Rec.keys(field ?? {})),
  );

const binsIn = (name: string, text: string): readonly string[] =>
  pipe(
    decodeBinField(text),
    Option.flatMap(({ bin }) => Option.fromUndefinedOr(bin)),
    Option.match({
      onNone: (): readonly string[] => [],
      onSome: (bin) => {
        if (Predicate.isString(bin)) {
          return [pipe(name, Str.split(SEPARATOR), Arr.lastNonEmpty)];
        }
        return Rec.keys(bin);
      },
    }),
  );

const manifestOf = Option.liftThrowable((name: string): string =>
  fileURLToPath(import.meta.resolve(`${name}/${MANIFEST_FILE}`)),
);

const installedPackage = Effect.fn("installedPackage")(function* installedPackage(name: string) {
  const files = yield* RepositoryFiles;
  const text = yield* pipe(
    manifestOf(name),
    Option.match({
      onNone: () => Effect.succeed(Option.none<string>()),
      onSome: (file) => files.readFile(file),
    }),
  );
  return {
    name,
    bins: pipe(
      text,
      Option.map((source) => binsIn(name, source)),
      Option.getOrElse((): readonly string[] => []),
    ),
  };
});

const appliedByMsch = Effect.fn("appliedByMsch")(function* appliedByMsch() {
  const files = yield* RepositoryFiles;
  const manifest = yield* pipe(
    manifestOf(MSCH),
    Option.match({
      onNone: () => Effect.succeed(Option.none<Manifest>()),
      onSome: (file) => readManifest(files.dirname(file)),
    }),
  );
  const names = pipe(
    manifest,
    Option.flatMap(({ dependencies }) => Option.fromUndefinedOr(dependencies)),
    Option.map(Rec.keys),
    Option.getOrElse((): readonly string[] => []),
    Arr.filter(Str.startsWith(SCOPE)),
  );
  return yield* pipe(names, Effect.forEach(installedPackage));
});

const problemAt =
  (file: string, source: string) =>
  (index: number, name: string): Problem => ({
    file,
    ...positionOf(source)(index),
    rule: RULE,
    message: `msch applies ${name}. Remove this use and let msch apply it.`,
  });

const specifierPattern = ({ name }: AppliedPackage): RegExp =>
  new RegExp(`["'\`]${escaped(name)}(?=["'\`/])`, "gu");

const binPattern = (bin: string): RegExp =>
  new RegExp(`(?<![\\w./@:-])${escaped(bin)}(?=[ \\t"'\`]|$)`, "gmu");

const usesIn =
  (applied: readonly AppliedPackage[]) =>
  ({ file }: Listed, source: string): readonly Problem[] =>
    pipe(
      applied,
      Arr.flatMap((entry) =>
        pipe(
          [specifierPattern(entry), ...pipe(entry.bins, Arr.map(binPattern))],
          Arr.flatMap((pattern) => Arr.fromIterable(Str.matchAll(pattern)(source))),
          Arr.map((found) => problemAt(file, source)(found.index ?? NOT_FOUND, entry.name)),
        ),
      ),
    );

const ownerOf =
  (directories: readonly string[]) =>
  (name: string): string =>
    pipe(
      directories,
      Arr.filter(
        (directory) => directory === "" || Str.startsWith(`${directory}${SEPARATOR}`)(name),
      ),
      Arr.match({ onEmpty: () => "", onNonEmpty: Arr.max(BY_LENGTH) }),
    );

const isScannedSource = (entry: Listed): boolean =>
  isScannedText(entry) && !Str.endsWith(MANIFEST_FILE)(entry.name) && entry.name !== WORKSPACE_FILE;

const consumersIn = Effect.fn("consumersIn")(function* consumersIn(
  root: string,
  directories: readonly string[],
) {
  const files = yield* RepositoryFiles;
  return yield* pipe(
    directories,
    Effect.filter((directory) =>
      readManifest(files.join(root, directory)).pipe(
        Effect.map(
          Option.exists(
            (manifest) => manifest.name !== MSCH && Arr.contains(declaredNames(manifest), MSCH),
          ),
        ),
      ),
    ),
  );
});

const manifestUses = Effect.fn("manifestUses")(function* manifestUses(
  root: string,
  appliedNames: readonly string[],
  directory: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, directory, MANIFEST_FILE);
  const text = yield* files.readFile(file);
  const manifest = yield* readManifest(files.join(root, directory));
  return pipe(
    Option.all({ source: text, declared: manifest }),
    Option.match({
      onNone: (): readonly Problem[] => [],
      onSome: ({ source, declared }) =>
        pipe(
          declaredNames(declared),
          Arr.filter((name) => Arr.contains(appliedNames, name)),
          Arr.flatMap((name) =>
            pipe(
              Str.indexOf(`"${name}"`)(source),
              Option.map((index) => problemAt(file, source)(index, name)),
              Option.toArray,
            ),
          ),
        ),
    }),
  );
});

interface Scope {
  readonly root: string;
  readonly applied: readonly AppliedPackage[];
  readonly directories: readonly string[];
  readonly consumers: readonly string[];
}

const sourceUses = Effect.fn("sourceUses")(function* sourceUses({
  root,
  applied,
  directories,
  consumers,
}: Scope) {
  const owner = ownerOf(directories);
  const listed = yield* listedFiles(root);
  const sources = pipe(
    listed,
    Arr.filter((entry) => isScannedSource(entry) && Arr.contains(consumers, owner(entry.name))),
  );
  return yield* scanText(sources, usesIn(applied));
});

/** @internal */
export const appliedPackageProblems = Effect.fn("appliedPackageProblems")(
  function* appliedPackageProblems(root: string, applied: readonly AppliedPackage[]) {
    if (!Arr.isReadonlyArrayNonEmpty(applied)) {
      return [];
    }
    const workspaces = yield* workspaceDirectories(root);
    const directories = ["", ...workspaces];
    const consumers = yield* consumersIn(root, directories);
    const appliedNames = pipe(
      applied,
      Arr.map(({ name }) => name),
    );
    const manifestProblems = yield* pipe(
      consumers,
      Effect.forEach((directory) => manifestUses(root, appliedNames, directory)),
    );
    const sourceProblems = yield* sourceUses({ root, applied, directories, consumers });
    return [...Arr.flatten(manifestProblems), ...sourceProblems];
  },
);

/** @internal */
export const checkAppliedPackages = Effect.fn("checkAppliedPackages")(
  function* checkAppliedPackages(root: string) {
    const applied = yield* appliedByMsch();
    return yield* appliedPackageProblems(root, applied);
  },
);
