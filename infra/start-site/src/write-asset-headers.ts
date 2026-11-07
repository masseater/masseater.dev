import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { pageSlug, pageHashes } from "@masseater.dev/static-headers";
import type { PageHeaders } from "@masseater.dev/static-headers";
import { Array as Arr, Effect, FileSystem, Layer, Path, pipe } from "effect";
import { Command, Flag } from "effect/cli";

import pkg from "#package.json" with { type: "json" };

import { assetHeaders } from "./asset-headers.ts";
import { contentSecurityPolicy } from "./content-security-policy.ts";

const OUTDIR = "dist/client";
const HEADERS_FILE = "_headers";

const pagePath = (page: string): string => `/${pageSlug(page)}`;

const write = Effect.fn("build.asset-headers")(function* write(clientCompute: boolean) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem.readDirectory(OUTDIR, { recursive: true });
  const hashed = yield* pageHashes({
    entries,
    read: (page) => fileSystem.readFileString(path.join(OUTDIR, page)),
  });
  const pages: readonly PageHeaders[] = pipe(
    hashed,
    Arr.map(({ page, hashes }) => ({
      path: pagePath(page),
      headers: {
        "Content-Security-Policy": contentSecurityPolicy({ scriptHashes: hashes, clientCompute }),
      },
    })),
  );
  yield* fileSystem.writeFileString(
    path.join(OUTDIR, HEADERS_FILE),
    assetHeaders({
      documentHeaders: {
        "Content-Security-Policy": contentSecurityPolicy({ scriptHashes: [], clientCompute }),
      },
      pages,
    }),
  );
});

const command = Command.make(
  "write-asset-headers",
  { clientCompute: Flag.Boolean("client-compute").pipe(Flag.withDefault(false)) },
  ({ clientCompute }) => write(clientCompute),
);

const program = Command.run(command, { version: pkg.version });

NodeRuntime.runMain(
  Layer.build(NodeServices.layer).pipe(
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  ),
);
