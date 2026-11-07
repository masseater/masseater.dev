import { Schema } from "effect";

import { VideoSearch } from "#/entities/catalog/model/video-search";
import { createRouter } from "#/shared/api/index.server";
import { runRequest } from "#/shared/observability/index.server";

import { IdParams, respondFound } from "./respond.server";
import { getVideo } from "./video.server";
import { listVideos } from "./videos.server";

const videoRoutes = createRouter("/videos")
  .get("/", ({ query }) => runRequest(listVideos(query)), {
    query: Schema.toStandardSchemaV1(VideoSearch),
  })
  .get("/:id", ({ params }) => respondFound(getVideo(params.id)), { params: IdParams });

export { videoRoutes };
