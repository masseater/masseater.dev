import { ACCESS_SITES } from "@masseater.dev/repositories/access-sites";
import { Schema } from "effect";

const Site = Schema.Literals(ACCESS_SITES);

const AccessTokenInput = Schema.Struct({
  site: Site.annotate({ description: "トークンを受け取るサイトのホスト名" }),
});

const SiteToken = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("ok"),
    site: Site,
    accessToken: Schema.String,
    expiresAt: Schema.String,
  }),
  Schema.Struct({ status: Schema.Literal("login"), site: Site, loginUrl: Schema.String }),
]);

export { AccessTokenInput, SiteToken };
