import { fileURLToPath } from "node:url";

import { receivedLogs, waitForLogs, waitForSpans } from "@r_masseater/vitest-otlp";
import type { ReceivedLogRecord, ReceivedSpan } from "@r_masseater/vitest-otlp";
import { tailWorker } from "@r_masseater/vitest-otlp/workers";
import { Array, Effect, Option, Predicate, String, pipe } from "effect";
import type { Cause } from "effect";
import { Miniflare } from "miniflare";
import { build } from "vite-plus";
import { expect, test } from "vite-plus/test";

import { COMPATIBILITY_DATE } from "./compatibility.ts";

const FIXTURE = fileURLToPath(import.meta.resolve("./fixture/fixture.worker.ts"));
const TEMPORARY_REDIRECT = 307;
const NOT_FOUND = 404;
const WORKER_CONDITIONS = ["workerd", "worker", "browser", "import", "default"];

const bundle = Effect.promise(() =>
  build({
    configFile: false,
    logLevel: "silent",
    resolve: { conditions: WORKER_CONDITIONS },
    ssr: { noExternal: true, target: "webworker", resolve: { conditions: WORKER_CONDITIONS } },
    build: {
      write: false,
      minify: false,
      target: "esnext",
      ssr: FIXTURE,
      rolldownOptions: { external: [/^cloudflare:/u, /^node:/u], output: { format: "es" } },
    },
  }),
).pipe(
  Effect.map((output) =>
    pipe(
      Array.head(Array.ensure(output)),
      Option.filter(Predicate.hasProperty("output")),
      Option.map((result) => result.output),
      Option.filter(Predicate.isIterable),
      Option.flatMap((chunks) => Array.head(Array.fromIterable(chunks))),
      Option.filter(Predicate.hasProperty("code")),
      Option.map((chunk) => chunk.code),
      Option.filter(Predicate.isString),
    ),
  ),
  Effect.flatMap(Effect.fromOption),
);

const withMiniflare = Effect.acquireRelease(
  Effect.all([bundle, tailWorker({ serviceName: "app" })]).pipe(
    Effect.map(
      ([script, tail]) =>
        new Miniflare({
          workers: [
            {
              name: "app",
              modules: [{ type: "ESModule", path: "worker.mjs", contents: script }],
              compatibilityDate: COMPATIBILITY_DATE,
              kvNamespaces: ["CACHE"],
              streamingTails: [tail.name],
            },
            tail,
          ],
        }),
    ),
  ),
  (miniflare) => Effect.promise(() => miniflare.dispose()),
);

const statusOf = (miniflare: Miniflare, path: string): Effect.Effect<number> =>
  Effect.promise(() =>
    miniflare.dispatchFetch(`http://localhost${path}`, { redirect: "manual" }),
  ).pipe(Effect.map((response) => response.status));

const failureLogs = (traceId: string): Effect.Effect<readonly ReceivedLogRecord[], WaitError> =>
  receivedLogs.pipe(
    Effect.map(
      Array.filter(
        (record) =>
          record.traceId === traceId &&
          Predicate.isString(record.body) &&
          pipe(record.body, String.includes("request failed")),
      ),
    ),
  );

const get = (miniflare: Miniflare, path: string): Effect.Effect<string> =>
  Effect.promise(() => miniflare.dispatchFetch(`http://localhost${path}`)).pipe(
    Effect.flatMap((response) => Effect.promise(() => response.text())),
  );

type WaitError = Effect.Error<ReturnType<typeof waitForSpans>> | Cause.NoSuchElementError;

const oneSpan = (where: (span: ReceivedSpan) => boolean): Effect.Effect<ReceivedSpan, WaitError> =>
  waitForSpans({ where }).pipe(Effect.flatMap((spans) => Effect.fromOption(Array.head(spans))));

interface RequestTree {
  readonly root: ReceivedSpan;
  readonly put: ReceivedSpan;
  readonly kv: ReceivedSpan;
  readonly log: readonly ReceivedLogRecord[];
}

