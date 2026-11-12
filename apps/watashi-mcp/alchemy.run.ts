import { AnalyticsEngine, D1, R2, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { authSite } from "@masseater.dev/cloudflare-account/auth-site";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import type { TranslatorRpc } from "@masseater.dev/plamo-translate-protocol";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import {
  CONVERSATION_UPLOAD_DATASET,
  MCP_URL,
  SITE_HOST,
  TOOL_CALL_DATASET,
  TRAIT_CRON,
} from "./src/shared/config/index.ts";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { name: `${PREFIX}db`, migrations: "./drizzle" });
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const CONVERSATIONS = yield* R2.Bucket("Conversations", { name: `${PREFIX}conversations` });
  const CONVERSATION_UPLOADS = yield* AnalyticsEngine.Dataset("ConversationUploads", {
    dataset: CONVERSATION_UPLOAD_DATASET,
  });
  const translate = yield* Workers.Worker.ref("Translate", {
    stack: "masseater-dev-plamo-translate",
    stage: "prod",
  });
  yield* Workers.Worker("TraitBuilder", {
    name: `${PREFIX}trait-builder`,
    main: "./src/features/mcp/api/trait-builder.worker.ts",
    logpush: true,
    crons: [TRAIT_CRON],
    env: {
      DB,
      CONVERSATIONS,
      AI: Workers.AI(),
      TRAIT_BUILDER: Workers.DurableObject("TraitBuilder"),
      TRANSLATOR: Workers.WorkerEntrypoint<TranslatorRpc>(translate, "Translator"),
    },
  });
  return yield* authSite({
    domain: SITE_HOST,
    name: Option.some(`${PREFIX}web`),
    bindings: {
      DB,
      TOOL_CALLS,
      CONVERSATIONS,
      CONVERSATION_UPLOADS,
      AI: Workers.AI(),
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
