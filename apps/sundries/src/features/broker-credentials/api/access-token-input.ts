import { ACCESS_SITES } from "@masseater.dev/repositories/access-sites";
import { Schema } from "effect";

const Site = Schema.Literals(ACCESS_SITES);

export const AccessTokenInput = Schema.Struct({
  site: Site.annotate({ description: "トークンを受け取るサイトのホスト名" }),
});
