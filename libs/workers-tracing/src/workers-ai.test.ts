import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import { Array, Effect, Fiber, Inspectable, Result, String, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";

const LABEL = "daily summary";
const BUSY = "3040: Capacity temporarily exceeded, please try again.";
const ANSWER = { choices: [{ finish_reason: "stop" }], usage: { completion_tokens: 12 } };
const CUT_OFF = { choices: [{ finish_reason: "length" }], usage: { completion_tokens: 120 } };
const ALL_BACKOFF_MS = 60_000;
const NO_LOGS = 0;
const ONE_CALL = 1;
const THREE_CALLS = 3;
const FIVE_CALLS = 5;

type Model = () => Promise<typeof ANSWER>;

const afterBackoff = <Success, Failure>(
  effect: Effect.Effect<Success, Failure>,
): Effect.Effect<Result.Result<Success, Failure>> =>
  Effect.gen(function* advance() {
    vi.useFakeTimers();
    const fiber = yield* Effect.forkChild(Effect.result(effect));
    yield* Effect.promise(() => vi.advanceTimersByTimeAsync(ALL_BACKOFF_MS));
    const result = yield* Fiber.join(fiber);
    vi.useRealTimers();
    return result;
  });

const logs = (): (() => readonly string[]) => {
  const log = vi.spyOn(console, "log").mockReturnValue();
  const warn = vi.spyOn(console, "warn").mockReturnValue();
  return () =>
    pipe(
      [...log.mock.calls, ...warn.mock.calls],
      Array.flatten,
      Array.map(Inspectable.toStringUnknown),
    );
};

test("an out-of-capacity error from the binding is retried until the model answers", () =>
  Effect.gen(function* retried() {
    logs();
    const call = vi
      .fn<Model>()
      .mockRejectedValueOnce(new Error(BUSY))
      .mockRejectedValueOnce(new Error(BUSY))
      .mockResolvedValue(ANSWER);
    const result = yield* afterBackoff(runWorkersAi({ label: LABEL, call }));
    expect([Result.isSuccess(result), call.mock.calls.length]).toStrictEqual([true, THREE_CALLS]);
  }).pipe(Effect.runPromise));

test("an out-of-capacity error from the REST API is retried four times, then fails", () =>
  Effect.gen(function* exhausted() {
    logs();
    const busy = Object.assign(new Error("429"), { errors: [{ code: 3040 }] });
    const call = vi.fn<Model>().mockRejectedValue(busy);
    const result = yield* afterBackoff(runWorkersAi({ label: LABEL, call }));
    expect([Result.isFailure(result), call.mock.calls.length]).toStrictEqual([true, FIVE_CALLS]);
  }).pipe(Effect.runPromise));

test("any other error is not retried", () =>
  Effect.gen(function* notRetried() {
    logs();
    const call = vi
      .fn<Model>()
      .mockRejectedValue(new Error("3036: You have used up your daily free allocation"));
    const result = yield* afterBackoff(runWorkersAi({ label: LABEL, call }));
    expect([Result.isFailure(result), call.mock.calls.length]).toStrictEqual([true, ONE_CALL]);
  }).pipe(Effect.runPromise));

test("an answer that was cut off is logged with its label, reason and output tokens", () =>
  Effect.gen(function* cutOff() {
    const logged = logs();
    yield* afterBackoff(runWorkersAi({ label: LABEL, call: () => Promise.resolve(ANSWER) }));
    const whole = logged().length;
    yield* afterBackoff(runWorkersAi({ label: LABEL, call: () => Promise.resolve(CUT_OFF) }));
    const text = pipe(logged(), Array.join("\n"));
    expect([
      whole,
      pipe(text, String.includes(LABEL)),
      pipe(text, String.includes("length")),
      pipe(text, String.includes("120")),
    ]).toStrictEqual([NO_LOGS, true, true, true]);
  }).pipe(Effect.runPromise));
