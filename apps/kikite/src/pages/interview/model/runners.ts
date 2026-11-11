import { Effect, FiberHandle, FiberSet } from "effect";
import type { HttpClient } from "effect/http";
import type { AtomRegistry } from "effect/reactivity";

type Services = AtomRegistry.AtomRegistry | HttpClient.HttpClient;

const runners = Effect.gen(function* runners() {
  return {
    asking: yield* FiberHandle.makeRuntime<Services>(),
    summarizing: yield* FiberHandle.makeRuntime<Services>(),
    voicing: yield* FiberHandle.makeRuntime<AtomRegistry.AtomRegistry>(),
    events: yield* FiberSet.makeRuntime<Services>(),
  };
});

/** @internal */
export { runners };
