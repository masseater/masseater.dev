import { runMain } from "@masseater.dev/node-main";
import { Command, Flag } from "effect/cli";

import { VERSION } from "#/app/rpc/handlers.ts";
import { fetchModel } from "#/shared/embedding/index.ts";

const command = Command.make(
  "aredoko-fetch-model",
  { modelDirectory: Flag.String("model-dir") },
  ({ modelDirectory }) => fetchModel(modelDirectory),
);

runMain("aredoko-fetch-model")(Command.run(command, { version: VERSION }));
