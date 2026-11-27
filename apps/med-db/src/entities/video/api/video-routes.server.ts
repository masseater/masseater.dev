import { Schema } from "effect";

import { VideoSearch } from "#/entities/video/model/video-search.ts";
import { createRouter, IdParams, respondFound, respond } from "#/shared/api/index.server.ts";

import { getVideo } from "./video.server.ts";
import { listVideos } from "./videos.server.ts";

export const videoRoutes = createRouter("/videos")
  .get("/", ({ query, request }) => respond(request)(listVideos(query)), {
    query: Schema.toStandardSchemaV1(VideoSearch),
  })
  .get("/:id", ({ params, request }) => respondFound(request)(getVideo(params.id)), {
    params: IdParams,
  });
