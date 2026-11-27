import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Context } from "effect";

import { authRelations } from "#/shared/auth/index.ts";

export type WatashiRelations = typeof authRelations;

export class Database extends Context.Service<Database, DrizzleD1Database<WatashiRelations>>()(
  "watashi-mcp/shared/db/client.server/Database",
) {}

export const databaseOf = (binding: D1Database): DrizzleD1Database<WatashiRelations> =>
  drizzle(binding, { relations: authRelations });

export type Build<Built> = (db: DrizzleD1Database<WatashiRelations>) => Built;
