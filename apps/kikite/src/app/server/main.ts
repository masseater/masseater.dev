import { runMain } from "@effect/platform-node/NodeRuntime";
import { Layer } from "effect";

import { API_PORT } from "#/shared/config/index.ts";

import { serveApi } from "./serve.ts";

runMain(serveApi(API_PORT).pipe(Layer.launch));
