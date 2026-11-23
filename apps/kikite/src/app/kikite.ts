import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";
import { runner } from "@r_masseater/workers-tracing/effect";
import { DurableObject, env } from "cloudflare:workers";
import { Duration, Effect, Logger, Option, Schedule, String as Str } from "effect";

import { researched, isSessionsPath, sessionRoutes } from "#/entities/session/index.ts";
import { CORRECTION_PATH, QUESTION_PATH, RESEARCH_PATH, SUMMARY_PATH } from "#/shared/api/index.ts";
import {
  API_PORT,
  INTERVIEWER_IDLE,
  INTERVIEWER_IMAGE,
  INTERVIEWER_INSTANCE,
  INTERVIEWER_STARTUP,
  TELEMETRY_SERVICE,
  TRACES_PATH,
} from "#/shared/config/index.ts";
import { writesFromAnotherSite, writesWithoutJson } from "#/shared/lib/write-guard.ts";

import { down } from "./interviewer-down.ts";
import type { InterviewerDown } from "./interviewer-down.ts";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);
const runLogged = runner(logger);

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const UNSUPPORTED_MEDIA_TYPE = 415;
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

const CALLER_CREDENTIALS: ReadonlySet<string> = new Set(["authorization", "cookie"]);

const withoutCredentials = (headers: Headers): Headers =>
  new Headers(
    [...headers].filter(
      ([name]) => !CALLER_CREDENTIALS.has(name) && !Str.startsWith("cf-access-")(name),
    ),
  );

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
        headers: withoutCredentials(request.headers),
        body,
      }),
    catch: down,
  }).pipe(Effect.retry(STARTUP_RETRY));
});

export class Interviewer extends DurableObject {
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

const receiveSpans = browserSpans({ service: TELEMETRY_SERVICE });

const INTERVIEWER_PATHS: ReadonlySet<string> = new Set([
  SUMMARY_PATH,
  QUESTION_PATH,
  RESEARCH_PATH,
  CORRECTION_PATH,
]);

const refused = (status: number): Promise<Response> =>
  Promise.resolve(new Response("", { status }));

const worker = {
  fetch: (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (writesFromAnotherSite(request)) {
      return refused(FORBIDDEN);
    }
    if (pathname === TRACES_PATH) {
      return receiveSpans(request);
    }
    if (writesWithoutJson(request)) {
      return refused(UNSUPPORTED_MEDIA_TYPE);
    }
    if (isSessionsPath(pathname)) {
      return runLogged(sessionRoutes(request));
    }
    if (request.method !== "POST" || !INTERVIEWER_PATHS.has(pathname)) {
      return refused(NOT_FOUND);
    }
    const interviewer = env.INTERVIEWER.getByName("interviewer");
    if (pathname === RESEARCH_PATH) {
      return runLogged(researched((next) => interviewer.fetch(next))(request));
    }
    return interviewer.fetch(request);
  },
};

export default worker;
