import { Array as Arr, Option, pipe } from "effect";

import type { Kind } from "#/entities/kind/index.ts";
import type { Layout, Located } from "#/entities/layout/index.ts";
import { atFile } from "#/shared/lib/finding.ts";
import type { Finding } from "#/shared/lib/finding.ts";
import { matcher } from "#/shared/lib/glob.ts";
import type { Matcher } from "#/shared/lib/glob.ts";
import { inside, join } from "#/shared/lib/path.ts";

export const PLACEMENT = "placement";
export const LOOSE_FILE = "loose-file";
export const LAYER_NAME = "layer-name";

interface Compiled {
  readonly files: Matcher;
  readonly allow: Matcher;
  readonly message: string;
}

const compile = (kind: Kind): readonly Compiled[] =>
  pipe(
    kind.placements ?? [],
    Arr.map((placement) => ({
      files: matcher(placement.files),
      allow: matcher(placement.allow),
      message: placement.message ?? `is not a place a ${kind.name} allows for this file.`,
    })),
  );

const layersDir = (kind: Kind): string =>
  pipe(
    Option.fromNullishOr(kind.layers),
    Option.map(({ dir }) => dir),
    Option.getOrElse(() => ""),
  );

const layerMessage = (kind: Kind): string =>
  pipe(
    Option.fromNullishOr(kind.layers),
    Option.map(({ order }) => Arr.join(order, ", ")),
    Option.getOrElse(() => ""),
    (names) => `is not a layer. Use one of ${names}.`,
  );

const looseMessage = (kind: Kind): string =>
  `sits directly in ${layersDir(kind)}/. Put it in a layer.`;

const placementFindings =
  (compiled: (kind: Kind) => readonly Compiled[], path: string) =>
  (within: string, kind: Kind): readonly Finding[] =>
    pipe(
      compiled(kind),
      Arr.filter((placement) => placement.files(within) && !placement.allow(within)),
      Arr.map(({ message }) => atFile({ path, rule: PLACEMENT, message })),
    );

const positionFindings = (path: string, { instance, position }: Located): readonly Finding[] => {
  const { kind } = instance;
  if (position.type === "loose") {
    return [atFile({ path, rule: LOOSE_FILE, message: looseMessage(kind) })];
  }
  if (position.type !== "unknownLayer") {
    return [];
  }
  const base = join(instance.dir)(join(layersDir(kind))(position.layer));
  const reported = Option.match(inside(base)(path), { onNone: () => path, onSome: () => base });
  return [atFile({ path: reported, rule: LAYER_NAME, message: layerMessage(kind) })];
};

const findingsAt =
  (layout: Layout, compiled: (kind: Kind) => readonly Compiled[]) =>
  (path: string): readonly Finding[] =>
    pipe(
      layout.located(path),
      Arr.flatMap((located) => {
        const own = (within: string): readonly Finding[] =>
          Arr.appendAll(
            placementFindings(compiled, path)(within, located.instance.kind),
            positionFindings(path, located),
          );
        return Option.match(layout.inner(located.instance)(path), {
          onNone: (): readonly Finding[] => [],
          onSome: own,
        });
      }),
    );

const keyOf = ({ path, rule, message }: Finding): string => `${path}\0${rule}\0${message}`;

export const checkPlacement = (layout: Layout): readonly Finding[] => {
  const compiled = new Map(
    pipe(
      layout.instances,
      Arr.map(({ kind }) => [kind, compile(kind)] as const),
    ),
  );
  const lookup = (kind: Kind): readonly Compiled[] => compiled.get(kind) ?? [];
  const keyed = pipe(
    layout.files,
    Arr.flatMap(findingsAt(layout, lookup)),
    Arr.map((item) => [keyOf(item), item] as const),
  );
  return [...new Map(keyed).values()];
};
