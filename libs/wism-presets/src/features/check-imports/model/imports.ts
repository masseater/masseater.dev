import type { GraphEdge } from "@r_masseater/wism";
import { Array as Arr, Equal, Option, String as Str, pipe } from "effect";

import { isLayer, isParted, isSliced } from "#/entities/kind/index.ts";
import type { Layers } from "#/entities/kind/index.ts";
import { asLayer } from "#/entities/layout/index.ts";
import type { Instance, LayerPosition, Layout, Located } from "#/entities/layout/index.ts";
import type { Finding } from "#/shared/lib/finding.ts";
import { baseName, inside } from "#/shared/lib/path.ts";

export const LAYER_IMPORT = "layer-import";
export const CROSS_SLICE = "cross-slice";
export const PUBLIC_API = "public-api";
export const WILDCARD_EXPORT = "wildcard-export";
export const LINK_TARGET = "link-target";

const MARKDOWN = /\.md$/iu;
const SIBLING = ".";
const ONE = 1;

interface Hop {
  readonly layers: Layers;
  readonly edge: GraphEdge;
  readonly source: LayerPosition;
  readonly target: LayerPosition;
}

interface Reach {
  readonly instance: Instance;
  readonly from: LayerPosition;
  readonly target: string;
}

const finding = (edge: GraphEdge, rule: string, message: string): Finding => ({
  path: edge.from,
  line: edge.line,
  column: edge.column,
  rule,
  message,
});

const startsCross = (prefix: string, inner: string): boolean => {
  const rest = Str.slice(prefix.length)(inner);
  return Str.startsWith(prefix)(inner) && (Str.isEmpty(rest) || Str.startsWith(SIBLING)(rest));
};

const crossing = ({ layers, source, target }: Omit<Hop, "edge">): boolean =>
  pipe(
    Option.all({
      cross: Option.fromNullishOr(layers.cross),
      slice: source.slice,
      inner: target.inner,
    }),
    Option.exists(({ cross, slice, inner }) => startsCross(`${cross}/${baseName(slice)}`, inner)),
  );

const otherSlice = ({ layers, source, target }: Omit<Hop, "edge">): boolean =>
  isSliced(layers)(target.layer) &&
  pipe(
    Option.all([source.slice, target.slice]),
    Option.exists(([from, to]) => from !== to),
  ) &&
  !crossing({ layers, source, target });

const indexIn = (layers: Layers, layer: string): Option.Option<number> =>
  Arr.findFirstIndex(layers.order, (name) => name === layer);

const upward = ({ layers, edge, source, target }: Hop): Finding =>
  finding(
    edge,
    LAYER_IMPORT,
    `uses the ${target.layer} layer from the ${source.layer} layer (${edge.specifier}). A layer may only use the layers below it: ${Arr.join(layers.order, ", ")}.`,
  );

const sideways = ({ edge, source, target }: Hop): Finding =>
  finding(
    edge,
    CROSS_SLICE,
    `uses the ${target.layer} slice ${Option.getOrElse(target.slice, () => "")} from the slice ${Option.getOrElse(source.slice, () => "")} (${edge.specifier}). Slices of one layer must not use each other; move what they share down a layer.`,
  );

const direction = (hop: Hop): Option.Option<Finding> =>
  pipe(
    Option.all({
      from: indexIn(hop.layers, hop.source.layer),
      to: indexIn(hop.layers, hop.target.layer),
    }),
    Option.flatMap(({ from, to }) => {
      if (to < from) {
        return Option.some(upward(hop));
      }
      if (to === from && otherSlice(hop)) {
        return Option.some(sideways(hop));
      }
      return Option.none();
    }),
  );

const wildcardFinding = (
  layout: Layout,
  edge: GraphEdge,
  { instance, position }: Located,
): Option.Option<Finding> =>
  pipe(
    asLayer(position),
    Option.flatMap(({ inner }) => inner),
    Option.filter((inner) => edge.wildcard && layout.isEntry(instance)(inner)),
    Option.map(() =>
      finding(
        edge,
        WILDCARD_EXPORT,
        `re-exports everything from ${edge.specifier}. Name what the public API exports.`,
      ),
    ),
  );

const restOf = (layout: Layout, layers: Layers, { instance, target }: Reach): string =>
  pipe(
    layout.inner(instance)(target),
    Option.flatMap(inside(layers.dir)),
    Option.getOrElse(() => ""),
  );

