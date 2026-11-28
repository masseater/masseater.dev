import type { Client, Tool } from "@modelcontextprotocol/client";
import { Array as Arr, Duration, Effect, Equivalence, Option, pipe } from "effect";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import { attemptsOf } from "#/features/probe-tools/model/arguments.ts";
import type { Attempt } from "#/features/probe-tools/model/arguments.ts";
import {
  findingOfCall,
  outcomeOfError,
  outcomeOfResult,
} from "#/features/probe-tools/model/outcome.ts";
import type { Outcome } from "#/features/probe-tools/model/outcome.ts";

export type Fuzz = Readonly<{
  client: Client;
  host: string;
  seed: number;
  timeout: Duration.Input;
}>;

const callOf = (
  input: Readonly<{ fuzz: Fuzz; tool: Tool; attempt: Attempt }>,
): Effect.Effect<Outcome> =>
  Effect.tryPromise({
    try: () =>
      input.fuzz.client.callTool(
        { name: input.tool.name, arguments: { ...input.attempt.arguments } },
        { timeout: Duration.toMillis(input.fuzz.timeout) },
      ),
    catch: outcomeOfError,
  }).pipe(
    Effect.match({
      onFailure: (outcome) => outcome,
      onSuccess: outcomeOfResult,
    }),
  );

const attemptsAgainst = Effect.fn("monkey.mcp.tool")(function* attemptsAgainst(
  input: Readonly<{ fuzz: Fuzz; tool: Tool }>,
) {
  const attempts = yield* attemptsOf({ schema: input.tool.inputSchema, seed: input.fuzz.seed });
  const calls = yield* Effect.forEach(attempts, (attempt) => callOf({ ...input, attempt }), {
    concurrency: 1,
  });
  return pipe(
    Arr.zip(attempts, calls),
    Arr.flatMap(([attempt, outcome]) =>
      Option.toArray(
        findingOfCall({
          host: input.fuzz.host,
          tool: input.tool.name,
          label: attempt.label,
          outcome,
        }),
      ),
    ),
  );
});

const isReadOnly = (tool: Tool): boolean =>
  pipe(
    Option.fromNullishOr(tool.annotations),
    Option.flatMap((annotations) => Option.fromNullishOr(annotations.readOnlyHint)),
    Option.contains(true),
  );

const namesOf = (tools: readonly Tool[]): readonly string[] =>
  pipe(
    tools,
    Arr.map(({ name }) => name),
  );

const toolsOf = (client: Client): Effect.Effect<readonly Tool[], Outcome> =>
  Effect.tryPromise({
    try: () => client.listTools(),
    catch: outcomeOfError,
  }).pipe(Effect.map(({ tools }) => tools));

const sameOrder = Arr.makeEquivalence(Equivalence.String);

const unstableOrder = Effect.fn("monkey.mcp.order")(function* unstableOrder(fuzz: Fuzz) {
  const first = yield* toolsOf(fuzz.client);
  const second = yield* toolsOf(fuzz.client);
  const finding = findingOf({
    kind: "mcp-contract",
    target: fuzz.host,
    detail: "tools/list returned the tools in a different order on a second call",
  });
  return pipe(
    Option.liftPredicate(finding, () => !sameOrder(namesOf(first), namesOf(second))),
    Option.toArray,
  );
});

const fuzzed = Effect.fn("monkey.mcp.fuzz")(function* fuzzed(fuzz: Fuzz) {
  const listed = yield* toolsOf(fuzz.client);
  const order = yield* unstableOrder(fuzz);
  const found = yield* Effect.forEach(
    pipe(listed, Arr.filter(isReadOnly)),
    (tool) => attemptsAgainst({ fuzz, tool }),
    { concurrency: 1 },
  );
  const all: readonly Finding[] = [...order, ...Arr.flatten(found)];
  return all;
});

/** @internal */
export const fuzzClient = fuzzed;
