#!/usr/bin/env node
import { runMainWith } from "@masseater.dev/node-main";
import { Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { Digest } from "effect/crypto";

import { withCuda } from "#/features/fetch-cuda/index.ts";

const AT_LEAST_ONE = 1;

const command = Command.make(
  "with-cuda",
  {
    version: Flag.String("version"),
    computeCap: Flag.String("compute-cap"),
    runtime: Flag.String("runtime").pipe(Flag.optional),
    command: Argument.String("command").pipe(Argument.atLeast(AT_LEAST_ONE)),
  },
  (options) => withCuda(options).pipe(Effect.asVoid),
);

runMainWith({ serviceName: "with-cuda", services: Digest.layerWebCrypto })(
  Command.run(command, { version: "0.0.0" }),
);
