import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { VideoSearch } from "#/entities/video/index.ts";
import { VideosPage, loadVideosPage } from "#/pages/videos/index.ts";

export const Route = createFileRoute("/videos/")({
  validateSearch: Schema.toStandardSchemaV1(VideoSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadVideosPage({ queryClient: context.queryClient, filter: deps }),
  component: VideosPage,
});