const requestTree = (key: string): Effect.Effect<RequestTree, WaitError> =>
  Effect.gen(function* tree() {
    const save = yield* oneSpan(
      (span) => span.name === "greeting.save" && span.attributes["greeting.key"] === key,
    );
    const root = yield* oneSpan(
      (span) => span.name === "fetch" && span.spanId === save.parentSpanId,
    );
    const put = yield* oneSpan(
      (span) => span.name === "greeting.put" && span.parentSpanId === save.spanId,
    );
    const kv = yield* oneSpan((span) => span.name === "kv_put" && span.parentSpanId === put.spanId);
    const log = yield* waitForLogs({
      where: (record) =>
        Predicate.isString(record.body) && pipe(record.body, String.includes(`cached ${key}`)),
    });
    return { root, put, kv, log };
  });

test("Effect spans nest under their own request and wrap the platform's spans", () =>
  Effect.gen(function* effectSpans() {
    const miniflare = yield* withMiniflare;
    yield* Effect.all([get(miniflare, "/first"), get(miniflare, "/second")], { concurrency: 2 });
    const trees = yield* Effect.forEach(["first", "second"], requestTree);
    expect(trees).toMatchObject([
      { root: { attributes: { "url.full": "http://localhost/first" } } },
      { root: { attributes: { "url.full": "http://localhost/second" } } },
    ]);
    for (const { root, put, kv, log } of trees) {
      expect(kv.traceId).toBe(root.traceId);
      expect(log).toMatchObject([{ spanId: put.spanId, traceId: root.traceId }]);
    }
  }).pipe(Effect.scoped, Effect.runPromise));

test("a failed Effect marks its span as an error", () =>
  Effect.gen(function* failedSpan() {
    const miniflare = yield* withMiniflare;
    yield* get(miniflare, "/fail");
    const spans = yield* waitForSpans({ where: (span) => span.name === "greeting.fail" });
    expect(spans).toMatchObject([
      {
        status: { code: "STATUS_CODE_ERROR" },
        attributes: { "exception.message": "boom", "error.type": "GreetingFailed" },
      },
    ]);
  }).pipe(Effect.scoped, Effect.runPromise));

test("an Elysia request is a span named after its route", () =>
  Effect.gen(function* elysiaSpan() {
    const miniflare = yield* withMiniflare;
    yield* get(miniflare, "/items/42");
    const route = yield* oneSpan((span) => span.name === "GET /items/:id");
    expect(route.attributes).toMatchObject({
      "http.route": "/items/:id",
      "http.response.status_code": 200,
    });
    const saves = yield* waitForSpans({
      where: (span) => span.name === "greeting.save" && span.parentSpanId === route.spanId,
    });
    expect(saves).toMatchObject([{ attributes: { "greeting.key": "item-42" } }]);
  }).pipe(Effect.scoped, Effect.runPromise));

test("a compiled Elysia app, as Workers export it, is a span named after its route", () =>
  Effect.gen(function* compiledSpan() {
    const miniflare = yield* withMiniflare;
    yield* get(miniflare, "/compiled/7");
    const route = yield* oneSpan((span) => span.name === "GET /compiled/:id");
    const loads = yield* waitForSpans({
      where: (span) => span.name === "compiled.load" && span.parentSpanId === route.spanId,
    });
    expect(loads).toMatchObject([{ name: "compiled.load" }]);
  }).pipe(Effect.scoped, Effect.runPromise));

test("TanStack Start requests and server functions are spans", () =>
  Effect.gen(function* startSpans() {
    const miniflare = yield* withMiniflare;
    yield* get(miniflare, "/start");
    const request = yield* oneSpan((span) => span.name === "GET /start");
    expect(request.attributes).toMatchObject({
      "tanstack_start.handler": "router",
      "http.response.status_code": 200,
    });
    const serverFn = yield* oneSpan(
      (span) => span.name === "serverFn saveGreetingFn" && span.parentSpanId === request.spanId,
    );
    expect(serverFn.attributes).toMatchObject({
      "tanstack_start.server_fn.id": "fn-1",
      "code.file.path": "src/greeting.ts",
    });
    const saves = yield* waitForSpans({
      where: (span) => span.name === "greeting.save" && span.parentSpanId === serverFn.spanId,
    });
    expect(saves).toMatchObject([{ attributes: { "greeting.key": "server-fn" } }]);
  }).pipe(Effect.scoped, Effect.runPromise));

