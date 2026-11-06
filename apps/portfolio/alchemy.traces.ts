import { providers, state } from "@alchemy.run/cloudflare";
import { traceSink } from "@masseater.dev/cloudflare-account/trace-sink";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect } from "effect";
import type { ConfigError } from "effect/Config";

import { APP_NAME, PREFIX, TRACE_DESTINATION } from "./app-name.ts";
import { COMPATIBILITY } from "./compatibility.ts";

const stack: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  `${PREFIX}traces`,
  { providers: providers(), state: state() },
  Effect.gen(function* traces() {
    const destination = yield* traceSink({
      appName: APP_NAME,
      destination: TRACE_DESTINATION,
      compatibility: COMPATIBILITY,
    });
    return { slug: destination.slug };
  }),
);

export default stack;
