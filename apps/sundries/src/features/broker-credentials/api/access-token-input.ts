import { ACCESS_SITES } from "@masseater.dev/repositories/access-sites";
import { Schema } from "effect";

const Site = Schema.Literals(ACCESS_SITES);

export const AccessTokenInput = Schema.Struct({
  site: Site.annotate({
    description:
      "Host name. Send the token as Authorization: Bearer and call again after expiresAt. If status is login, ask the owner to open loginUrl",
  }),
});
