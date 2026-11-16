import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { MarkInputSchema, MarksSchema } from "#/shared/api/index.ts";
import type { Mark, MarkInput } from "#/shared/api/index.ts";

import { briefOf } from "./brief.ts";
import { closeDatabase, resetDatabase } from "./d1.test.support.ts";
import { serveMarks } from "./mark-routes.ts";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

const ORIGIN = "https://shirushi.test";
const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const FROM = 62;
const TO = 78.5;
const LATER = 120;

const INPUT: MarkInput = {
  song: {
    source: { site: "youtube", id: "dQw4w9WgXcQ" },
    title: "曲名",
    artist: "作者",
  },
  from: FROM,
  to: TO,
  verb: "like",
  aspects: ["bass", "rhythm"],
  words: "ベースが跳ねてる",
};

const OTHER: MarkInput = {
  ...INPUT,
  song: { source: { site: "niconico", id: "sm9" }, title: "別の曲", artist: "" },
  from: LATER,
  to: LATER,
  verb: "dislike",
  aspects: [],
  words: "",
};

const encodeInput = Schema.encodeEffect(Schema.fromJsonString(MarkInputSchema));
const decodeMarks = Schema.decodeUnknownEffect(Schema.fromJsonString(MarksSchema));

type Call = Readonly<{ path: string; method: string; body: string }>;

const serve = ({ path, method, body }: Call): Effect.Effect<Response> =>
  Effect.promise(() => {
    if (method === "GET" || method === "DELETE") {
      return serveMarks(new Request(`${ORIGIN}${path}`, { method }));
    }
    return serveMarks(new Request(`${ORIGIN}${path}`, { method, body }));
  });

const get = (path: string): Effect.Effect<Response> => serve({ path, method: "GET", body: "" });

const post = (input: MarkInput): Effect.Effect<Response, Schema.SchemaError> =>
  encodeInput(input).pipe(
    Effect.flatMap((body) => serve({ path: "/api/marks", method: "POST", body })),
  );

const listed = (path: string): Effect.Effect<readonly Mark[], Schema.SchemaError> =>
  get(path).pipe(
    Effect.flatMap((response) => Effect.promise(() => response.text())),
    Effect.flatMap(decodeMarks),
  );

const newest = (path: string): Effect.Effect<Mark, Schema.SchemaError | Error> =>
  listed(path).pipe(Effect.flatMap((marks) => Effect.fromOption(Arr.head(marks))));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

describe("storing marks", () => {
  it.effect("lists the newest first", () =>
    Effect.gen(function* stored() {
      const created = yield* post(INPUT);
      expect(created.status).toBe(OK);
      yield* post(OTHER);
      const marks = yield* listed("/api/marks");
      expect(
        pipe(
          marks,
          Arr.map((mark) => mark.song.title),
        ),
      ).toStrictEqual(["別の曲", "曲名"]);
      expect(Arr.last(marks).pipe(Option.getOrThrow)).toMatchObject(INPUT);
    }),
  );

  it.effect("filters by song link", () =>
    Effect.gen(function* filtered() {
      yield* post(INPUT);
      yield* post(OTHER);
      const url = encodeURIComponent("https://www.nicovideo.jp/watch/sm9");
      const marks = yield* listed(`/api/marks?url=${url}`);
      expect(
        pipe(
          marks,
          Arr.map((mark) => mark.song.source.id),
        ),
      ).toStrictEqual(["sm9"]);
    }),
  );

  it.effect("removes a mark once", () =>
    Effect.gen(function* removed() {
      yield* post(INPUT);
      const { id } = yield* newest("/api/marks");
      const remove = { path: `/api/marks/${id}`, method: "DELETE", body: "" };
      const first = yield* serve(remove);
      const second = yield* serve(remove);
      expect([first.status, second.status]).toStrictEqual([OK, NOT_FOUND]);
    }),
  );
});

describe("rejecting requests", () => {
  it.effect("rejects a malformed mark", () =>
    Effect.gen(function* rejected() {
      const response = yield* serve({ path: "/api/marks", method: "POST", body: "{}" });
      expect(response.status).toBe(BAD_REQUEST);
    }),
  );

  it.effect("rejects a song lookup without a known link", () =>
    Effect.gen(function* unknown() {
      const response = yield* get("/api/song?url=https%3A%2F%2Fexample.com");
      expect(response.status).toBe(BAD_REQUEST);
    }),
  );
});

describe("brief", () => {
  it.effect("writes what the composing AI reads", () =>
    Effect.gen(function* brief() {
      yield* post(INPUT);
      const mark = yield* newest("/api/marks");
      expect(briefOf(mark)).toBe(
        pipe(
          [
            "# 好き  曲名 / 作者  1:02–1:18",
            "リンク  https://youtu.be/dQw4w9WgXcQ?t=62",
            "本人  ベースが跳ねてる",
            "どこが  ベース  リズム",
          ],
          Arr.join("\n"),
        ),
      );
    }),
  );
});
