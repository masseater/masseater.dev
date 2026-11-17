import { NodeHttpServer, NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, Path, Record as Rec, Stream } from "effect";
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http";
import { ChildProcess } from "effect/process";

import { CI_TOKEN, NAMESPACE } from "#/app/token.test.support.ts";

import { routed } from "./routes.ts";

const TASK = "write";
const OUTPUT = "out.txt";
const LOCAL_STATE = "node_modules";
const TOKEN_PATH = "/token";

const SCRIPT = "write.mjs";

const FILES = {
  "package.json": `{ "name": "${NAMESPACE}", "private": true, "type": "module" }\n`,
  "vite.config.ts": `export default { run: { tasks: { ${TASK}: { command: "node ${SCRIPT}", cache: { input: ["${SCRIPT}"], output: ["${OUTPUT}"] } } } } };\n`,
  [SCRIPT]: `import { writeFileSync } from "node:fs";\nwriteFileSync("${OUTPUT}", String(process.hrtime.bigint()));\n`,
} as const;

/** @internal */
export interface TaskRun {
  readonly status: number;
  readonly output: string;
}

const bridged = Effect.gen(function* bridged() {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const web = yield* HttpServerRequest.toWeb(request);
  const answer = yield* routed(web);
  return HttpServerResponse.fromWeb(answer);
});

const minted = Effect.succeed(HttpServerResponse.jsonUnsafe({ value: CI_TOKEN }));

const routes = HttpRouter.serve(
  Layer.mergeAll(
    HttpRouter.add("GET", TOKEN_PATH, minted),
    HttpRouter.add("*", "/projects/*", bridged),
  ),
  { disableLogger: true, disableListenLog: true },
);

/** @internal */
export const ClientLayer = routes.pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provideMerge(NodeServices.layer),
);

/** @internal */
export const fixtureProject = Effect.gen(function* fixtureProject() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped();
  yield* Effect.forEach(
    Rec.toEntries(FILES),
    ([name, text]) => fs.writeFileString(path.join(root, name), text),
    { concurrency: 1 },
  );
  return root;
});

const textOf = <Err, Req>(
  stream: Stream.Stream<Uint8Array, Err, Req>,
): Effect.Effect<string, Err, Req> => stream.pipe(Stream.decodeText(), Stream.mkString);

/** @internal */
export const runTask = Effect.fn("client.runTask")(function* runTask(
  project: string,
  mode: "read-write" | "read",
) {
  const path = yield* Path.Path;
  const origin = yield* HttpServer.addressFormattedWith(Effect.succeed);
  const bin = path.resolve(import.meta.dirname, "..", "..", "node_modules", ".bin", "vp");
  const handle = yield* ChildProcess.make(bin, ["run", TASK], {
    cwd: project,
    extendEnv: true,
    env: {
      VP_REMOTE_CACHE: mode,
      VP_REMOTE_CACHE_URL: `${origin}/projects/${NAMESPACE}`,
      ACTIONS_ID_TOKEN_REQUEST_URL: `${origin}${TOKEN_PATH}?version=1`,
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
    },
  });
  const [stdout, stderr, status] = yield* Effect.all(
    [textOf(handle.stdout), textOf(handle.stderr), handle.exitCode],
    { concurrency: "unbounded" },
  );
  const run: TaskRun = { status: Number(status), output: `${stdout}${stderr}` };
  return run;
});

/** @internal */
export const outputOf = Effect.fn("client.outputOf")(function* outputOf(project: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fs.readFileString(path.join(project, OUTPUT));
});

/** @internal */
export const forgetLocally = Effect.fn("client.forgetLocally")(function* forgetLocally(
  project: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fs.remove(path.join(project, LOCAL_STATE), { recursive: true, force: true });
  yield* fs.remove(path.join(project, OUTPUT), { force: true });
});
