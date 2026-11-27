import { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
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
import type { CatalogRelations } from "#/shared/db/index.server.ts";

const SERVER_INFO = { name: "med-db", version: "0.0.0", websiteUrl: SITE_ORIGIN };

export const buildServer = (db: DrizzleD1Database<CatalogRelations>): McpServer =>
  pipe(
    new McpServer(SERVER_INFO),
    registerReadTools(db),
    registerPersonTools(db),
    registerSongTools(db),
    registerSongAliasTools(db),
    registerVideoTools(db),
    registerPartTools(db),
  );
