import { runner } from "@r_masseater/workers-tracing/effect";
import { Logger } from "effect";

import { routed } from "./routes.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const worker = {
  fetch: (request: Request): Promise<Response> => runLogged(routed(request)),
} satisfies ExportedHandler;

export default worker;
