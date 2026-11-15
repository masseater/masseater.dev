import { Action, ActionResult, GameState, bridgePort } from "@masseater.dev/sts2-protocol";
import type { ActionType, GameStateType } from "@masseater.dev/sts2-protocol";
import { Effect, Option, Ref, Schedule, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { Sts2Failed } from "./errors.ts";

type Observation = Readonly<{ state: GameStateType; print: string; stable: number }>;

export type Act = Readonly<{ instance: number; action: ActionType }>;

const LOCALHOST = "http://127.0.0.1";
const POLL = "300 millis";
const RETRY = "2 seconds";
const SETTLE_TIMEOUT = "15 seconds";
const READY_TIMEOUT = "3 minutes";
const STABLE_POLLS = 2;
const UNSTABLE = 0;
const ONE_MORE = 1;
const FROZEN_FRAME = 0;

const urlOf = (instance: number, path: string): string =>
  `${LOCALHOST}:${String(bridgePort(instance))}${path}`;

const failed = (cause: unknown): Sts2Failed => Sts2Failed.make({ message: String(cause) });

/** @internal */
export const state = Effect.fn("bridge.state")(function* state(instance: number) {
  const response = yield* HttpClient.get(urlOf(instance, "/state"));
  const ok = yield* HttpClientResponse.filterStatusOk(response);
  return yield* HttpClientResponse.schemaBodyJson(GameState)(ok);
}, Effect.mapError(failed));

/** @internal */
export const act = Effect.fn("bridge.act")(function* act({ instance, action }: Act) {
  const request = yield* HttpClientRequest.schemaBodyJson(Action)(action)(
    HttpClientRequest.post(urlOf(instance, "/action")),
  );
  const response = yield* HttpClient.execute(request);
  const ok = yield* HttpClientResponse.filterStatusOk(response);
  return yield* HttpClientResponse.schemaBodyJson(ActionResult)(ok);
}, Effect.mapError(failed));

/** @internal */
export const screenshot = Effect.fn("bridge.screenshot")(function* screenshot(instance: number) {
  const response = yield* HttpClient.get(urlOf(instance, "/screenshot"));
  const ok = yield* HttpClientResponse.filterStatusOk(response);
  const buffer = yield* ok.arrayBuffer;
  return new Uint8Array(buffer);
}, Effect.mapError(failed));

const encodeState = Schema.encodeEffect(Schema.fromJsonString(GameState));

const fingerprint = (current: GameStateType): Effect.Effect<string, Sts2Failed> =>
  encodeState({ ...current, frame: FROZEN_FRAME }).pipe(Effect.mapError(failed));

const stableAfter = (
  previous: Option.Option<Observation>,
  current: GameStateType,
  print: string,
): number =>
  pipe(
    previous,
    Option.filter((last) => last.print === print && !current.busy),
    Option.match({ onNone: () => UNSTABLE, onSome: (last) => last.stable + ONE_MORE }),
  );

const observe = Effect.fn("bridge.observe")(function* observe(
  instance: number,
  last: Ref.Ref<Option.Option<Observation>>,
) {
  const current = yield* state(instance);
  const print = yield* fingerprint(current);
  const previous = yield* Ref.get(last);
  const observation = { state: current, print, stable: stableAfter(previous, current, print) };
  yield* Ref.set(last, Option.some(observation));
  return observation;
});

/** @internal */
export const settle = Effect.fn("bridge.settle")(function* settle(instance: number) {
  const last = yield* Ref.make(Option.none<Observation>());
  const settled = yield* observe(instance, last).pipe(
    Effect.repeat({
      schedule: Schedule.spaced(POLL),
      until: (observation) => observation.stable >= STABLE_POLLS,
    }),
    Effect.andThen(Ref.get(last)),
    Effect.timeoutOrElse({ duration: SETTLE_TIMEOUT, orElse: () => Ref.get(last) }),
  );
  return yield* Option.match(settled, {
    onNone: () => state(instance),
    onSome: (observation) => Effect.succeed(observation.state),
  });
});

/** @internal */
export const waitReady = Effect.fn("bridge.waitReady")(function* waitReady(instance: number) {
  return yield* state(instance).pipe(
    Effect.retry(Schedule.spaced(RETRY)),
    Effect.timeoutOrElse({
      duration: READY_TIMEOUT,
      orElse: () =>
        Effect.fail(
          Sts2Failed.make({ message: `bridge of instance ${String(instance)} did not answer` }),
        ),
    }),
  );
});
