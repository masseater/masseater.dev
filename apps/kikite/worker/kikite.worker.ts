import { runner } from "@r_masseater/workers-tracing/effect";
import { DurableObject, env } from "cloudflare:workers";
import { Duration, Effect, Logger, Option, Schedule } from "effect";

import {
  API_PORT,
  INTERVIEWER_IDLE,
  INTERVIEWER_IMAGE,
  INTERVIEWER_INSTANCE,
  INTERVIEWER_STARTUP,
} from "#config";

import { down } from "./interviewer-down.ts";
import type { InterviewerDown } from "./interviewer-down.ts";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);
const runLogged = runner(logger);

const SERVICE_UNAVAILABLE = 503;
const CONTAINER_ORIGIN = "http://interviewer";

const STARTUP_RETRY = {
  schedule: Schedule.spaced(INTERVIEWER_STARTUP.spacing),
  times: INTERVIEWER_STARTUP.probes,
} as const;

const start = Effect.fn("kikite.startInterviewer")(function* start(container: Container) {
  if (container.running) {
    return;
  }
  const image = yield* Effect.fromOption(
    Option.fromUndefinedOr(container.images[INTERVIEWER_IMAGE]),
    () => down(`image ${INTERVIEWER_IMAGE} is not bound`),
  );
  const token = yield* Effect.tryPromise({
    try: () => env.CLAUDE_CODE_OAUTH_TOKEN.get(),
    catch: down,
  });
  yield* Effect.try({
    try: () => {
      container.start({
        image,
        enableInternet: true,
        instance: INTERVIEWER_INSTANCE,
        env: { CLAUDE_CODE_OAUTH_TOKEN: token },
      });
    },
    catch: down,
  });
  yield* Effect.tryPromise({
    try: () => container.setInactivityTimeout(Duration.toMillis(INTERVIEWER_IDLE)),
    catch: down,
  });
});

const containerUrl = (url: string): string => {
  const { pathname, search } = new URL(url);
  return `${CONTAINER_ORIGIN}${pathname}${search}`;
};

const containerOf = (ctx: DurableObjectState): Effect.Effect<Container, InterviewerDown> =>
  Effect.fromOption(Option.fromUndefinedOr(ctx.container), () =>
    down("the durable object has no container"),
  );

const forward = Effect.fn("kikite.forward")(function* forward(
  container: Container,
  request: Request,
) {
  yield* start(container);
  const body = yield* Effect.tryPromise({ try: () => request.arrayBuffer(), catch: down });
  return yield* Effect.tryPromise({
    try: () =>
      container.getTcpPort(API_PORT).fetch(containerUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body,
      }),
    catch: down,
  }).pipe(Effect.retry(STARTUP_RETRY));
});

class Interviewer extends DurableObject {
  public override fetch(request: Request): Promise<Response> {
    return runLogged(
      containerOf(this.ctx).pipe(
        Effect.flatMap((container) => forward(container, request)),
        Effect.catchTag("InterviewerDown", ({ message }) =>
          Effect.logError("kikite.interviewerDown").pipe(
            Effect.annotateLogs({ message }),
            Effect.as(new Response(message, { status: SERVICE_UNAVAILABLE })),
          ),
        ),
      ),
    );
  }
}

const worker = {
  fetch: (request: Request): Promise<Response> =>
    env.INTERVIEWER.getByName("interviewer").fetch(request),
};

export { Interviewer };
export default worker;
