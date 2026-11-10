import { run, runner } from "@r_masseater/workers-tracing/effect";
import { Elysia } from "@r_masseater/workers-tracing/elysia";
import { notFound, redirect } from "@tanstack/router-core";
import { Context, Effect, Layer } from "effect";
import { expect, test, vi } from "vite-plus/test";

class Greeting extends Context.Service<Greeting, string>()(
  "@r_masseater/workers-tracing/plain.test/Greeting",
) {}

const GREETING = "hello";
const NO_LOGS = 0;
const ONE_LOG = 1;

test("in Node.js, run and runner run Effects without tracing", () =>
  Effect.gen(function* plainRun() {
    const runWithGreeting = runner(Layer.succeed(Greeting, GREETING));
    const greetings = yield* Effect.promise(() =>
      Promise.all([run(Effect.succeed(GREETING)), runWithGreeting(Effect.service(Greeting))]),
    );
    expect(greetings).toStrictEqual([GREETING, GREETING]);
  }).pipe(Effect.runPromise));

test("in Node.js, Elysia is the plain class", () =>
  Effect.gen(function* plainElysia() {
    const app = new Elysia().get("/", () => GREETING);
    const response = yield* Effect.promise(() => app.handle(new Request("http://localhost/")));
    const body = yield* Effect.promise(() => response.text());
    expect(body).toBe(GREETING);
  }).pipe(Effect.runPromise));

const settled = <Failure>(effect: Effect.Effect<never, Failure>): Effect.Effect<unknown> =>
  Effect.promise(() => Promise.allSettled([run(effect)]));

test("run logs a failure, and neither a redirect nor a notFound", () =>
  Effect.gen(function* answers() {
    const log = vi.spyOn(console, "log").mockReturnValue();
    const error = vi.spyOn(console, "error").mockReturnValue();
    yield* settled(Effect.die(redirect({ to: "/login" })));
    yield* settled(Effect.fail(notFound()));
    const afterAnswers = log.mock.calls.length + error.mock.calls.length;
    yield* settled(Effect.die(new TypeError("kaput")));
    const afterFailure = log.mock.calls.length + error.mock.calls.length;
    expect([afterAnswers, afterFailure]).toStrictEqual([NO_LOGS, ONE_LOG]);
  }).pipe(Effect.runPromise));
