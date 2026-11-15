import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { API_PORT } from "#config";

import { serveApi } from "./serve.ts";

NodeRuntime.runMain(Layer.launch(serveApi(API_PORT)));
