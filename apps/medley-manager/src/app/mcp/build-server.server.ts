import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import {
  registerPartTools,
  registerPersonTools,
  registerSongAliasTools,
  registerSongTools,
  registerVideoTools,
} from "#/features/edit-catalog/index.server";
import { SITE_ORIGIN } from "#/shared/config";

import { registerReadTools } from "./read-tools.server.ts";

const SERVER_INFO = { name: "medley-manager", version: "0.0.0", websiteUrl: SITE_ORIGIN };

const buildServer = (): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerReadTools,
    registerPersonTools,
    registerSongTools,
    registerSongAliasTools,
    registerVideoTools,
    registerPartTools,
  );

export { buildServer };
