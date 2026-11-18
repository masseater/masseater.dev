import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import {
  registerPartTools,
  registerPersonTools,
  registerSongAliasTools,
  registerSongTools,
  registerVideoTools,
} from "#/features/edit-catalog/index.server.ts";
import { registerReadTools } from "#/features/search-catalog/index.server.ts";
import { SITE_ORIGIN } from "#/shared/config/index.ts";

const SERVER_INFO = { name: "med-db", version: "0.0.0", websiteUrl: SITE_ORIGIN };

export const buildServer = (): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerReadTools,
    registerPersonTools,
    registerSongTools,
    registerSongAliasTools,
    registerVideoTools,
    registerPartTools,
  );
