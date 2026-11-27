import { JAPAN_GENERATION, JAPAN_OBJECT } from "@masseater.dev/cloudflare-account/japan";
import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";
import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger, Option } from "effect";
import { writesFromAnotherSite, writesWithoutJson } from "security-headers/request";

import {
  SessionsDb,
  researched,
  isSessionsPath,
  sessionRoutes,
  sessionsDbOf,
} from "#/entities/session/index.ts";
import { CORRECTION_PATH, QUESTION_PATH, RESEARCH_PATH, SUMMARY_PATH } from "#/shared/api/index.ts";
import { TELEMETRY_SERVICE, TRACES_PATH } from "#/shared/config/index.ts";

export type Interviewer = Readonly<{ fetch: (request: Request) => Promise<Response> }>;

export type FrontDoorBindings = Readonly<{
  SESSIONS: D1Database;
  INTERVIEWER: Readonly<{
    getByName: (name: string, options: typeof JAPAN_OBJECT) => Interviewer;
  }>;
}>;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);
const runLogged = runner(logger);

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const UNSUPPORTED_MEDIA_TYPE = 415;

const receiveSpans = browserSpans({ service: TELEMETRY_SERVICE });

const INTERVIEWER_PATHS: ReadonlySet<string> = new Set([
  SUMMARY_PATH,
  QUESTION_PATH,
  RESEARCH_PATH,
  CORRECTION_PATH,
]);

const refused = (status: number): Promise<Response> =>
  Promise.resolve(new Response("", { status }));

const reachesInterviewer = (request: Request, pathname: string): boolean =>
  request.method === "POST" && INTERVIEWER_PATHS.has(pathname);

const refusal = (request: Request, pathname: string): Option.Option<number> => {
  if (writesFromAnotherSite(request)) {
    return Option.some(FORBIDDEN);
  }
  if (pathname === TRACES_PATH) {
    return Option.none();
  }
  if (writesWithoutJson(request)) {
    return Option.some(UNSUPPORTED_MEDIA_TYPE);
  }
  if (isSessionsPath(pathname) || reachesInterviewer(request, pathname)) {
    return Option.none();
  }
  return Option.some(NOT_FOUND);
};

const withSessions =
  (sessions: D1Database) =>
  (effect: Effect.Effect<Response, never, SessionsDb>): Promise<Response> => {
    const db = sessionsDbOf(sessions);
    return runLogged(effect.pipe(Effect.provideService(SessionsDb, db)));
  };

const admitted = (
  request: Request,
  pathname: string,
  bindings: FrontDoorBindings,
): Promise<Response> => {
  if (pathname === TRACES_PATH) {
    return receiveSpans(request);
  }
  if (isSessionsPath(pathname)) {
    return withSessions(bindings.SESSIONS)(sessionRoutes(request));
  }
  const interviewer = bindings.INTERVIEWER.getByName(
    `interviewer${JAPAN_GENERATION}`,
    JAPAN_OBJECT,
  );
  if (pathname === RESEARCH_PATH) {
    return withSessions(bindings.SESSIONS)(researched((next) => interviewer.fetch(next))(request));
  }
  return interviewer.fetch(request);
};

export const frontDoor =
  (bindings: FrontDoorBindings) =>
  (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    return Option.match(refusal(request, pathname), {
      onSome: refused,
      onNone: () => admitted(request, pathname, bindings),
    });
  };
