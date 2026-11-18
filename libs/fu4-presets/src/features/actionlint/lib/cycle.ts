import { Array as Arr, Option, pipe } from "effect";

type Status = "new" | "active" | "finished";
type Edge = readonly [number, number];
export type Graph = readonly (readonly number[])[];

export interface Cycle {
  readonly from: number;
  readonly members: readonly number[];
  readonly next: (node: number) => number;
}

interface Search {
  readonly visit: (from: number) => Option.Option<Edge>;
  readonly edge: (from: number, to: number) => Option.Option<Edge>;
  readonly collect: (from: number) => boolean;
}

const targetsIn =
  (graph: Graph) =>
  (from: number): readonly number[] =>
    Option.getOrElse(Arr.get(graph, from), () => []);

export const findCycle =
  (graph: Graph) =>
  (order: readonly number[]): Option.Option<Cycle> => {
    const status: Status[] = pipe(
      graph,
      Arr.map((): Status => "new"),
    );
    const edges = new Map<number, number>();
    const targets = targetsIn(graph);
    const search: Search = {
      visit: (from) => {
        status[from] = "active";
        const found = Arr.findFirst(targets(from), (to) => search.edge(from, to));
        status[from] = Option.match(found, { onNone: () => "finished", onSome: () => "active" });
        return found;
      },
      edge: (from, to) => {
        if (status[to] === "new") {
          return search.visit(to);
        }
        return Option.liftPredicate([from, to] as const, () => status[to] === "active");
      },
      collect: (from) =>
        Arr.some(targets(from), (to) => {
          edges.set(from, to);
          const closed = status[to] === "active" && (edges.has(to) || search.collect(to));
          if (!closed) {
            edges.delete(from);
          }
          return closed;
        }),
    };
    return pipe(
      order,
      Arr.findFirst((node) => search.edge(node, node)),
      Option.map(([from, to]): Cycle => {
        edges.set(from, to);
        search.collect(to);
        return { from, members: [...edges.keys()], next: (node) => edges.get(node) ?? from };
      }),
    );
  };
