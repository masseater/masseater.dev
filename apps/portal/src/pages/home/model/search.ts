import { Schema } from "effect";

import { ACTIVITY_KINDS } from "./activity.ts";

export const HomeSearch = Schema.Struct({
  kind: Schema.optionalKey(Schema.Literals(ACTIVITY_KINDS)),
});
