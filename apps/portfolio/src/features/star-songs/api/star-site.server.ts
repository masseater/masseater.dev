import { Context } from "effect";

export type StarBindings = Readonly<{
  STARS: D1Database;
  STARS_LIMITER: Pick<RateLimit, "limit">;
  ASSETS: Readonly<{
    fetch: (input: string, init: Readonly<{ method: string }>) => Promise<Response>;
  }>;
  VISITOR_SALT: string;
}>;

export class StarSite extends Context.Service<StarSite, StarBindings>()(
  "portfolio/features/star-songs/api/star-site.server/StarSite",
) {}
