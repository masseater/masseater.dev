import { providers, state } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect } from "effect";
import type { ConfigError } from "effect/Config";

import { PREFIX } from "./app-name.ts";
import { COMPATIBILITY } from "./compatibility.ts";
import { traceSink } from "./trace-sink.ts";

const stack: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  `${PREFIX}traces`,
  { providers: providers(), state: state() },
  Effect.gen(function* traces() {
    const destination = yield* traceSink(COMPATIBILITY);
    return { slug: destination.slug };
  }),
);

export default stack;
