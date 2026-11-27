import { Context, DateTime, Effect, Option, String as Str } from "effect";

import { nextPlayAt } from "#/features/perform-alarm/index.ts";
import { inviteUrl, ownedApplication, Rejected } from "#/shared/api/index.ts";
import { ARM_LEAD, AUDIO_KEY, BASE_PATH } from "#/shared/config/index.ts";

export type PlayerRpc = Readonly<{
  setToken: (token: string) => Promise<void>;
  isToken: (token: string) => Promise<boolean>;
  arm: (startAt: number) => Promise<void>;
  lastRun: () => Promise<unknown>;
}>;

export type AudioStore = Readonly<{
  put: (
    key: string,
    body: ReadableStream | null,
    options: Readonly<{ httpMetadata: Readonly<{ contentType: string }> }>,
  ) => Promise<unknown>;
}>;

export type Limiter = Readonly<{
  limit: (options: Readonly<{ key: string }>) => Promise<Readonly<{ success: boolean }>>;
}>;

type StageBindings = Readonly<{ player: PlayerRpc; audio: AudioStore; limiter: Limiter }>;

export class Stage extends Context.Service<Stage, StageBindings>()(
  "three-twelve/app/routes/Stage",
) {}

type Handler = (request: Request) => Effect.Effect<Response, Rejected, Stage>;

const onPlayer = Effect.fn("three-twelve.onPlayer")(function* onPlayer<Found>(
  call: (player: PlayerRpc) => Promise<Found>,
) {
  const { player } = yield* Stage;
  return yield* Effect.promise(() => call(player));
});

const botToken = (request: Request): string =>
  Str.replace(/^Bot /u, "")(request.headers.get("authorization") ?? "");

const authorize = (request: Request): Effect.Effect<void, Rejected, Stage> =>
  onPlayer((player) => player.isToken(botToken(request))).pipe(
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
  yield* onPlayer((player) => player.setToken(token));
  return Response.json({ invite: inviteUrl(application.id) }, { status: 200 });
});

const storeAudio: Handler = Effect.fn("three-twelve.storeAudio")(function* storeAudio(
  request: Request,
) {
  const { audio } = yield* Stage;
  yield* Effect.promise(() =>
    audio.put(AUDIO_KEY, request.body, { httpMetadata: { contentType: "audio/ogg" } }),
  );
  return Response.json({ stored: AUDIO_KEY }, { status: 200 });
});

const playSoon = Effect.fn("three-twelve.playSoon")(function* playSoon() {
  const now = yield* DateTime.now;
  const startAt = DateTime.toEpochMillis(DateTime.add(now, ARM_LEAD));
  yield* onPlayer((player) => player.arm(startAt));
  return Response.json({ startAt }, { status: 202 });
});

const status = onPlayer((player) => player.lastRun()).pipe(
  Effect.map((last) => Response.json({ lastRun: last }, { status: 200 })),
);

const authorized: Readonly<Record<string, Handler>> = {
  "PUT /audio": storeAudio,
  "POST /play": () => playSoon(),
  "GET /status": () => status,
};

const UNKNOWN_CALLER = "unknown";

const flooded = Effect.fn("three-twelve.flooded")(function* flooded(request: Request) {
  const { limiter } = yield* Stage;
  const outcome = yield* Effect.promise(() =>
    limiter.limit({ key: request.headers.get("cf-connecting-ip") ?? UNKNOWN_CALLER }),
  );
  return !outcome.success;
});

const route = Effect.fn("three-twelve.route")(function* route(request: Request) {
  const over = yield* flooded(request);
  if (over) {
    return yield* Rejected.make({ status: 429, reason: "too many requests" });
  }
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

export const respond = Effect.fn("three-twelve.respond")(function* respond(request: Request) {
  return yield* route(request).pipe(
    Effect.catchTag("Rejected", (rejected) =>
      Effect.logWarning("three-twelve.rejected").pipe(
        Effect.annotateLogs({ status: rejected.status, reason: rejected.reason }),
        Effect.as(Response.json({ error: rejected.reason }, { status: rejected.status })),
      ),
    ),
  );
});

export const schedule = Effect.fn("three-twelve.schedule")(function* schedule() {
  const now = yield* DateTime.now;
  const startAt = nextPlayAt(now);
  yield* onPlayer((player) => player.arm(startAt));
  yield* Effect.logInfo("three-twelve.armed").pipe(Effect.annotateLogs({ startAt }));
});
