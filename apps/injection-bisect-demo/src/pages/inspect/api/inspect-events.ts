import {
  ProbeListener,
  detect,
  openRouterPerRequest,
  withApiKey,
} from "@r_masseater/injection-bisect";
import type { Detection, InjectionJudge, ProbeEvent } from "@r_masseater/injection-bisect";
import { Clock, Effect, Queue, Stream } from "effect";

type Finished =
  | { readonly type: "done"; readonly detection: Detection }
  | { readonly type: "failed"; readonly reason: string };

type InspectEvent = (ProbeEvent | Finished) & { readonly at: number };

interface Request {
  readonly text: string;
  readonly model: string;
  readonly format: string;
}

const finish = ({
  text,
  model,
  format,
}: Readonly<Request>): Effect.Effect<Finished, never, InjectionJudge> =>
  detect(text, { model, format }).pipe(
    Effect.map((detection): Finished => ({ type: "done", detection })),
    Effect.catchTag("JudgeError", ({ reason }) =>
      Effect.succeed<Finished>({ type: "failed", reason }),
    ),
  );

const inspectEvents = ({
  text,
  apiKey,
  model,
  format,
}: Readonly<Request & { apiKey: string }>): AsyncIterable<InspectEvent> =>
  Stream.callback<InspectEvent, never, InjectionJudge>((queue) =>
    Effect.gen(function* emit() {
      const startedAt = yield* Clock.currentTimeMillis;
      const push = (event: ProbeEvent | Finished): Effect.Effect<void> =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) => Queue.offer(queue, { ...event, at: now - startedAt })),
          Effect.asVoid,
        );
      const last = yield* finish({ text, model, format }).pipe(
        Effect.provideService(ProbeListener, push),
      );
      yield* push(last);
      yield* Queue.end(queue);
    }).pipe(withApiKey(apiKey)),
  ).pipe(Stream.provide(openRouterPerRequest), Stream.toAsyncIterable);

export type { InspectEvent };
export { inspectEvents };
