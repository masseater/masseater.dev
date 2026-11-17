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
const SHARED_SLICES: readonly string[] = ["app", "shared"];
const SLICED_LAYERS: readonly string[] = ["pages", "widgets", "features", "entities", "shared"];
const LAYER_DEPTH = 1;
const SOURCE_PREFIX = `${SOURCE_DIRECTORY}${SEPARATOR}`;
const ROOT_CRATE = "";
const NO_RANK = -1;
const LAYER_INDEX = 0;
const SLICE_INDEX = 1;

const upwardMessage = (target: string, source: string): string =>
  `uses the ${target} layer from the ${source} layer. A layer may only use the layers below it (${Arr.join(LAYERS, ", ")}).`;

const crossMessage = (layer: string, target: string, source: string): string =>
  `uses the ${layer} slice ${target} from the slice ${source}. Slices of one layer must not use each other; move what they share down a layer.`;

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

export const isInsideSource = (inner: string): boolean => Str.startsWith(SOURCE_PREFIX)(inner);

export interface PathFrom {
  readonly segments: readonly string[];
  readonly current: readonly string[];
}

export const resolvedFrom = ({ segments, current }: PathFrom): Option.Option<readonly string[]> => {
  const first = Arr.head(segments);
  const rest = Arr.drop(segments, NEXT);
  if (Option.contains(first, "crate")) {
    return Option.some(rest);
  }
  if (Option.contains(first, "self")) {
    return resolvedFrom({ segments: rest, current });
  }
  if (Option.contains(first, "super")) {
    return pipe(
      Option.liftPredicate(current, Arr.isReadonlyArrayNonEmpty),
      Option.flatMap((parent) =>
        resolvedFrom({ segments: rest, current: Arr.dropRight(parent, NEXT) }),
      ),
    );
  }
  return Option.some([...current, ...segments]);
};

const rankOf = (layer: string): number =>
  pipe(
    Arr.findFirstIndex(LAYERS, (name) => name === layer),
    Option.getOrElse(() => NO_RANK),
  );

const partOf = (path: readonly string[], index: number): string =>
  Option.getOrElse(Arr.get(path, index), () => "");

export interface Import {
  readonly source: readonly string[];
  readonly target: readonly string[];
}

export const importMessage = ({ source, target }: Import): Option.Option<string> => {
  const [sourceLayer, sourceSlice] = [partOf(source, LAYER_INDEX), partOf(source, SLICE_INDEX)];
  const [targetLayer, targetSlice] = [partOf(target, LAYER_INDEX), partOf(target, SLICE_INDEX)];
  if (!Arr.contains(LAYERS, targetLayer) || target.length < SLICE_DEPTH) {
    return Option.none();
  }
  if (rankOf(targetLayer) < rankOf(sourceLayer)) {
    return Option.some(upwardMessage(targetLayer, sourceLayer));
  }
  if (
    targetLayer === sourceLayer &&
    targetSlice !== sourceSlice &&
    !Arr.contains(SHARED_SLICES, targetLayer)
  ) {
    return Option.some(crossMessage(targetLayer, targetSlice, sourceSlice));
  }
  return Option.none();
};

export const isSliceIndex = (modulePath: readonly string[]): boolean =>
  modulePath.length === SLICE_DEPTH &&
  Option.exists(Arr.head(modulePath), (layer) => Arr.contains(SLICED_LAYERS, layer));
