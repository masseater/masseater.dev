import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { API_PORT } from "#/shared/config/index.ts";

import { serveApi } from "./serve.ts";

NodeRuntime.runMain(Layer.launch(serveApi(API_PORT)));
