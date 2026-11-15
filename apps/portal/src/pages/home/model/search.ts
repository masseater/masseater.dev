import { Schema } from "effect";

import { ACTIVITY_KINDS } from "./activity";

export const HomeSearch = Schema.Struct({
  kind: Schema.optionalKey(Schema.Literals(ACTIVITY_KINDS)),
});

export type HomeSearchValue = typeof HomeSearch.Type;
