import { providers, state } from "@alchemy.run/cloudflare";
import { traceSink } from "@r_masseater/workers-tracing/alchemy";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect } from "effect";
import type { ConfigError } from "effect/Config";

import { APP_NAME, PREFIX, TRACE_DESTINATION } from "./app-name.ts";

const stack: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  `${PREFIX}traces`,
  { providers: providers(), state: state() },
  Effect.gen(function* traces() {
    const destination = yield* traceSink({
      destination: TRACE_DESTINATION,
      workerName: `${APP_NAME}-trace-sink`,
      logpush: true,
    });
    return { slug: destination.slug };
  }),
);

export default stack;
