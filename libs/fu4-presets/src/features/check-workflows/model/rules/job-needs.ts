import type { Position } from "@r_masseater/fu4";
import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import type { Job } from "#/entities/workflow/index.ts";
import { findCycle } from "#/features/check-workflows/lib/cycle.ts";
import type { Cycle } from "#/features/check-workflows/lib/cycle.ts";
import { NOOP, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import { describePosition } from "#/shared/yaml/index.ts";

interface Node {
  readonly id: string;
  readonly needs: readonly string[];
  readonly position: Position;
}

const isBefore = (left: Position, right: Position): boolean =>
  left.line < right.line || (left.line === right.line && left.column < right.column);

const uniqueNeeds = (fail: Fail, job: Job): readonly string[] => {
  const needs: string[] = [];
  for (const need of job.needs) {
    const id = Str.toLowerCase(need.value);
    if (Arr.contains(needs, id)) {
      fail(
        need,
        `job ID ${quote(need.value)} duplicates in "needs" section. note that job ID is case insensitive`,
      );
    } else if (Str.isNonEmpty(id)) {
      needs.push(id);
    }
  }
  return needs;
};

const startOf = (nodes: readonly Node[], cycle: Cycle): number => {
  let start = cycle.from;
  for (const node of cycle.members) {
    if (isBefore(Arr.getUnsafe(nodes, node).position, Arr.getUnsafe(nodes, start).position)) {
      start = node;
    }
  }
  return start;
};

const cycleMessage = (nodes: readonly Node[], cycle: Cycle): readonly [Position, string] => {
  const start = startOf(nodes, cycle);
  const idOf = (node: number): string => quote(Arr.getUnsafe(nodes, node).id);
  const path = [idOf(start)];
  for (let next = cycle.next(start); ; next = cycle.next(next)) {
    path.push(idOf(next));
    if (next === start) {
      break;
    }
  }
  return [
    Arr.getUnsafe(nodes, start).position,
    `cyclic dependencies in "needs" job configurations are detected. detected cycle is ${Arr.join(path, " -> ")}`,
  ];
};

const targetsOf =
  (fail: Fail, lookup: (dep: string) => Option.Option<number>) =>
  (node: Node): Option.Option<readonly number[]> => {
    const missing = pipe(
      node.needs,
      Arr.filter((dep) => Option.isNone(lookup(dep))),
    );
    for (const dep of missing) {
      fail(
        node.position,
        `job ${quote(node.id)} needs job ${quote(dep)} which does not exist in this workflow`,
      );
    }
    return Option.liftPredicate(
      pipe(
        node.needs,
        Arr.flatMap((dep) => Option.toArray(lookup(dep))),
      ),
      () => Arr.isReadonlyArrayEmpty(missing),
    );
  };

const resolve = (
  fail: Fail,
  nodes: readonly Node[],
  lookup: (dep: string) => Option.Option<number>,
): Option.Option<readonly (readonly number[])[]> => {
  const graph = pipe(
    nodes,
    Arr.map((node) => targetsOf(fail, lookup)(node)),
  );
  return Option.all(graph);
};

export const jobNeeds = workflowRule({
  description: "Reports duplicated, missing and cyclic job dependencies in needs",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-job-deps",
  visitor: (fail): Visitor => {
    const nodes: Node[] = [];
    const index = new Map<string, number>();
    return {
      ...NOOP,
      jobPre: (job): void => {
        const needs = uniqueNeeds(fail, job);
        const id = Str.toLowerCase(job.id.value);
        if (Str.isEmpty(id)) {
          return;
        }
        for (const previous of Option.toArray(Option.fromNullishOr(index.get(id)))) {
          fail(
            job,
            `job ID ${quote(job.id.value)} duplicates. previously defined at ${describePosition(Arr.getUnsafe(nodes, previous).position)}. note that job ID is case insensitive`,
          );
        }
        index.set(id, nodes.length);
        nodes.push({ id, needs, position: job.id });
      },
      workflowPost: (): void => {
        const order = pipe(
          Arr.sort(
            [...index.entries()],
            Order.mapInput(Order.String, ([key]: readonly [string, number]) => key),
          ),
          Arr.map(([, node]) => node),
        );
        const cycle = pipe(
          resolve(fail, nodes, (dep) => Option.fromNullishOr(index.get(dep))),
          Option.flatMap((graph) => findCycle(graph)(order)),
        );
        for (const found of Option.toArray(cycle)) {
          const [position, message] = cycleMessage(nodes, found);
          fail(position, message);
        }
      },
    };
  },
});
