import { runner } from "@r_masseater/workers-tracing/effect";
import { DurableObject, env } from "cloudflare:workers";
import { DateTime, Effect, Layer, Logger, Option, String as Str } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { ARM_LEAD, AUDIO_KEY, BASE_PATH } from "#config";

import { inviteUrl, ownedApplication } from "./discord-application.ts";
import { performLogged } from "./perform.ts";
import { nextPlayAt } from "./play-time.ts";
import { arm, isStoredToken, lastRun, storeLastRun, storeToken } from "./player-state.ts";
import { Rejected } from "./rejected.ts";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);
const runLogged = runner(Layer.mergeAll(logger, fetchHttpClient));

class Player extends DurableObject {
  public setToken(token: string): Promise<void> {
    return runLogged(storeToken(this.ctx.storage, token));
  }

  public isToken(token: string): Promise<boolean> {
    return runLogged(isStoredToken(this.ctx.storage, token));
  }

  public arm(startAt: number): Promise<void> {
    return runLogged(arm(this.ctx.storage, startAt));
  }

  public lastRun(): Promise<unknown> {
    return runLogged(lastRun(this.ctx.storage).pipe(Effect.map(Option.getOrNull)));
  }

  public override alarm(): Promise<void> {
    return runLogged(
      performLogged(this.ctx, env.AUDIO).pipe(
        Effect.flatMap((result) => storeLastRun(this.ctx.storage, result)),
      ),
    );
  }
}

type Handler = (request: Request) => Effect.Effect<Response, Rejected>;

const player = (): DurableObjectStub<Player> => env.PLAYER.getByName("player");

const botToken = (request: Request): string =>
  Str.replace(/^Bot /u, "")(request.headers.get("authorization") ?? "");

const json = (value: unknown, init: Readonly<{ status: number }>): Response =>
  Response.json(value, init);

const authorize = (request: Request): Effect.Effect<void, Rejected> =>
  Effect.promise(() => player().isToken(botToken(request))).pipe(
    Effect.filterOrFail(
      (known) => known,
      () => Rejected.make({ status: 401, reason: "unknown bot token" }),
    ),
    Effect.asVoid,
  );

const registerToken = Effect.fn("three-twelve.registerToken")(function* registerToken(
  request: Request,
) {
  const token = botToken(request);
  const application = yield* ownedApplication(token);
  yield* Effect.promise(() => player().setToken(token));
  return json({ invite: inviteUrl(application.id) }, { status: 200 });
});

const storeAudio: Handler = (request) =>
  Effect.promise(() =>
    env.AUDIO.put(AUDIO_KEY, request.body, { httpMetadata: { contentType: "audio/ogg" } }),
  ).pipe(Effect.as(json({ stored: AUDIO_KEY }, { status: 200 })));

const playSoon = Effect.fn("three-twelve.playSoon")(function* playSoon() {
  const now = yield* DateTime.now;
  const startAt = DateTime.toEpochMillis(DateTime.add(now, ARM_LEAD));
  yield* Effect.promise(() => player().arm(startAt));
  return json({ startAt }, { status: 202 });
});

const status = Effect.promise(() => player().lastRun()).pipe(
  Effect.map((last) => json({ lastRun: last }, { status: 200 })),
);

const authorized: Readonly<Record<string, Handler>> = {
  "PUT /audio": storeAudio,
  "POST /play": () => playSoon(),
  "GET /status": () => status,
};

const route = Effect.fn("three-twelve.route")(function* route(request: Request) {
  const path = Str.replace(BASE_PATH, "")(new URL(request.url).pathname);
  const action = `${request.method} ${path}`;
  if (action === "PUT /token") {
    return yield* registerToken(request);
  }
  const handler = yield* Effect.fromOption(Option.fromUndefinedOr(authorized[action]), () =>
    Rejected.make({ status: 404, reason: `no route for ${action}` }),
  );
  yield* authorize(request);
  return yield* handler(request);
});

const respond = Effect.fn("three-twelve.respond")(function* respond(request: Request) {
  return yield* route(request).pipe(
    Effect.catchTag("Rejected", (rejected) =>
      Effect.logWarning("three-twelve.rejected").pipe(
        Effect.annotateLogs({ status: rejected.status, reason: rejected.reason }),
        Effect.as(json({ error: rejected.reason }, { status: rejected.status })),
      ),
    ),
  );
});

const schedule = Effect.fn("three-twelve.schedule")(function* schedule() {
  const now = yield* DateTime.now;
  const startAt = nextPlayAt(now);
  yield* Effect.promise(() => player().arm(startAt));
  yield* Effect.logInfo("three-twelve.armed").pipe(Effect.annotateLogs({ startAt }));
});

const worker = {
  fetch: (request: Request): Promise<Response> => runLogged(respond(request)),
  scheduled: (): Promise<void> => runLogged(schedule()),
};

export { Player };
export default worker;
