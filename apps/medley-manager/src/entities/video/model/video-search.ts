import { Schema } from "effect";

import { video } from "#/shared/db";

const VideoSearch = Schema.Struct({
  keyword: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.Literals(video.kind.enumValues)),
});

type VideoFilter = typeof VideoSearch.Type;

export type { VideoFilter };
export { VideoSearch };
