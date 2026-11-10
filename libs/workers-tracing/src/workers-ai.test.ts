import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import { Array, Effect, Fiber, Inspectable, Record, Result, String, Tracer, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";

const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const EMBED_MODEL = "@cf/baai/bge-m3";
const PROMPT = "daily-summary";
const BUSY = "3040: Capacity temporarily exceeded, please try again.";
const ANSWER = {
  choices: [{ finish_reason: "stop" }],
  usage: { prompt_tokens: 30, completion_tokens: 12 },
};
const CUT_OFF = {
  choices: [{ finish_reason: "length" }],
  usage: { prompt_tokens: 30, completion_tokens: 120 },
};
const ALL_BACKOFF_MS = 60_000;
const NO_LOGS = 0;
const ONE_CALL = 1;
const THREE_CALLS = 3;
const FIVE_CALLS = 5;

type Model = () => Promise<typeof ANSWER>;

interface Recorded {
  readonly name: string;
  readonly kind: Tracer.SpanKind;
  readonly attributes: Record.ReadonlyRecord<string, unknown>;
}

const traced = <Success, Failure>(
  effect: Effect.Effect<Success, Failure>,
): Effect.Effect<readonly [Result.Result<Success, Failure>, readonly Recorded[]]> =>
  Effect.gen(function* advance() {
    const spans: Tracer.NativeSpan[] = [];
    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);
        spans.push(span);
        return span;
      },
    });
    vi.useFakeTimers();
    const fiber = yield* Effect.forkChild(
      Effect.result(effect).pipe(Effect.provideService(Tracer.Tracer, tracer)),
    );
    yield* Effect.promise(() => vi.advanceTimersByTimeAsync(ALL_BACKOFF_MS));
    const result = yield* Fiber.join(fiber);
    vi.useRealTimers();
    return [
      result,
      pipe(
        spans,
        Array.map(({ name, kind, attributes }) => ({
          name,
          kind,
          attributes: Record.fromEntries(attributes),
        })),
      ),
    ] as const;
  });

const isException = String.includes("gen_ai.client.inference.exception");

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

test("an out-of-capacity error from the binding is retried inside one span", () =>
  Effect.gen(function* retried() {
    const logged = logs();
    const call = vi
      .fn<Model>()
      .mockRejectedValueOnce(new Error(BUSY))
      .mockRejectedValueOnce(new Error(BUSY))
      .mockResolvedValue(ANSWER);
    const [result, spans] = yield* traced(
      runWorkersAi({ operation: "chat", model: MODEL, prompt: PROMPT, call }),
    );
    expect([Result.isSuccess(result), call.mock.calls.length, spans]).toStrictEqual([
      true,
      THREE_CALLS,
      [
        {
          name: `chat ${MODEL}`,
          kind: "client",
          attributes: {
            "gen_ai.operation.name": "chat",
            "gen_ai.provider.name": "cloudflare.workers_ai",
            "gen_ai.request.model": MODEL,
            "gen_ai.prompt.name": PROMPT,
            "gen_ai.response.finish_reasons": ["stop"],
            "gen_ai.usage.input_tokens": 30,
            "gen_ai.usage.output_tokens": 12,
          },
        },
      ],
    ]);
    const exceptions = pipe(logged(), Array.filter(isException));
    expect(exceptions).toHaveLength(THREE_CALLS - ONE_CALL);
  }).pipe(Effect.runPromise));

test("an out-of-capacity error from the REST API is retried four times, then fails with error.type", () =>
  Effect.gen(function* exhausted() {
    logs();
    const busy = Object.assign(new Error("429"), { errors: [{ code: 3040 }] });
    const call = vi.fn<Model>().mockRejectedValue(busy);
    const [result, spans] = yield* traced(
      runWorkersAi({ operation: "embeddings", model: EMBED_MODEL, call }),
    );
    expect([
      Result.isFailure(result),
      call.mock.calls.length,
      pipe(
        spans,
        Array.map(({ name, attributes }) => [name, attributes["error.type"]]),
      ),
    ]).toStrictEqual([true, FIVE_CALLS, [[`embeddings ${EMBED_MODEL}`, "3040"]]]);
  }).pipe(Effect.runPromise));

test("any other error is not retried", () =>
  Effect.gen(function* notRetried() {
    logs();
    const call = vi
      .fn<Model>()
      .mockRejectedValue(new Error("3036: You have used up your daily free allocation"));
    const [result, spans] = yield* traced(runWorkersAi({ operation: "chat", model: MODEL, call }));
    expect([
      Result.isFailure(result),
      call.mock.calls.length,
      pipe(
        spans,
        Array.map(({ attributes }) => attributes["error.type"]),
      ),
    ]).toStrictEqual([true, ONE_CALL, ["3036"]]);
  }).pipe(Effect.runPromise));

test("an answer that was cut off is logged with the attributes of its span", () =>
  Effect.gen(function* cutOff() {
    const logged = logs();
    yield* traced(
      runWorkersAi({ operation: "chat", model: MODEL, call: () => Promise.resolve(ANSWER) }),
    );
    const whole = logged().length;
    const [, spans] = yield* traced(
      runWorkersAi({
        operation: "chat",
        model: MODEL,
        prompt: PROMPT,
        call: () => Promise.resolve(CUT_OFF),
      }),
    );
    const text = pipe(logged(), Array.join("\n"));
    expect([
      whole,
      pipe(
        spans,
        Array.map(({ attributes }) => [
          attributes["gen_ai.response.finish_reasons"],
          attributes["gen_ai.usage.output_tokens"],
        ]),
      ),
      pipe(text, String.includes("gen_ai.prompt.name")),
      pipe(text, String.includes(PROMPT)),
      pipe(text, String.includes("gen_ai.response.finish_reasons")),
      pipe(text, String.includes("gen_ai.usage.output_tokens")),
    ]).toStrictEqual([
      NO_LOGS,
      [[["length"], CUT_OFF.usage.completion_tokens]],
      true,
      true,
      true,
      true,
    ]);
  }).pipe(Effect.runPromise));
