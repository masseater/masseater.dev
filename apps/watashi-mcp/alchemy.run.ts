import { AnalyticsEngine, D1, R2 } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { authSite } from "@masseater.dev/cloudflare-account/auth-site";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import {
  CONVERSATION_UPLOAD_DATASET,
  MCP_URL,
  SITE_HOST,
  TOOL_CALL_DATASET,
} from "./src/shared/config/index.ts";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { name: `${PREFIX}db`, migrations: "./drizzle" });
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const CONVERSATIONS = yield* R2.Bucket("Conversations", { name: `${PREFIX}conversations` });
  const CONVERSATION_UPLOADS = yield* AnalyticsEngine.Dataset("ConversationUploads", {
    dataset: CONVERSATION_UPLOAD_DATASET,
  });
  return yield* authSite({
    domain: SITE_HOST,
    name: Option.some(`${PREFIX}web`),
    bindings: {
      DB,
      TOOL_CALLS,
      CONVERSATIONS,
      CONVERSATION_UPLOADS,
    },
  });
});

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const site = yield* web;
    yield* requireAppPrefix;
    return { url: site.url, mcp: MCP_URL, toolCalls: TOOL_CALL_DATASET };
  }),
);
