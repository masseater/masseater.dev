import { Schema } from "effect";

import { VideoSearch } from "#/entities/video/model/video-search";
import { createRouter, IdParams, respondFound } from "#/shared/api/index.server";
import { runRequest } from "#/shared/observability/index.server";

import { getVideo } from "./video.server.ts";
import { listVideos } from "./videos.server.ts";

export const videoRoutes = createRouter("/videos")
  .get("/", ({ query }) => runRequest(listVideos(query)), {
    query: Schema.toStandardSchemaV1(VideoSearch),
  })
  .get("/:id", ({ params }) => respondFound(getVideo(params.id)), { params: IdParams });
