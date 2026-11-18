import { Array as Arr, Option, String as Str, pipe } from "effect";

import { childOf, leafExpressions, matchesPattern } from "#/entities/expression-tree/index.ts";
import type { ContextExpr, Spanned } from "#/entities/expression-tree/index.ts";
import { parseDocker } from "#/features/zizmor/lib/common.ts";
import { parseBare } from "#/features/zizmor/lib/expressions.ts";
import { annotated, keyOnly, withinText } from "#/features/zizmor/lib/location.ts";
import { hasIndirectExpansions, isStaticExpansion } from "#/features/zizmor/lib/matrix.ts";
import type { DockerUses, LoE } from "#/features/zizmor/model/common.ts";
import type { Confidence, Persona, SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { MatrixView } from "#/features/zizmor/model/step.ts";

const SINGLE = 1;

export interface Candidate {
  readonly annotation: string;
  readonly confidence: Confidence;
  readonly persona: Persona;
  readonly location: SymbolicLocation;
  readonly related: readonly SymbolicLocation[];
}

const concrete = (
  image: DockerUses,
  location: SymbolicLocation,
  related: readonly SymbolicLocation[],
): Option.Option<Candidate> => {
  if (Str.isEmpty(image.image) || Option.isSome(image.hash)) {
    return Option.none();
  }
  const [annotation, level] = Option.match(image.tag, {
    onNone: () => ["container image is unpinned", "regular"] as const,
    onSome: (tag) => {
      if (tag === "latest") {
        return ["container image uses the floating 'latest' tag", "regular"] as const;
      }
      return ["container image is not pinned to a SHA256 hash", "pedantic"] as const;
    },
  });
  return Option.some({ annotation, confidence: "high", persona: level, location, related });
};

const opaque = (location: SymbolicLocation, related: readonly SymbolicLocation[]): Candidate => ({
  annotation: "container image may be unpinned",
  confidence: "low",
  persona: "regular",
  location,
  related,
});

const isMatrix = childOf("matrix");

export type ImageAt = readonly [LoE<DockerUses>, SymbolicLocation];

const fromMatrix = (
  context: ContextExpr,
  location: SymbolicLocation,
  matrix: MatrixView,
): readonly Candidate[] => {
  const candidates = pipe(
    matrix.expansions,
    Arr.filter(
      (expansion) => matchesPattern(expansion.path)(context) && isStaticExpansion(expansion),
    ),
    Arr.flatMap((expansion) =>
      Option.toArray(
        concrete(parseDocker(expansion.value), location, [
          keyOnly(matrix.location),
          annotated(`this expansion of ${expansion.path}`)(expansion.location),
        ]),
      ),
    ),
  );
  if (!hasIndirectExpansions(matrix)) {
    return candidates;
  }
  return [
    ...candidates,
    opaque(location, [
      annotated("this matrix")(keyOnly(matrix.location)),
      ...Arr.map(
        Option.toArray(matrix.indirectlyExpanded),
        annotated("indirect `matrix` adds unanalyzable combinations"),
      ),
      ...Arr.map(
        Option.toArray(matrix.indirectInclusions),
        annotated("`include` may add unanalyzable combinations"),
      ),
    ]),
  ];
};

const forLeaf = (
  leaf: Spanned,
  location: SymbolicLocation,
  matrix: Option.Option<MatrixView>,
): readonly Candidate[] => {
  const { expr } = leaf;
  if (expr.type === "literal" && expr.literal.kind === "string") {
    if (Str.isEmpty(expr.literal.value)) {
      return [];
    }
    return Option.toArray(concrete(parseDocker(expr.literal.value), location, []));
  }
  if (expr.type === "context" && isMatrix(expr)) {
    return Option.match(matrix, {
      onNone: () => [],
      onSome: (view) => fromMatrix(expr, location, view),
    });
  }
  return [opaque(location, [])];
};

const leafLocation =
  (single: boolean, location: SymbolicLocation) =>
  (leaf: Spanned): SymbolicLocation => {
    if (single) {
      return location;
    }
    return withinText(leaf.origin.raw)(location);
  };

export const candidatesOf =
  (matrix: Option.Option<MatrixView>) =>
  ([image, location]: ImageAt): readonly Candidate[] => {
    if (image.type === "literal") {
      return Option.toArray(concrete(image.value, location, []));
    }
    return Option.match(parseBare(image.raw), {
      onNone: () => [opaque(location, [])],
      onSome: (parsed) => {
        const leaves = leafExpressions(parsed);
        const single = leaves.length === SINGLE;
        return pipe(
          leaves,
          Arr.flatMap((leaf) => forLeaf(leaf, leafLocation(single, location)(leaf), matrix)),
        );
      },
    });
  };
