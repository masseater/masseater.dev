import { Schema } from "effect";

import { video } from "#/shared/db/index.ts";
import { Keyword } from "#/shared/lib/text-search.ts";

export const VideoSearch = Schema.Struct({
  keyword: Schema.optional(Keyword),
  kind: Schema.optional(Schema.Literals(video.kind.enumValues)),
});

export type VideoFilter = typeof VideoSearch.Type;
