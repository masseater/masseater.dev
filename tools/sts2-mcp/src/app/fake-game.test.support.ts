import type { GameStateType } from "@masseater.dev/sts2-protocol";
import { Array as Arr, Context, Effect, Option, Ref, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import MAIN_MENU from "#/app/fixtures/main-menu.json" with { type: "json" };
import { Vm } from "#/shared/api/index.ts";
import type { Output } from "#/shared/api/index.ts";

/** @internal */
export type Sent = Readonly<{ method: string; url: string; body: string }>;

/** @internal */
export type Fake = Readonly<{
  states: readonly GameStateType[];
  served: number;
  sent: readonly Sent[];
  scripts: readonly string[];
  tunnels: readonly number[];
}>;

/** @internal */
export type Scene = Readonly<{
  states: readonly GameStateType[];
  guest: Output;
  failState: boolean;
}>;

/** @internal */
export type FakeGame = Readonly<{
  context: Context.Context<Vm | HttpClient.HttpClient>;
  now: () => Fake;
}>;

const OK = 200;
const SERVER_ERROR = 500;
const NEXT = 1;
const PNG_BYTES = new TextEncoder().encode("PNG");

/** @internal */
export const gameState = (overrides: Partial<GameStateType> = {}): GameStateType => ({
  ...MAIN_MENU,
  ...overrides,
});

const bodyOf = (request: HttpClientRequest.HttpClientRequest): Effect.Effect<string> =>
  HttpClientRequest.toWeb(request).pipe(
    Effect.flatMap((web) => Effect.promise(() => web.text())),
    Effect.orDie,
  );

const nextState = (fake: Fake): GameStateType =>
  pipe(
    Arr.get(fake.states, fake.served),
    Option.orElse(() => Arr.last(fake.states)),
    Option.getOrElse(() => gameState()),
  );

const answer = (
  ref: Ref.Ref<Fake>,
  scene: Scene,
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<Response> =>
  Effect.gen(function* answerRequest() {
    const body = yield* bodyOf(request);
    const sent = { method: request.method, url: request.url, body };
    const fake = yield* Ref.updateAndGet(ref, (current) => ({
      ...current,
      sent: [...current.sent, sent],
    }));
    const path = new URL(request.url).pathname;
    if (path === "/action") {
      return Response.json({ ok: true, message: "done" });
    }
    if (scene.failState) {
      return new Response("bridge failed", { status: SERVER_ERROR });
    }
    yield* Ref.update(ref, (current) => ({ ...current, served: current.served + NEXT }));
    return Response.json(nextState(fake), { status: OK });
  });

/** @internal */
export const fakeGame = (scene: Partial<Scene> = {}): FakeGame => {
  const full: Scene = {
    states: [gameState()],
    guest: { exitCode: 0, output: "RESULT={}" },
    failState: false,
    ...scene,
  };
  const ref = Ref.makeUnsafe<Fake>({
    states: full.states,
    served: 0,
    sent: [],
    scripts: [],
    tunnels: [],
  });
  const client = HttpClient.make((request) =>
    answer(ref, full, request).pipe(
      Effect.map((response) => HttpClientResponse.fromWeb(request, response)),
    ),
  );
  const vm = Vm.of({
    guest: (script) =>
      Ref.update(ref, (current) => ({ ...current, scripts: [...current.scripts, script] })).pipe(
        Effect.as(full.guest),
      ),
    desktopScreenshot: Effect.succeed(PNG_BYTES),
    openTunnel: (instances) =>
      Ref.update(ref, (current) => ({ ...current, tunnels: [...current.tunnels, instances] })),
  });
  return {
    context: Context.make(Vm, vm).pipe(Context.add(HttpClient.HttpClient, client)),
    now: () => Ref.getUnsafe(ref),
  };
};
