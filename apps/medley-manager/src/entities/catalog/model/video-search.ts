import { Schema } from "effect";

import { video } from "./video.table";

const VideoSearch = Schema.Struct({
  keyword: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.Literals(video.kind.enumValues)),
});

type VideoFilter = typeof VideoSearch.Type;

export type { VideoFilter };
export { VideoSearch };