const hidden =
  (layout: Layout, reach: Reach) =>
  (to: LayerPosition, layers: Layers): boolean =>
    pipe(
      to.inner,
      Option.exists(
        (inner) =>
          !(reach.from.layer === to.layer && Equal.equals(reach.from.slice, to.slice)) &&
          isParted(layers)(to.layer) &&
          !layout.isEntry(reach.instance)(inner) &&
          !crossing({ layers, source: reach.from, target: to }) &&
          !layout.isOpen(reach.instance)(restOf(layout, layers, reach)),
      ),
    );

interface Target {
  readonly layers: Layers;
  readonly to: LayerPosition;
}

const targetOf = (layout: Layout, { instance, target }: Reach): Option.Option<Target> => {
  const layers = Option.fromNullishOr(instance.kind.layers);
  const to = asLayer(layout.locate(instance)(target));
  return Option.all({ layers, to });
};

const sliceName = ({ to }: Target): Option.Option<string> =>
  pipe(
    to.slice,
    Option.map((slice) => `${to.layer}/${slice}`),
  );

const publicApiFinding = (layout: Layout, edge: GraphEdge, reach: Reach): Option.Option<Finding> =>
  pipe(
    targetOf(layout, reach),
    Option.filter(({ layers, to }) => hidden(layout, reach)(to, layers)),
    Option.flatMap(sliceName),
    Option.map((slice) =>
      finding(
        edge,
        PUBLIC_API,
        `reaches into ${slice} past its public API (${edge.specifier}). Import the slice's entry file instead.`,
      ),
    ),
  );

const importFinding = (layout: Layout, edge: GraphEdge, reach: Reach): Option.Option<Finding> =>
  pipe(
    targetOf(layout, reach),
    Option.filter(() => Arr.contains(layout.owners(reach.target), reach.instance)),
    Option.flatMap(({ layers, to }) =>
      Option.orElse(direction({ layers, edge, source: reach.from, target: to }), () =>
        publicApiFinding(layout, edge, reach),
      ),
    ),
  );

const fileFindings = (layout: Layout, edge: GraphEdge, target: string): readonly Finding[] =>
  pipe(
    layout.located(edge.from),
    Arr.flatMap((located) => {
      const imported = pipe(
        asLayer(located.position),
        Option.flatMap((from) =>
          importFinding(layout, edge, { instance: located.instance, from, target }),
        ),
      );
      return Arr.appendAll(
        Option.toArray(wildcardFinding(layout, edge, located)),
        Option.toArray(imported),
      );
    }),
  );

const moduleTarget = (layers: Layers, target: readonly string[]): Option.Option<LayerPosition> =>
  pipe(
    Arr.head(target),
    Option.filter((layer) => isLayer(layers)(layer) && Option.isSome(Arr.get(target, ONE))),
    Option.map((layer): LayerPosition => ({
      type: "layer",
      layer,
      slice: Option.filter(Arr.get(target, ONE), () => isParted(layers)(layer)),
      inner: Option.none(),
    })),
  );

const moduleHop =
  (edge: GraphEdge, target: readonly string[]) =>
  (found: Omit<Hop, "edge" | "target">): Option.Option<Finding> =>
    pipe(
      moduleTarget(found.layers, target),
      Option.flatMap((to) => direction({ ...found, edge, target: to })),
    );

const moduleFindings = (
  layout: Layout,
  edge: GraphEdge,
  target: readonly string[],
): readonly Finding[] =>
  pipe(
    layout.located(edge.from),
    Arr.flatMap(({ instance, position }) => {
      const layers = Option.fromNullishOr(instance.kind.layers);
      const source = asLayer(position);
      return pipe(
        Option.all({ layers, source }),
        Option.flatMap(moduleHop(edge, target)),
        Option.toArray,
      );
    }),
  );

const linkFindings = (layout: Layout, edge: GraphEdge, target: string): readonly Finding[] => {
  if (layout.exists(target)) {
    return [];
  }
  return [finding(edge, LINK_TARGET, `links to ${edge.specifier}, where no file is tracked.`)];
};

export const checkImports =
  (edges: readonly GraphEdge[]) =>
  (layout: Layout): readonly Finding[] =>
    pipe(
      edges,
      Arr.flatMap((edge) => {
        if (edge.target.type === "module") {
          return moduleFindings(layout, edge, edge.target.value);
        }
        if (MARKDOWN.test(edge.from)) {
          return linkFindings(layout, edge, edge.target.value);
        }
        return fileFindings(layout, edge, edge.target.value);
      }),
    );
