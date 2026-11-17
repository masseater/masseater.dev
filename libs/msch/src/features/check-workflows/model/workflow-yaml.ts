import { Array as Arr, Effect, Option, pipe } from "effect";
import { isMap, isPair, isScalar, parseDocument, visit } from "yaml";
import type { Pair } from "yaml";

import type { Finding, Problem } from "#/shared/lib/problem.ts";
import type { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { readWorkflows } from "#/shared/lib/workflow-files.ts";

export const pairsNamed =
  (name: string) =>
  (source: string): readonly Pair[] => {
    const found: Pair[] = [];
    visit(parseDocument(source), {
      Pair: (_key, pair) => {
        if (isPair(pair) && isScalar(pair.key) && pair.key.value === name) {
          found.push(pair);
        }
      },
    });
    return found;
  };

export const pairIn =
  (name: string) =>
  (node: unknown): Option.Option<Pair> =>
    pipe(
      Option.liftPredicate(node, isMap),
      Option.flatMap((map) =>
        Arr.findFirst(map.items, (item) => isScalar(item.key) && item.key.value === name),
      ),
    );

export const keyOffsetIn =
  (name: string) =>
  (node: unknown): Option.Option<number> =>
    pipe(
      pairIn(name)(node),
      Option.flatMap(({ key }) => Option.liftPredicate(key, isScalar)),
      Option.flatMap((key) => Option.fromNullishOr(key.range)),
      Option.map(([start]) => start),
    );

export interface WorkflowFinding extends Finding {
  readonly offsetsOf: (source: string) => readonly number[];
}

export const workflowCheck = ({
  rule,
  message,
  offsetsOf,
}: WorkflowFinding): ((
  root: string,
) => Effect.Effect<readonly Problem[], never, RepositoryFiles>) =>
  Effect.fn(rule)(function* checkWorkflows(root: string) {
    const workflows = yield* readWorkflows(root);
    return pipe(
      workflows,
      Arr.flatMap(({ file, source }): readonly Problem[] => {
        const at = positionOf(source);
        return pipe(
          offsetsOf(source),
          Arr.map((offset): Problem => {
            const { line, column } = at(offset);
            return { file, line, column, rule, message };
          }),
        );
      }),
    );
  });

export interface ScalarKey {
  readonly name: string;
  readonly matches: (value: string) => boolean;
}

export const scalarKeyOffsets =
  ({ name, matches }: ScalarKey) =>
  (source: string): readonly number[] =>
    pipe(
      pairsNamed(name)(source),
      Arr.filter(({ value }) => isScalar(value) && matches(String(value.value))),
      Arr.flatMap(({ key }) =>
        pipe(
          Option.liftPredicate(key, isScalar),
          Option.flatMap((scalar) => Option.fromNullishOr(scalar.range)),
          Option.map(([start]) => start),
          Option.toArray,
        ),
      ),
    );
