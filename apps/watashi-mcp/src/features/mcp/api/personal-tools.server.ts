import type { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerAnalyticsTools } from "./analytics-tools.server";
import type { Caller } from "./caller";
import { registerConversationTools } from "./conversation-tools.server";
import { registerSlideTools } from "./slides-tools.server";
import { registerSloppediaTools } from "./sloppedia-tools.server";
import { registerTokenTools } from "./token-tools.server";

const registerPersonalTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(
      server,
      registerSloppediaTools(caller),
      registerAnalyticsTools(caller),
      registerSlideTools(caller),
      registerConversationTools(caller),
      registerTokenTools(caller),
    );

export { registerPersonalTools };
