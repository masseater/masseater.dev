import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import {
  registerPartTools,
  registerPersonTools,
  registerSongAliasTools,
  registerSongTools,
  registerVideoTools,
} from "#/features/edit-catalog/index.server.ts";
import { SITE_ORIGIN } from "#/shared/config/index.ts";

import { registerReadTools } from "./read-tools.server.ts";

const SERVER_INFO = { name: "medley-manager", version: "0.0.0", websiteUrl: SITE_ORIGIN };

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
