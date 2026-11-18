import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect } from "effect";
import type { HttpClient } from "effect/http";

import { failure, text } from "#/shared/lib/tool-result.ts";

import { Vm } from "./vm.ts";
import type { Output } from "./vm.ts";

/** @internal */
export type Services = Vm | HttpClient.HttpClient;

/** @internal */
export type Runner = (
  effect: Effect.Effect<CallToolResult, never, Services>,
) => Promise<CallToolResult>;

const SUCCESS = 0;
const INDEX_TO_COUNT = 1;

export const fromOutput = ({ exitCode, output }: Output): CallToolResult => {
  const result = text(`exit ${String(exitCode)}\n${output}`);
  if (exitCode === SUCCESS) {
    return result;
  }
  return { ...result, isError: true };
};

export const tunnelTo = Effect.fn("tools.tunnelTo")(function* tunnelTo(instance: number) {
  const vm = yield* Vm;
  yield* vm.openTunnel(instance + INDEX_TO_COUNT);
});

export const recovered = ({
  message,
}: Readonly<{ message: string }>): Effect.Effect<CallToolResult> =>
  Effect.succeed(failure(message));

export const guest = Effect.fn("tools.guest")(function* guest(script: string) {
  const vm = yield* Vm;
  const output = yield* vm.guest(script);
  return fromOutput(output);
});
