import { runner } from "@r_masseater/workers-tracing/effect";
import { Clock, Effect, Layer, Logger, Option, Schema, pipe } from "effect";
import { SecureRandom } from "effect/crypto";

import { MARKS_PATH, MarkInputSchema, MarksSchema, SONG_PATH, SongSchema } from "#protocol";
import type { Mark } from "#protocol";
import { sourceOf } from "#source";

import { listMarks, removeMark, storeMark } from "./mark-store.ts";
import { songOf } from "./song-info.ts";
import type { StoreFailed } from "./store-failed.ts";

type Routed = Effect.Effect<Response, Schema.SchemaError | StoreFailed, SecureRandom.SecureRandom>;

const STATUS = { badRequest: 400, missing: 404, broken: 500 } as const;

const ONE_MARK = /^\/api\/marks\/(?<id>[^/]+)$/u;

const decodeInput = Schema.decodeUnknownEffect(Schema.fromJsonString(MarkInputSchema));
const encodeMarks = Schema.encodeUnknownEffect(MarksSchema);
const encodeSong = Schema.encodeUnknownEffect(SongSchema);

const failure = (code: number): Response => Response.json({ status: code }, { status: code });

const rejected = (): Effect.Effect<Response> => Effect.succeed(failure(STATUS.badRequest));

const storeFailed = ({ message }: Readonly<{ message: string }>): Effect.Effect<Response> =>
  Effect.logError("shirushi.markStoreFailed", { message }).pipe(Effect.as(failure(STATUS.broken)));

const linkedSource = (link: string | null): Option.Option<Mark["song"]["source"]> =>
  pipe(Option.fromNullishOr(link), Option.flatMap(sourceOf));

const created = Effect.fn("shirushi.createMark")(function* created(request: Request) {
  const body = yield* Effect.promise(() => request.text());
  const input = yield* decodeInput(body);
  const random = yield* SecureRandom.SecureRandom;
  const id = yield* random.uuidV7();
  const at = yield* Clock.currentTimeMillis;
  const mark: Mark = { ...input, id, at };
  yield* storeMark(mark);
  return Response.json({ id, at });
});

const removedOne = (id: string): Routed =>
  removeMark(id).pipe(
    Effect.map((found) => {
      if (found) {
        return Response.json({ id });
      }
      return failure(STATUS.missing);
    }),
  );

const songAt = (link: string | null): Routed =>
  Option.match(linkedSource(link), {
    onNone: rejected,
    onSome: (source) =>
      songOf(source).pipe(
        Effect.flatMap(encodeSong),
        Effect.map((song) => Response.json(song)),
      ),
  });

const markId = (pathname: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ONE_MARK.exec(pathname)),
    Option.flatMap((match) => Option.fromUndefinedOr(match.groups)),
    Option.flatMap((groups) => Option.fromUndefinedOr(groups["id"])),
  );

const answered = (request: Request): Routed => {
  const url = new URL(request.url);
  const route = `${request.method} ${url.pathname}`;
  const link = url.searchParams.get("url");
  if (route === `GET ${MARKS_PATH}`) {
    return listMarks(linkedSource(link)).pipe(
      Effect.flatMap(encodeMarks),
      Effect.map((marks) => Response.json(marks)),
    );
  }
  if (route === `POST ${MARKS_PATH}`) {
    return created(request);
  }
  if (route === `GET ${SONG_PATH}`) {
    return songAt(link);
  }
  return Option.match(
    Option.filter(markId(url.pathname), () => request.method === "DELETE"),
    { onNone: () => Effect.succeed(failure(STATUS.missing)), onSome: removedOne },
  );
};

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const run = runner(Layer.mergeAll(logger, SecureRandom.layerWebCrypto));

export const serveMarks = (request: Request): Promise<Response> =>
  run(
    answered(request).pipe(Effect.catchTags({ SchemaError: rejected, StoreFailed: storeFailed })),
  );
