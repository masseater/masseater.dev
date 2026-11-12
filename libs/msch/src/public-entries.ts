import { Array as Arr, Option, Predicate, Record as Rec, String as Str, pipe } from "effect";

import type { PackEntrySource } from "./published.ts";

const SOURCE = /\.[cm]?tsx?$/u;
const BUILT = /\.(?:d\.)?[cm]?[jt]s$/u;
const DECLARATION = ".d.";
const SEPARATOR = "/";
const ROOT_SUBPATH = ".";
const BIN_LABEL = "bin";

interface PublicEntry {
  readonly label: string;
  readonly source: string;
}

interface EntryManifest {
  readonly name?: string | undefined;
  readonly exports?: unknown;
  readonly bin?: unknown;
}

interface EntryLookup {
  readonly manifest: EntryManifest;
  readonly join: (target: string) => string;
  readonly packEntries: readonly PackEntrySource[];
}

const targetsIn = (held: unknown): readonly string[] => {
  if (Predicate.isString(held)) {
    return [held];
  }
  if (!Predicate.isObject(held)) {
    return [];
  }
  return pipe(Rec.values(held), Arr.flatMap(targetsIn));
};

const subpathsOf = (exportsField: unknown): readonly (readonly [string, unknown])[] => {
  if (!Predicate.isObject(exportsField)) {
    return [[ROOT_SUBPATH, exportsField]];
  }
  const entries = Rec.toEntries(exportsField);
  if (
    pipe(
      entries,
      Arr.some(([key]) => Str.startsWith(ROOT_SUBPATH)(key)),
    )
  ) {
    return entries;
  }
  return [[ROOT_SUBPATH, exportsField]];
};

const binsOf = (manifest: EntryManifest): readonly (readonly [string, unknown])[] => {
  if (Predicate.isString(manifest.bin)) {
    const name = Option.getOrElse(Option.fromUndefinedOr(manifest.name), () => "");
    return [[`${BIN_LABEL} ${name}`, manifest.bin]];
  }
  if (!Predicate.isObject(manifest.bin)) {
    return [];
  }
  return pipe(
    Rec.toEntries(manifest.bin),
    Arr.map(([name, target]) => [`${BIN_LABEL} ${name}`, target] as const),
  );
};

const baseNameOf = (target: string): string =>
  pipe(
    Str.split(target, SEPARATOR),
    Arr.last,
    Option.getOrElse(() => target),
    Str.replace(BUILT, ""),
  );

const sourceOf =
  ({ join, packEntries }: EntryLookup) =>
  (target: string): Option.Option<string> => {
    if (SOURCE.test(target) && !Str.includes(DECLARATION)(target)) {
      return Option.some(join(target));
    }
    const name = baseNameOf(target);
    return pipe(
      packEntries,
      Arr.findFirst((entry) => entry.name === name),
      Option.map((entry) => entry.source),
    );
  };

const publicEntriesOf = (lookup: EntryLookup): readonly PublicEntry[] =>
  pipe(
    [...subpathsOf(lookup.manifest.exports), ...binsOf(lookup.manifest)],
    Arr.flatMap(([label, held]) =>
      pipe(
        targetsIn(held),
        Arr.map(sourceOf(lookup)),
        Arr.getSomes,
        Arr.map((source) => ({ label, source })),
      ),
    ),
    Arr.dedupeWith((left, right) => left.label === right.label && left.source === right.source),
  );

export { publicEntriesOf };
export type { PublicEntry };
