import type { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerActTool } from "#/features/act-in-game/index.ts";
import { registerGuestTools } from "#/features/manage-guest/index.ts";
import { registerObserveTools } from "#/features/observe-game/index.ts";
import type { Runner } from "#/shared/api/index.ts";

/** @internal */
export const registerTools =
  (run: Runner) =>
  (server: McpServer): McpServer =>
    pipe(server, registerGuestTools(run), registerObserveTools(run), registerActTool(run));
