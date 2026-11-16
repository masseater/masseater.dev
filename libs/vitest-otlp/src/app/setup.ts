import { Effect, Exit, Option, Scope } from "effect";
import { afterAll, inject } from "vite-plus/test";

import { FORWARD_KEY } from "#/entities/semconv/index.ts";
import { receiverEnvironment, startReceiver } from "#/features/receive-otlp/index.ts";

import { setReceiver } from "./current-receiver.ts";

const scope = Scope.makeUnsafe();
const forwardOrigins = Option.getOrElse(Option.fromNullishOr(inject(FORWARD_KEY)), () => []);

const receiver = await Effect.runPromise(Scope.provide(startReceiver(forwardOrigins), scope));
setReceiver(Option.some(receiver));
Object.assign(process.env, receiverEnvironment(receiver.address)(process.env));

const stop = Effect.sync(() => {
  setReceiver(Option.none());
}).pipe(Effect.andThen(Scope.close(scope, Exit.void)));

afterAll(() => Effect.runPromise(stop));
