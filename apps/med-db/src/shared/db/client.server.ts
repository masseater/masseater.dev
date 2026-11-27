import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { authRelations } from "#/shared/auth/index.ts";

export const authDbOf = (binding: D1Database): DrizzleD1Database<typeof authRelations> =>
  drizzle(binding, { relations: authRelations });
