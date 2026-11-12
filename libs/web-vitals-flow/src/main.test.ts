import { NodeHttpServer, NodeServices } from "@effect/platform-node";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import type { ReceivedSpan } from "@r_masseater/vitest-otlp";
import type { PlatformError } from "effect";
import {
  Array,
  Context,
  Effect,
  FileSystem,
  Layer,
  ManagedRuntime,
  Option,
  Path,
  Stream,
  pipe,
} from "effect";
import { HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { afterAll, expect, test } from "vite-plus/test";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const HTTP_NOT_FOUND = 404;
const EXIT_CODES: Readonly<Record<string, number>> = {
  STATUS_CODE_UNSET: 0,
  STATUS_CODE_OK: 0,
  STATUS_CODE_ERROR: 1,
};

const PAGES: Readonly<Record<string, string>> = {
  "/": pipe(
    [
      '<!doctype html><html lang="en"><title>home</title><h1>Home</h1>',
      '<details><summary>menu</summary><a href="/next">next</a><a href="/folded">folded</a></details>',
      '<a href="/next">next</a>',
      '<a href="/invisible" style="visibility: hidden">invisible</a>',
      "</html>",
    ],
    Array.join(""),
  ),
  "/next": '<!doctype html><html lang="en"><title>next</title><h1>Next</h1></html>',
};

const page = HttpServerRequest.HttpServerRequest.pipe(
  Effect.map((request) =>
    Option.match(Option.fromNullishOr(PAGES[request.url]), {
      onSome: (html) => HttpServerResponse.html(html),
      onNone: () => HttpServerResponse.empty({ status: HTTP_NOT_FOUND }),
    }),
  ),
);

const serveSite = Layer.build(NodeHttpServer.layerTest).pipe(
  Effect.orDie,
  Effect.map(Context.get(HttpServer.HttpServer)),
  Effect.tap((server) => server.serve(page)),
  Effect.map((server) => HttpServer.formatAddress(server.address)),
);

const measure = (
  origin: string,
  reportDirectory: string,
): Effect.Effect<
  { readonly exitCode: ChildProcessSpawner.ExitCode; readonly output: string },
  PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner | Path.Path
> =>
  Effect.gen(function* spawn() {
    const path = yield* Path.Path;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(
      ChildProcess.make(
        process.execPath,
        [
          path.join(import.meta.dirname, "main.ts"),
          "--runs",
          "1",
          "--report-dir",
          reportDirectory,
          "--chrome-flags=--no-sandbox",
          `${origin}/`,
        ],
        { extendEnv: true, stderr: "inherit" },
      ),
    );
    return yield* Effect.all(
      {
        output: handle.stdout.pipe(Stream.decodeText, Stream.mkString),
        exitCode: handle.exitCode,
      },
      { concurrency: "unbounded" },
    );
  }).pipe(Effect.scoped);

const expectSkippedLinksListed = (output: string, origin: string): void => {
  expect(output).toContain(
    pipe(
      [
        "Not measured: no clickable link",
        `  ${origin}/ -> ${origin}/folded`,
        `  ${origin}/ -> ${origin}/invisible`,
      ],
      Array.join("\n"),
    ),
  );
  expect(output).toContain(`\n${origin}/ -> ${origin}/next\n`);
};

const expectReportsWritten = (
  reportDirectory: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* reports() {
    const fileSystem = yield* FileSystem.FileSystem;
    const files = yield* fileSystem.readDirectory(reportDirectory);
    expect(files).toStrictEqual(expect.arrayContaining(["flow-1.html", "flow-1.json"]));
  });

const expectSpansTraced = (spans: readonly ReceivedSpan[], origin: string): void => {
  expect(
    pipe(
      spans,
      Array.map((span) => span.name),
    ),
  ).toStrictEqual(
    expect.arrayContaining([
      "web-vitals.flow",
      "web-vitals.load",
      "web-vitals.transition",
      "web-vitals.audit",
      "web-vitals.judge",
    ]),
  );
  expect(
    pipe(
      spans,
      Array.filter((span) => span.name === "web-vitals.transition"),
      Array.map((span) => [span.attributes["to"], span.attributes["web_vitals.link.clickable"]]),
    ),
  ).toStrictEqual(
    expect.arrayContaining([
      [`${origin}/next`, true],
      [`${origin}/folded`, false],
      [`${origin}/invisible`, false],
    ]),
  );
};

test("a load and a link transition are measured, reported and traced, and links that cannot be clicked are listed instead", () =>
  Effect.gen(function* measured() {
    const fileSystem = yield* FileSystem.FileSystem;
    const origin = yield* serveSite;
    const reportDirectory = yield* fileSystem.makeTempDirectoryScoped();

    const { exitCode, output } = yield* measure(origin, reportDirectory);
    expectSkippedLinksListed(output, origin);
    yield* expectReportsWritten(reportDirectory);
    const spans = yield* waitForSpans({
      where: (span) => span.resource["service.name"] === "web-vitals-flow",
      count: 7,
    });
    expectSpansTraced(spans, origin);
    const judge = yield* Array.findFirst(spans, (span) => span.name === "web-vitals.judge").pipe(
      Effect.fromOption,
    );
    expect(exitCode).toBe(EXIT_CODES[judge.status.code ?? "STATUS_CODE_UNSET"]);
  }).pipe(Effect.scoped, services.runPromise));
