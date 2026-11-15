import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { Option, String as Str } from "effect";

import { catalogRelations } from "#/entities/catalog/model/relations";

export const catalogDb = drizzle(env.DB, { relations: catalogRelations });

export const NO_ROWS = 0;

export const containing = (keyword: string): string => `%${keyword}%`;

export const keywordOf = (raw: string | undefined): Option.Option<string> =>
  Option.fromUndefinedOr(raw).pipe(
    Option.map((value) => Str.trim(value)),
    Option.filter((value) => value.length > NO_ROWS),
  );