test("an Elysia route behind a TanStack Start route reuses the request span", () =>
  Effect.gen(function* sharedSpan() {
    const miniflare = yield* withMiniflare;
    yield* get(miniflare, "/api/items/7");
    const request = yield* oneSpan((span) => span.name === "GET /api/items/:id");
    expect(request.attributes).toMatchObject({
      "tanstack_start.handler": "router",
      "http.route": "/api/items/:id",
      "http.response.status_code": 200,
    });
    const saves = yield* waitForSpans({
      where: (span) => span.name === "greeting.save" && span.parentSpanId === request.spanId,
    });
    expect(saves).toMatchObject([{ attributes: { "greeting.key": "api-7" } }]);
  }).pipe(Effect.scoped, Effect.runPromise));

const laterRequest = (miniflare: Miniflare, key: string): ReturnType<typeof waitForLogs> =>
  get(miniflare, `/${key}`).pipe(
    Effect.andThen(
      waitForLogs({
        where: (record) =>
          Predicate.isString(record.body) && pipe(record.body, String.includes(`cached ${key}`)),
      }),
    ),
  );

const statuses = (spans: readonly ReceivedSpan[]): readonly ReceivedSpan["status"][] =>
  pipe(
    spans,
    Array.map((span) => span.status),
  );

test("a thrown redirect is the 307 answer, not a failure", () =>
  Effect.gen(function* redirected() {
    const miniflare = yield* withMiniflare;
    const status = yield* statusOf(miniflare, "/gated");
    const request = yield* oneSpan((span) => span.name === "GET /gated");
    const serverFn = yield* oneSpan((span) => span.name === "serverFn requireSignInFn");
    const check = yield* oneSpan((span) => span.name === "gate.check");
    yield* laterRequest(miniflare, "after-gate");
    const logged = yield* failureLogs(request.traceId);
    expect([status, request.attributes, serverFn.attributes]).toMatchObject([
      TEMPORARY_REDIRECT,
      { "http.response.status_code": TEMPORARY_REDIRECT },
      { "http.response.status_code": TEMPORARY_REDIRECT },
    ]);
    expect(statuses([request, serverFn, check])).toStrictEqual([{}, {}, {}]);
    expect(logged).toStrictEqual([]);
  }).pipe(Effect.scoped, Effect.runPromise));

test("a failed notFound is the 404 answer, not a failure", () =>
  Effect.gen(function* missing() {
    const miniflare = yield* withMiniflare;
    const status = yield* statusOf(miniflare, "/missing");
    const request = yield* oneSpan((span) => span.name === "GET /missing");
    const find = yield* oneSpan((span) => span.name === "entry.find");
    yield* laterRequest(miniflare, "after-missing");
    const logged = yield* failureLogs(request.traceId);
    expect(status).toBe(NOT_FOUND);
    expect(statuses([request, find])).toStrictEqual([{}, {}]);
    expect(logged).toStrictEqual([]);
  }).pipe(Effect.scoped, Effect.runPromise));

test("a thrown error is still a failure and is logged", () =>
  Effect.gen(function* broken() {
    const miniflare = yield* withMiniflare;
    yield* statusOf(miniflare, "/broken");
    const failed = yield* oneSpan((span) => span.name === "entry.break");
    yield* waitForLogs({
      where: (record) =>
        record.traceId === failed.traceId &&
        Predicate.isString(record.body) &&
        pipe(record.body, String.includes("request failed")),
    });
    expect(failed).toMatchObject({
      status: { code: "STATUS_CODE_ERROR" },
      attributes: { "exception.message": "kaput", "error.type": "TypeError" },
    });
  }).pipe(Effect.scoped, Effect.runPromise));

test("an Elysia 404 leaves its span unset", () =>
  Effect.gen(function* elysiaMissing() {
    const miniflare = yield* withMiniflare;
    const status = yield* statusOf(miniflare, "/items/a/b");
    const request = yield* oneSpan((span) => span.name === "GET /items/a/b");
    expect(status).toBe(NOT_FOUND);
    expect(request.attributes).toMatchObject({ "http.response.status_code": NOT_FOUND });
    expect(request.status).toStrictEqual({});
  }).pipe(Effect.scoped, Effect.runPromise));
