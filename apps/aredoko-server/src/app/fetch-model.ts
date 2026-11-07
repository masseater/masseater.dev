import { runMain } from "@masseater.dev/aredoko-runtime";
import { Command, Flag } from "effect/cli";

import { fetchModel } from "#shared/embedding";

import { VERSION } from "./rpc/handlers.ts";

const command = Command.make(
  "aredoko-fetch-model",
  { modelDirectory: Flag.String("model-dir") },
  ({ modelDirectory }) => fetchModel(modelDirectory),
);

runMain("aredoko-fetch-model")(Command.run(command, { version: VERSION }));
