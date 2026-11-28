import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { registerBrokerTools } from "#/features/broker-credentials/index.ts";
import type { BrokerBindings } from "#/features/broker-credentials/index.ts";
import { registerDecideTools } from "#/features/decide-choices/index.ts";
import type { DecideBindings } from "#/features/decide-choices/index.ts";
import { registerSashiTools } from "#/features/edit-sashi/index.ts";
import type { SashiBindings } from "#/features/edit-sashi/index.ts";
import { registerSloppediaTools } from "#/features/edit-sloppedia/index.ts";
import type { SloppediaBindings } from "#/features/edit-sloppedia/index.ts";
import { registerAnalyticsTools } from "#/features/query-analytics/index.ts";
import type { AnalyticsBindings } from "#/features/query-analytics/index.ts";
import { registerClaudeRequestTools } from "#/features/request-claude/index.ts";
import type { RequestBindings } from "#/features/request-claude/index.ts";
import { registerSlideTools } from "#/features/search-slides/index.ts";
import type { SlideBindings } from "#/features/search-slides/index.ts";
import { SERVER_NAME } from "#/shared/config/index.ts";

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

export const serverOf = (): McpServer => new McpServer(SERVER_INFO);

export type ToolBindings = AnalyticsBindings &
  BrokerBindings &
  DecideBindings &
  RequestBindings &
  SashiBindings &
  SlideBindings &
  SloppediaBindings;

export const registerTools = (env: ToolBindings): McpServer =>
  pipe(
    serverOf(),
    registerSloppediaTools(env),
    registerSashiTools(env),
    registerAnalyticsTools(env),
    registerSlideTools(env),
    registerBrokerTools(env),
    registerClaudeRequestTools(env),
    registerDecideTools(env),
  );
