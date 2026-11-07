import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { SITE_ORIGIN } from "#/shared/config";

import { registerPartTools } from "./part-tools.server";
import { registerPersonTools } from "./person-tools.server";
import { registerReadTools } from "./read-tools.server";
import { registerSongAliasTools } from "./song-alias-tools.server";
import { registerSongTools } from "./song-tools.server";
import { registerVideoTools } from "./video-tools.server";

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
