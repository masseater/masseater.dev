import { Schema } from "effect";

import { video } from "./video.table";

export const VideoSearch = Schema.Struct({
  keyword: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.Literals(video.kind.enumValues)),
});

export type VideoFilter = typeof VideoSearch.Type;
