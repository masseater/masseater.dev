import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

export const LAYERS: readonly string[] = [
  "app",
  "pages",
  "widgets",
  "features",
  "entities",
  "shared",
];
export const SEPARATOR = "/";
export const SOURCE_DIRECTORY = "src";
export const RUST_FILE = /\.rs$/u;
export const BINARY = /^src\/bin\/[^/]+\.rs$/u;
export const SLICE_DEPTH = 2;
export const NEXT = 1;

const MANIFEST = /(?:^|\/)Cargo\.toml$/u;
const MODULE_INDEX = "mod";
const CRATE_ROOTS: readonly string[] = ["src/lib.rs", "src/main.rs"];
const OUTSIDE_ALLOWED = /^(?:build\.rs|benches\/.+)$/u;
const SEPARATE_TEST = /^tests\/.+$/u;
const SLICED_LAYERS: readonly string[] = ["pages", "widgets", "features", "entities", "shared"];
const LAYER_DEPTH = 1;
const SOURCE_PREFIX = `${SOURCE_DIRECTORY}${SEPARATOR}`;
const ROOT_CRATE = "";

export interface RustSource {
  readonly crate: string;
  readonly inner: string;
  readonly file: string;
}

export type Kind = "root" | "layer" | "module" | "test" | "skipped" | "misplaced";

const byLength = Order.mapInput(Order.Number, (directory: string) => directory.length);

export const crateDirectories = (listed: readonly string[]): readonly string[] =>
  pipe(
    listed,
    Arr.filter((name) => MANIFEST.test(name)),
    Arr.map((name) => Str.replace(MANIFEST, "")(name)),
  );

const ownedBy = (crate: string, name: string): Omit<RustSource, "file"> => {
  if (crate === ROOT_CRATE) {
    return { crate, inner: name };
  }
  return { crate, inner: Str.slice(crate.length + SEPARATOR.length)(name) };
};

export const crateOf =
  (crates: readonly string[]) =>
  (name: string): Option.Option<Omit<RustSource, "file">> =>
    pipe(
      crates,
      Arr.filter((crate) => crate === ROOT_CRATE || Str.startsWith(`${crate}${SEPARATOR}`)(name)),
      Arr.match({
        onEmpty: () => Option.none<string>(),
        onNonEmpty: (owners) => Option.some(Arr.max(owners, byLength)),
      }),
      Option.map((crate) => ownedBy(crate, name)),
    );

export const modulePathOf = (inner: string): readonly string[] => {
  const parts = Str.split(
    Str.replace(RUST_FILE, "")(Str.slice(SOURCE_PREFIX.length)(inner)),
    SEPARATOR,
  );
  if (Option.contains(Arr.last(parts), MODULE_INDEX)) {
    return Arr.dropRight(parts, NEXT);
  }
  return parts;
};

const sourceKindOf = (inner: string): Kind => {
  const path = modulePathOf(inner);
  if (!Option.exists(Arr.head(path), (layer) => Arr.contains(LAYERS, layer))) {
    return "misplaced";
  }
  if (path.length === LAYER_DEPTH) {
    return "layer";
  }
  return "module";
};

export const kindOf = (inner: string): Kind => {
  if (Arr.contains(CRATE_ROOTS, inner) || BINARY.test(inner)) {
    return "root";
  }
  if (SEPARATE_TEST.test(inner)) {
    return "test";
  }
  if (OUTSIDE_ALLOWED.test(inner)) {
    return "skipped";
  }
  if (!Str.startsWith(SOURCE_PREFIX)(inner)) {
    return "misplaced";
  }
  return sourceKindOf(inner);
};

export const isSliceIndex = (modulePath: readonly string[]): boolean =>
  modulePath.length === SLICE_DEPTH &&
  Option.exists(Arr.head(modulePath), (layer) => Arr.contains(SLICED_LAYERS, layer));
