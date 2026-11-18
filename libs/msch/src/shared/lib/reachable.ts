import { Array as Arr, Function as Fn, HashSet, pipe } from "effect";

export type Edges = Readonly<Record<string, readonly string[]>>;

const DATA_FIRST_ARITY = 2;

const visit = (
  edges: Edges,
  seen: HashSet.HashSet<string>,
  frontier: readonly string[],
): HashSet.HashSet<string> => {
  const fresh = HashSet.difference(HashSet.fromIterable(frontier), seen);
  if (HashSet.isEmpty(fresh)) {
    return seen;
  }
  const next = pipe(
    Arr.fromIterable(fresh),
    Arr.flatMap((id) => edges[id] ?? []),
  );
  return visit(edges, HashSet.union(seen, fresh), next);
};

export const reachable: {
  (roots: readonly string[]): (edges: Edges) => readonly string[];
  (edges: Edges, roots: readonly string[]): readonly string[];
} = Fn.dual(DATA_FIRST_ARITY, (edges: Edges, roots: readonly string[]): readonly string[] =>
  Arr.fromIterable(visit(edges, HashSet.empty(), roots)),
);
